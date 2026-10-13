<?php

namespace App\Http\Controllers;

use App\Models\AgencyProject;
use App\Models\AuditLog;
use App\Models\Form;
use App\Models\FormField;
use App\Models\FormSubmission;
use App\Models\KanbanBoard;
use App\Services\FormProcessorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FormController extends Controller
{
    public function __construct(
        protected FormProcessorService $formProcessor
    ) {}

    /**
     * Forms List
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        if ($user->role === 'external_user') {
            abort(403);
        }

        $forms = Form::with(['board:id,title', 'project:id,name,code', 'owner:id,name'])
            ->withCount('submissions')
            ->where('is_archived', false)
            ->orderByDesc('updated_at')
            ->get();

        $boards = KanbanBoard::select('id', 'title')->get();
        $projects = AgencyProject::select('id', 'name', 'code')->get();

        return Inertia::render('forms/index', [
            'forms' => $forms,
            'boards' => $boards,
            'projects' => $projects,
        ]);
    }

    /**
     * Form Builder / Editor
     */
    public function edit(Request $request, Form $form): Response
    {
        $user = $request->user();
        if ($user->role === 'external_user') {
            abort(403);
        }

        $form->load(['fields', 'board.boardColumns', 'project']);
        $boards = KanbanBoard::with('boardColumns')->get(['id', 'title']);
        $projects = AgencyProject::get(['id', 'name', 'code']);

        return Inertia::render('forms/builder', [
            'form' => $form,
            'boards' => $boards,
            'projects' => $projects,
        ]);
    }

    /**
     * Create Form
     */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();
        if ($user->role === 'external_user') {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'required|string|in:design,web_dev,revision,onboarding,general',
            'board_id' => 'nullable|exists:kanban_boards,id',
            'project_id' => 'nullable|exists:agency_projects,id',
            'visibility' => 'required|string|in:internal,project_members,client_portal,public',
        ]);

        $form = Form::create([
            ...$validated,
            'owner_id' => $user->id,
            'is_published' => true,
        ]);

        // Seed default starter fields according to category
        $this->seedStarterFields($form, $validated['category']);

        return redirect()->route('forms.edit', $form->id)
            ->with('success', 'Form created successfully.');
    }

    /**
     * Update Form Settings & Metadata
     */
    public function update(Request $request, Form $form): RedirectResponse
    {
        $user = $request->user();
        if ($user->role === 'external_user' || ($form->owner_id !== $user->id && $user->role !== 'super_admin')) {
            abort(403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string',
            'board_id' => 'nullable|exists:kanban_boards,id',
            'project_id' => 'nullable|exists:agency_projects,id',
            'visibility' => 'required|string|in:internal,project_members,client_portal,public',
            'is_published' => 'boolean',
            'success_message' => 'nullable|string',
            'settings' => 'nullable|array',
        ]);

        $form->update($validated);

        return back()->with('success', 'Form updated.');
    }

    /**
     * Sync / Save all Form Fields in batch from the drag-and-drop canvas
     */
    public function syncFields(Request $request, Form $form): JsonResponse
    {
        $user = $request->user();
        if ($user->role === 'external_user' || ($form->owner_id !== $user->id && $user->role !== 'super_admin')) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $fieldsData = $request->validate([
            'fields' => 'required|array',
            'fields.*.field_key' => 'required|string',
            'fields.*.label' => 'required|string',
            'fields.*.type' => 'required|string',
            'fields.*.help_text' => 'nullable|string',
            'fields.*.placeholder' => 'nullable|string',
            'fields.*.default_value' => 'nullable|string',
            'fields.*.is_required' => 'boolean',
            'fields.*.options' => 'nullable|array',
            'fields.*.conditional_logic' => 'nullable|array',
            'fields.*.maps_to_column' => 'nullable|string',
            'fields.*.position' => 'required|integer',
        ])['fields'];

        // Remove old fields not in payload and update/create incoming
        $keptKeys = array_column($fieldsData, 'field_key');
        $form->fields()->whereNotIn('field_key', $keptKeys)->delete();

        foreach ($fieldsData as $fd) {
            $form->fields()->updateOrCreate(
                ['form_id' => $form->id, 'field_key' => $fd['field_key']],
                $fd
            );
        }

        return response()->json(['success' => true, 'fields' => $form->fields()->get()]);
    }

    /**
     * Delete / Archive form
     */
    public function destroy(Request $request, Form $form): RedirectResponse
    {
        $user = $request->user();
        if ($user->role === 'external_user' || ($form->owner_id !== $user->id && $user->role !== 'super_admin')) {
            abort(403);
        }

        $form->delete();

        return redirect()->route('forms.index')->with('success', 'Form deleted.');
    }

    /**
     * Submissions history for this form
     */
    public function submissions(Request $request, Form $form): Response
    {
        $user = $request->user();
        if ($user->role === 'external_user') {
            abort(403);
        }

        $form->load(['board', 'project']);
        $submissions = $form->submissions()
            ->with(['values', 'task', 'client'])
            ->paginate(25);

        return Inertia::render('forms/submissions', [
            'form' => $form,
            'submissions' => $submissions,
        ]);
    }

    /**
     * Public or authenticated form submission interface
     */
    public function showPublic(Request $request, string $uuid): Response
    {
        $form = Form::where('uuid', $uuid)->where('is_published', true)->firstOrFail();
        $form->load('fields');

        return Inertia::render('forms/public', [
            'form' => $form,
            'isAuthenticated' => auth()->check(),
            'currentUser' => auth()->user(),
        ]);
    }

    /**
     * Submit Form Endpoint (Processes submission, creates task, triggers automations)
     */
    public function submit(Request $request, string $uuid)
    {
        $form = Form::where('uuid', $uuid)->where('is_published', true)->firstOrFail();

        // Check visibility permissions
        if ($form->visibility === 'internal' && !auth()->check()) {
            abort(403, 'This form requires login to submit.');
        }

        $data = $request->all();
        $files = $request->allFiles();

        // Validate conditional logic server-side
        $errors = $this->formProcessor->validateConditionalLogic($form, $data);
        if (!empty($errors)) {
            return back()->withErrors($errors);
        }

        $submission = $this->formProcessor->processSubmission(
            form: $form,
            answers: $data,
            files: $files,
            user: auth()->user(),
            ip: $request->ip()
        );

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $form->success_message ?: 'Thank you! Your request has been received.',
                'submission_id' => $submission->id,
            ]);
        }

        return back()->with('success', $form->success_message ?: 'Thank you! Your request has been submitted.');
    }

    protected function seedStarterFields(Form $form, string $category): void
    {
        if ($category === 'design') {
            $form->fields()->createMany([
                ['field_key' => 'title', 'label' => 'Design Project Title', 'type' => 'short_text', 'is_required' => true, 'maps_to_column' => 'title', 'position' => 0],
                ['field_key' => 'design_type', 'label' => 'Design Type', 'type' => 'dropdown', 'is_required' => true, 'options' => ['Logo & Branding', 'Social Media Graphics', 'UI/UX Mockups', 'Print / Packaging', 'Banner Ads'], 'position' => 1],
                ['field_key' => 'dimensions', 'label' => 'Requested Dimensions', 'type' => 'short_text', 'placeholder' => 'e.g. 1920x1080 or A4', 'position' => 2],
                ['field_key' => 'description', 'label' => 'Creative Brief & Description', 'type' => 'long_text', 'is_required' => true, 'maps_to_column' => 'description', 'position' => 3],
                ['field_key' => 'priority', 'label' => 'Priority Level', 'type' => 'radio', 'options' => ['Low', 'Medium', 'High', 'Urgent'], 'default_value' => 'Medium', 'maps_to_column' => 'priority', 'position' => 4],
                ['field_key' => 'deadline', 'label' => 'Requested Deadline', 'type' => 'date', 'maps_to_column' => 'due_date', 'position' => 5],
                ['field_key' => 'brand_assets', 'label' => 'Reference Assets & Brand Files', 'type' => 'file_upload', 'position' => 6],
            ]);
        } elseif ($category === 'web_dev') {
            $form->fields()->createMany([
                ['field_key' => 'title', 'label' => 'Development Request Title', 'type' => 'short_text', 'is_required' => true, 'maps_to_column' => 'title', 'position' => 0],
                ['field_key' => 'website_url', 'label' => 'Website URL', 'type' => 'url', 'placeholder' => 'https://example.com', 'is_required' => true, 'position' => 1],
                ['field_key' => 'platform', 'label' => 'Platform / Stack', 'type' => 'dropdown', 'options' => ['Laravel', 'WordPress', 'Shopify', 'React / Next.js', 'Custom PHP'], 'position' => 2],
                ['field_key' => 'feature_description', 'label' => 'Technical Requirements', 'type' => 'long_text', 'is_required' => true, 'maps_to_column' => 'description', 'position' => 3],
                ['field_key' => 'priority', 'label' => 'Urgency', 'type' => 'radio', 'options' => ['Low', 'Medium', 'High', 'Urgent'], 'default_value' => 'Medium', 'maps_to_column' => 'priority', 'position' => 4],
                ['field_key' => 'deadline', 'label' => 'Target Completion Date', 'type' => 'date', 'maps_to_column' => 'due_date', 'position' => 5],
            ]);
        } elseif ($category === 'revision') {
            $form->fields()->createMany([
                ['field_key' => 'title', 'label' => 'Revision Summary', 'type' => 'short_text', 'is_required' => true, 'maps_to_column' => 'title', 'position' => 0],
                ['field_key' => 'revision_details', 'label' => 'Specific Changes Needed', 'type' => 'long_text', 'is_required' => true, 'maps_to_column' => 'description', 'position' => 1],
                ['field_key' => 'markup_file', 'label' => 'Annotated Screenshot / Reference', 'type' => 'file_upload', 'position' => 2],
                ['field_key' => 'priority', 'label' => 'Priority', 'type' => 'radio', 'options' => ['Low', 'Medium', 'High', 'Urgent'], 'default_value' => 'High', 'maps_to_column' => 'priority', 'position' => 3],
            ]);
        } else {
            // General starter
            $form->fields()->createMany([
                ['field_key' => 'title', 'label' => 'Task Title', 'type' => 'short_text', 'is_required' => true, 'maps_to_column' => 'title', 'position' => 0],
                ['field_key' => 'description', 'label' => 'Details', 'type' => 'long_text', 'maps_to_column' => 'description', 'position' => 1],
                ['field_key' => 'priority', 'label' => 'Priority', 'type' => 'dropdown', 'options' => ['Low', 'Medium', 'High', 'Urgent'], 'maps_to_column' => 'priority', 'position' => 2],
                ['field_key' => 'deadline', 'label' => 'Due Date', 'type' => 'date', 'maps_to_column' => 'due_date', 'position' => 3],
            ]);
        }
    }
}
