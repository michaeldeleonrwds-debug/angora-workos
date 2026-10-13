<?php

namespace App\Services;

use App\Models\AgencyProject;
use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\BoardView;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\ProjectDeliverable;
use App\Models\ProjectMember;
use App\Models\User;
use App\Models\Workdoc;
use App\Models\WorkOsTemplate;
use Illuminate\Support\Facades\DB;

class TemplateEngineService
{
    /**
     * Instantiate a new KanbanBoard from a board template blueprint
     */
    public function createBoardFromTemplate(WorkOsTemplate $template, int $workspaceId, string $title, User $user): KanbanBoard
    {
        return DB::transaction(function () use ($template, $workspaceId, $title, $user) {
            $schema = $template->content_schema;

            $board = KanbanBoard::create([
                'workspace_id' => $workspaceId,
                'title' => $title,
                'description' => $schema['description'] ?? "Created from template: {$template->title}",
                'department' => $schema['department'] ?? 'General',
                'created_by' => $user->id,
            ]);

            // Workflow Stages (KanbanColumn)
            $colMap = [];
            $stages = $schema['stages'] ?? [
                ['title' => 'To Do', 'color' => '#64748b'],
                ['title' => 'In Progress', 'color' => '#0085ff'],
                ['title' => 'Review', 'color' => '#a25ddc'],
                ['title' => 'Done', 'color' => '#00c875'],
            ];

            foreach ($stages as $idx => $st) {
                $col = KanbanColumn::create([
                    'board_id' => $board->id,
                    'title' => $st['title'],
                    'color' => $st['color'] ?? '#64748b',
                    'position' => $idx,
                ]);
                $colMap[$st['title']] = $col->id;
            }

            // Board Groups
            $groupMap = [];
            $groups = $schema['groups'] ?? [
                ['title' => 'Phase 1 - Immediate Deliverables', 'color' => '#579BFC'],
                ['title' => 'Phase 2 - Execution & Production', 'color' => '#A25DDC'],
            ];

            foreach ($groups as $idx => $grp) {
                $bg = BoardGroup::create([
                    'board_id' => $board->id,
                    'title' => $grp['title'],
                    'color' => $grp['color'] ?? '#579BFC',
                    'position' => $idx,
                ]);
                $groupMap[$grp['title']] = $bg->id;
            }

            // Dynamic Board Columns
            $columns = $schema['columns'] ?? [
                ['key' => 'col_person', 'title' => 'Owner', 'type' => 'people', 'width' => 140],
                ['key' => 'col_status', 'title' => 'Status', 'type' => 'status', 'width' => 150],
                ['key' => 'col_priority', 'title' => 'Priority', 'type' => 'priority', 'width' => 130],
                ['key' => 'col_date', 'title' => 'Due Date', 'type' => 'date', 'width' => 130],
                ['key' => 'col_progress', 'title' => 'Progress', 'type' => 'progress', 'width' => 150],
            ];

            foreach ($columns as $idx => $c) {
                BoardColumn::create([
                    'board_id' => $board->id,
                    'key' => $c['key'],
                    'title' => $c['title'],
                    'type' => $c['type'],
                    'position' => $idx,
                    'width' => $c['width'] ?? 150,
                    'is_visible' => true,
                ]);
            }

            // Board Views
            BoardView::create(['board_id' => $board->id, 'name' => 'Main Table', 'type' => 'table', 'is_default' => true, 'position' => 0]);
            BoardView::create(['board_id' => $board->id, 'name' => 'Kanban', 'type' => 'kanban', 'is_default' => false, 'position' => 1]);
            BoardView::create(['board_id' => $board->id, 'name' => 'Timeline', 'type' => 'timeline', 'is_default' => false, 'position' => 2]);

            // Sample Tasks
            $sampleTasks = $schema['tasks'] ?? [];
            $defaultColId = reset($colMap);
            $defaultGrpId = reset($groupMap);

            foreach ($sampleTasks as $idx => $t) {
                $targetColId = isset($t['stage']) && isset($colMap[$t['stage']]) ? $colMap[$t['stage']] : $defaultColId;
                $targetGrpId = isset($t['group']) && isset($groupMap[$t['group']]) ? $groupMap[$t['group']] : $defaultGrpId;

                $parentTask = KanbanTask::create([
                    'board_id' => $board->id,
                    'column_id' => $targetColId,
                    'group_id' => $targetGrpId,
                    'title' => $t['title'],
                    'description' => $t['description'] ?? null,
                    'priority' => $t['priority'] ?? 'Medium',
                    'progress' => $t['progress'] ?? 0,
                    'created_by' => $user->id,
                    'position' => $idx,
                ]);

                // Subtasks if present
                if (!empty($t['subtasks'])) {
                    foreach ($t['subtasks'] as $sidx => $sub) {
                        KanbanTask::create([
                            'board_id' => $board->id,
                            'column_id' => $targetColId,
                            'group_id' => $targetGrpId,
                            'parent_id' => $parentTask->id,
                            'title' => is_array($sub) ? $sub['title'] : (string) $sub,
                            'priority' => 'Medium',
                            'created_by' => $user->id,
                            'position' => $sidx,
                        ]);
                    }
                }
            }

            return $board;
        });
    }

