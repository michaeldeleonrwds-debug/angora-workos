<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\BoardGroup;
use App\Models\Form;
use App\Models\FormSubmission;
use App\Models\FormSubmissionValue;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\SystemNotification;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FormProcessorService
{
    public function __construct(
        protected AutomationEngineService $automationEngine
    ) {}

    /**
     * Process an incoming form submission with idempotency, mapping, and automation execution.
     */
    public function processSubmission(Form $form, array $answers, array $files = [], ?User $user = null, ?string $ip = null): FormSubmission
    {
        // 1. Idempotency safeguard: check submission_token
        $token = $answers['_submission_token'] ?? Str::uuid()->toString();
        $existing = FormSubmission::where('submission_token', $token)->first();
        if ($existing) {
            return $existing;
        }

        return DB::transaction(function () use ($form, $answers, $files, $user, $ip, $token) {
            $submitterName = $answers['submitter_name'] ?? $answers['contact_person'] ?? $answers['name'] ?? ($user?->name ?? 'Guest Client');
            $submitterEmail = $answers['submitter_email'] ?? $answers['contact_email'] ?? $answers['email'] ?? ($user?->email ?? null);
            $clientId = $answers['client_id'] ?? ($user?->salesCustomer?->id ?? $form->project?->client_id ?? null);

            // 2. Create Submission Record
            $submission = FormSubmission::create([
                'form_id' => $form->id,
                'submission_token' => $token,
                'user_id' => $user?->id,
                'client_id' => $clientId,
                'submitter_name' => $submitterName,
                'submitter_email' => $submitterEmail,
                'ip_address' => $ip,
                'status' => 'processed',
            ]);

            // 3. Save Form Submission Values
            $fields = $form->fields()->get()->keyBy('field_key');
            $taskTitle = $answers['title'] ?? $answers['task_title'] ?? $answers['project_name'] ?? "{$form->title} Submission";
            $taskDescription = $answers['description'] ?? $answers['design_description'] ?? $answers['revision_description'] ?? '';
            $taskPriority = $answers['priority'] ?? 'Medium';
            $taskDueDate = $answers['deadline'] ?? $answers['due_date'] ?? $answers['requested_completion_date'] ?? null;
            $customValues = [];

            foreach ($answers as $key => $val) {
                if (str_starts_with($key, '_')) continue;

                $field = $fields->get($key);
                $label = $field ? $field->label : ucfirst(str_replace('_', ' ', $key));

                FormSubmissionValue::create([
                    'submission_id' => $submission->id,
                    'field_key' => $key,
                    'field_label' => $label,
                    'value' => is_array($val) ? json_encode($val) : (string) $val,
                ]);

                // Map to task properties
                if ($field && $field->maps_to_column) {
                    $targetCol = $field->maps_to_column;
                    if ($targetCol === 'title') $taskTitle = (string) $val;
                    elseif ($targetCol === 'description') $taskDescription = (string) $val;
                    elseif ($targetCol === 'priority') $taskPriority = (string) $val;
                    elseif ($targetCol === 'due_date') $taskDueDate = (string) $val;
                    else $customValues[$targetCol] = $val;
                } else {
                    $customValues[$key] = $val;
                }
            }

            // Handle file uploads
            foreach ($files as $fieldKey => $uploadedFile) {
                if ($uploadedFile && $uploadedFile->isValid()) {
                    $path = $uploadedFile->store('form_attachments', 'public');
                    $field = $fields->get($fieldKey);
                    $label = $field ? $field->label : 'Attachment';

                    FormSubmissionValue::create([
                        'submission_id' => $submission->id,
                        'field_key' => $fieldKey,
                        'field_label' => $label,
                        'value' => $path,
                        'meta' => [
                            'original_name' => $uploadedFile->getClientOriginalName(),
                            'size' => $uploadedFile->getSize(),
                            'mime' => $uploadedFile->getMimeType(),
                            'path' => $path,
                        ],
                    ]);

                    $customValues[$fieldKey] = $path;
                }
            }

            // 4. Resolve destination board & column
            $board = $form->board;
            if (!$board && $form->project) {
                $board = $form->project->board;
            }
            if (!$board) {
                $board = KanbanBoard::first();
            }

            if ($board) {
                $column = $board->columns()->first() ?? KanbanColumn::create([
                    'board_id' => $board->id,
                    'title' => 'New Requests',
                    'color' => '#0085ff',
                    'position' => 0,
                ]);

                $group = $board->groups()->first() ?? BoardGroup::create([
                    'board_id' => $board->id,
                    'title' => 'Incoming Form Submissions',
                    'color' => '#C8AEF5',
                    'position' => 0,
                ]);

                // 5. Create actual KanbanTask record
                $task = KanbanTask::create([
                    'board_id' => $board->id,
                    'column_id' => $column->id,
                    'group_id' => $group->id,
                    'title' => $taskTitle,
                    'description' => $taskDescription,
                    'priority' => ucfirst($taskPriority),
                    'due_date' => $taskDueDate,
                    'custom_values' => $customValues,
                    'created_by' => $user?->id ?? $form->owner_id,
                ]);

                $submission->update(['created_task_id' => $task->id]);

                // 6. Notify Project Manager / Board Owner
                $notifyUser = $form->project?->projectManager ?? $form->owner;
                if ($notifyUser) {
                    SystemNotification::create([
                        'user_id' => $notifyUser->id,
                        'title' => 'New Form Submission Received',
                        'message' => "{$submitterName} submitted '{$form->title}' creating task #{$task->id}: {$task->title}",
                        'type' => 'form_submission',
                        'link' => "/kanban?board={$board->id}&item={$task->id}",
                        'is_read' => false,
                    ]);
                }

                // 7. Audit log
                AuditLog::log(
                    action: 'FORM_SUBMITTED',
                    department: 'Operations',
                    entityType: 'Form',
                    entityId: $form->id,
                    description: "Form '{$form->title}' submitted by {$submitterName}, created task #{$task->id}"
                );

                // 8. Trigger existing automation engine on item_created
                $this->automationEngine->dispatch('item_created', $task, ['form_id' => $form->id], $user);
            }

            return $submission;
        });
    }

    /**
     * Validate submission values against conditional logic rules
     */
    public function validateConditionalLogic(Form $form, array $answers): array
    {
        $errors = [];
        $fields = $form->fields()->get();

        foreach ($fields as $field) {
            $logic = $field->conditional_logic;
            $isVisible = true;

            if (!empty($logic) && isset($logic['field_key'], $logic['operator'], $logic['value'])) {
                $dependentVal = $answers[$logic['field_key']] ?? null;
                $targetVal = $logic['value'];

                $isVisible = match ($logic['operator']) {
                    'equals' => $dependentVal === $targetVal,
                    'not_equals' => $dependentVal !== $targetVal,
                    'contains' => str_contains((string) $dependentVal, (string) $targetVal),
                    default => true,
                };
            }

            // Only enforce required rule if field is visible according to conditional logic
            if ($isVisible && $field->is_required) {
                $val = $answers[$field->field_key] ?? null;
                if ($val === null || $val === '' || (is_array($val) && empty($val))) {
                    $errors[$field->field_key] = "{$field->label} is required.";
                }
            }
        }

        return $errors;
    }
}