    /**
     * Instantiate a full AgencyProject with linked Board and Deliverables from a template
     */
    public function createProjectFromTemplate(WorkOsTemplate $template, array $projectData, User $user): AgencyProject
    {
        return DB::transaction(function () use ($template, $projectData, $user) {
            $schema = $template->content_schema;

            // 1. Create Board first
            $boardTitle = "{$projectData['name']} Board";
            $board = $this->createBoardFromTemplate($template, $projectData['workspace_id'], $boardTitle, $user);

            // 2. Create AgencyProject
            $clientId = $projectData['client_id'] ?? null;
            $client = $clientId ? \App\Models\SalesCustomer::find($clientId) : \App\Models\SalesCustomer::first();
            if (!$client) {
                $client = \App\Models\SalesCustomer::create([
                    'name' => 'Default Client',
                    'email' => 'client@angora.work',
                    'company' => 'Internal Agency Client',
                    'company_name' => 'Internal Agency Client',
                    'portal_access_enabled' => true,
                ]);
            }

            $project = AgencyProject::create([
                'name' => $projectData['name'],
                'description' => $schema['description'] ?? "Created from template: {$template->title}",
                'client_id' => $client->id,
                'project_manager_id' => $projectData['project_manager_id'] ?? $user->id,
                'project_leader_id' => $projectData['project_leader_id'] ?? $user->id,
                'board_id' => $board->id,
                'status' => 'Planning',
                'priority' => 'Medium',
                'budget' => $projectData['budget_total'] ?? 10000.00,
                'start_date' => $projectData['start_date'] ?? now()->toDateString(),
                'due_date' => $projectData['due_date'] ?? now()->addMonths(2)->toDateString(),
                'client_visible' => true,
            ]);

            // Add PM & PL as ProjectMembers
            ProjectMember::create([
                'project_id' => $project->id,
                'user_id' => $project->project_manager_id,
                'agency_role' => 'project_manager',
            ]);

            if ($project->project_leader_id !== $project->project_manager_id) {
                ProjectMember::create([
                    'project_id' => $project->id,
                    'user_id' => $project->project_leader_id,
                    'agency_role' => 'project_leader',
                ]);
            }

            // 3. Create Deliverables
            $deliverables = $schema['deliverables'] ?? [
                ['title' => 'Phase 1 Milestone Deliverable'],
                ['title' => 'Final Production Release'],
            ];

            foreach ($deliverables as $del) {
                ProjectDeliverable::create([
                    'project_id' => $project->id,
                    'title' => $del['title'],
                    'status' => 'draft',
                    'version' => 1,
                    'submitted_by' => $user->id,
                ]);
            }

            return $project;
        });
    }

    /**
     * Create Workdoc from a Workdoc template
     */
    public function createWorkdocFromTemplate(WorkOsTemplate $template, string $title, User $user, ?int $projectId = null): Workdoc
    {
        $schema = $template->content_schema;

        $doc = Workdoc::create([
            'title' => $title,
            'content' => $schema['content'] ?? '<h1>' . htmlspecialchars($title) . '</h1><p>Document content...</p>',
            'folder_name' => $schema['folder_name'] ?? 'General',
            'owner_id' => $user->id,
            'project_id' => $projectId,
            'visibility' => 'team',
        ]);

        $doc->versions()->create([
            'user_id' => $user->id,
            'version_number' => '1.0',
            'summary' => 'Initial creation from template: ' . $template->title,
            'content' => $doc->content,
        ]);

        return $doc;
    }
}
