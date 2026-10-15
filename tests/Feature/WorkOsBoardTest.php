<?php

namespace Tests\Feature;

use App\Models\AutomationExecution;
use App\Models\BoardAutomation;
use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\BoardView;
use App\Models\KanbanAttachment;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanComment;
use App\Models\KanbanTask;
use App\Models\TaskDependency;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WorkOsBoardTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->user = User::role('super_admin')->first();
        $this->actingAs($this->user);
    }

    public function test_user_can_create_and_manage_workspace(): void
    {
        // 1. Create Workspace
        $response = $this->post(route('workspaces.store'), [
            'name' => 'Design & Creative Operations',
            'description' => 'Workspace dedicated to design assets',
            'icon' => 'palette',
            'color' => '#D8F779',
        ]);

        $response->assertRedirect();
        $workspace = Workspace::where('name', 'Design & Creative Operations')->first();
        $this->assertNotNull($workspace);
        $this->assertEquals('#D8F779', $workspace->color);

        // 2. Toggle Favorite
        $this->post(route('workspaces.favorite', $workspace))->assertSessionHas('success');
        $this->assertTrue($workspace->fresh()->is_favorite);

        // 3. Add Member
        $memberUser = User::where('id', '!=', $this->user->id)->first();
        $this->post(route('workspaces.members.store', $workspace), [
            'user_id' => $memberUser->id,
            'role' => 'admin',
        ])->assertSessionHas('success');

        $this->assertDatabaseHas('workspace_members', [
            'workspace_id' => $workspace->id,
            'user_id' => $memberUser->id,
            'role' => 'admin',
        ]);
    }

    public function test_user_can_create_a_board_with_folder_and_default_structure(): void
    {
        $workspace = Workspace::firstOrCreate(['name' => 'Main Workspace'], ['owner_id' => $this->user->id]);

        $response = $this->post(route('kanban.boards.store'), [
            'workspace_id' => $workspace->id,
            'title' => 'Q4 Mobile App Sprint',
            'description' => 'Features and bug fixes for mobile app',
            'folder_name' => 'Product Sprints',
            'visibility' => 'public',
        ]);

        $response->assertRedirect();
        $board = KanbanBoard::where('title', 'Q4 Mobile App Sprint')->first();
        $this->assertNotNull($board);
        $this->assertEquals('Product Sprints', $board->folder_name);
        $this->assertGreaterThan(0, $board->groups()->count());
        $this->assertGreaterThan(0, $board->boardColumns()->count());

        // Toggle board favorite
        $this->post(route('kanban.boards.favorite', $board))->assertSessionHas('success');
        $this->assertTrue($board->fresh()->is_favorite);
    }

    public function test_user_can_manage_dynamic_columns_on_a_board(): void
    {
        $board = KanbanBoard::first();

        // 1. Add dynamic column with options
        $response = $this->post(route('kanban.columns.store', $board), [
            'title' => 'Sprint Phase',
            'type' => 'dropdown',
            'width' => 150,
            'config' => ['options' => ['Phase 1', 'Phase 2', 'Phase 3']],
        ]);
        $response->assertSessionHas('success');

        $col = BoardColumn::where('board_id', $board->id)->where('title', 'Sprint Phase')->first();
        $this->assertNotNull($col);
        $this->assertEquals('dropdown', $col->type);
        $this->assertCount(3, $col->config['options']);

        // 2. Update dynamic column (resize & hide)
        $this->patch(route('kanban.columns.update', $col), [
            'title' => 'Release Phase',
            'width' => 180,
            'is_visible' => false,
        ])->assertSessionHas('success');

        $col->refresh();
        $this->assertEquals('Release Phase', $col->title);
        $this->assertEquals(180, $col->width);
        $this->assertFalse($col->is_visible);

        // 3. Reorder columns
        $allCols = $board->boardColumns()->pluck('id')->toArray();
        $reversed = array_reverse($allCols);

        $this->post(route('kanban.columns.reorder', $board), [
            'column_ids' => $reversed,
        ])->assertSessionHas('success');

        $firstColAfterReorder = BoardColumn::find($reversed[0]);
        $this->assertEquals(0, $firstColAfterReorder->position);
    }

    public function test_user_can_manage_groups_and_items_with_custom_values_and_subitems(): void
    {
        $board = KanbanBoard::first();
        $group = BoardGroup::where('board_id', $board->id)->first();
        $column = KanbanColumn::where('board_id', $board->id)->first();

        // 1. Create task with progress, rating, checkbox, and custom values
        $response = $this->post(route('kanban.tasks.store'), [
            'board_id' => $board->id,
            'group_id' => $group->id,
            'column_id' => $column->id,
            'title' => 'Implement OAuth 2.0 PKCE flow',
            'priority' => 'Urgent',
            'progress' => 45,
            'due_time' => '17:30',
            'custom_values' => [
                'estimated_hours' => 20,
                'budget' => 5000,
                'is_approved' => true,
                'rating' => 4,
            ],
        ]);
        $response->assertSessionHas('success');

        $task = KanbanTask::where('title', 'Implement OAuth 2.0 PKCE flow')->first();
        $this->assertNotNull($task);
        $this->assertEquals(45, $task->progress);
        $this->assertEquals('17:30', $task->due_time);
        $this->assertEquals(5000, $task->custom_values['budget']);
        $this->assertTrue($task->custom_values['is_approved']);
        $this->assertEquals(4, $task->custom_values['rating']);

        // 2. Create subitem
        $subResponse = $this->post(route('kanban.tasks.subitems.store', $task), [
            'title' => 'Generate PKCE code verifier and challenge',
        ]);
        $subResponse->assertSessionHas('success');

        $this->assertEquals(1, $task->subitems()->count());
        $this->assertEquals('Generate PKCE code verifier and challenge', $task->subitems->first()->title);

        // 3. Update task
        $this->patch(route('kanban.tasks.update', $task), [
            'progress' => 80,
            'custom_values' => ['budget' => 6500, 'rating' => 5],
        ])->assertSessionHas('success');

        $this->assertEquals(80, $task->fresh()->progress);
        $this->assertEquals(6500, $task->fresh()->custom_values['budget']);
        $this->assertEquals(5, $task->fresh()->custom_values['rating']);

        // 4. Move column (Kanban drag and drop simulation)
        $nextColumn = KanbanColumn::where('board_id', $board->id)->where('id', '!=', $column->id)->first();
        $this->patch(route('kanban.tasks.update-column', $task), [
            'column_id' => $nextColumn->id,
        ])->assertSessionHas('success');

        $this->assertEquals($nextColumn->id, $task->fresh()->column_id);
    }

    public function test_user_can_manage_workflow_stages_and_reorder_cards(): void
    {
        $board = KanbanBoard::first();

        // 1. Add workflow stage
        $this->post(route('kanban.stages.store', $board), [
            'title' => 'Design QA',
            'color' => '#ec4899',
        ])->assertSessionHas('success');

        $stage = KanbanColumn::where('board_id', $board->id)->where('title', 'Design QA')->first();
        $this->assertNotNull($stage);
        $this->assertEquals('#ec4899', $stage->color);

        // 2. Update stage
        $this->patch(route('kanban.stages.update', $stage), [
            'title' => 'UX Review',
        ])->assertSessionHas('success');
        $this->assertEquals('UX Review', $stage->fresh()->title);

        // 3. Reorder cards within column
        $tasks = KanbanTask::where('board_id', $board->id)->whereNull('parent_id')->take(2)->get();
        if ($tasks->count() >= 2) {
            $taskIdsReordered = [$tasks[1]->id, $tasks[0]->id];
            $this->post(route('kanban.tasks.reorder'), [
                'task_ids' => $taskIdsReordered,
                'column_id' => $tasks[0]->column_id,
            ])->assertSessionHas('success');

            $this->assertEquals(0, KanbanTask::find($tasks[1]->id)->position);
            $this->assertEquals(1, KanbanTask::find($tasks[0]->id)->position);
        }
    }

    public function test_subtasks_automatically_recalculate_parent_progress(): void
    {
        $board = KanbanBoard::first();
        $group = BoardGroup::where('board_id', $board->id)->first();
        $colNotDone = KanbanColumn::where('board_id', $board->id)->whereRaw('LOWER(title) NOT LIKE ?', ['%done%'])->whereRaw('LOWER(title) NOT LIKE ?', ['%completed%'])->first();
        $colDone = KanbanColumn::where('board_id', $board->id)
            ->where(function ($q) {
                $q->whereRaw('LOWER(title) LIKE ?', ['%done%'])
                    ->orWhereRaw('LOWER(title) LIKE ?', ['%completed%']);
            })->first() ?? KanbanColumn::create(['board_id' => $board->id, 'title' => 'Completed', 'position' => 3]);

        // Create Parent Task
        $parent = KanbanTask::create([
            'board_id' => $board->id,
            'group_id' => $group->id,
            'column_id' => $colNotDone->id,
            'title' => 'Parent Feature Implementation',
            'created_by' => $this->user->id,
            'progress' => 0,
        ]);

        // Add 2 Subtasks
        $sub1 = KanbanTask::create([
            'board_id' => $board->id,
            'parent_id' => $parent->id,
            'column_id' => $colNotDone->id,
            'title' => 'Subtask 1',
            'created_by' => $this->user->id,
            'progress' => 0,
        ]);

        $sub2 = KanbanTask::create([
            'board_id' => $board->id,
            'parent_id' => $parent->id,
            'column_id' => $colNotDone->id,
            'title' => 'Subtask 2',
            'created_by' => $this->user->id,
            'progress' => 0,
        ]);

        $parent->recalculateProgressFromSubtasks();
        $this->assertEquals(0, $parent->fresh()->progress);

        // Complete Subtask 1 via column update
        $this->patch(route('kanban.tasks.update-column', $sub1), [
            'column_id' => $colDone->id,
        ])->assertSessionHas('success');

        // Progress should be 50%
        $this->assertEquals(50, $parent->fresh()->progress);

        // Complete Subtask 2
        $this->patch(route('kanban.tasks.update-column', $sub2), [
            'column_id' => $colDone->id,
        ])->assertSessionHas('success');

        // Progress should be 100% and completed_at set
        $this->assertEquals(100, $parent->fresh()->progress);
        $this->assertNotNull($parent->fresh()->completed_at);
    }

    public function test_threaded_comments_and_reactions(): void
    {
        $task = KanbanTask::first();

        // 1. Post parent comment
        $this->post(route('kanban.tasks.comments.store', $task), [
            'message' => 'Initial deployment checklist completed.',
        ])->assertSessionHas('success');

        $comment = KanbanComment::where('task_id', $task->id)->whereNull('parent_id')->first();
        $this->assertNotNull($comment);

        // 2. Post threaded reply
        $this->post(route('kanban.tasks.comments.store', $task), [
            'parent_id' => $comment->id,
            'message' => 'Acknowledged. Running smoke tests now.',
        ])->assertSessionHas('success');

        $this->assertEquals(1, $comment->replies()->count());
        $this->assertEquals('Acknowledged. Running smoke tests now.', $comment->replies->first()->message);

        // 3. Toggle reaction
        $this->post(route('kanban.comments.reactions', $comment), [
            'emoji' => '👍',
        ])->assertSessionHas('success');

        $this->assertContains($this->user->id, $comment->fresh()->reactions['👍']);
    }

    public function test_task_attachments_upload_and_delete(): void
    {
        Storage::fake('public');
        $task = KanbanTask::first();

        $file = UploadedFile::fake()->create('technical-architecture.pdf', 500, 'application/pdf');

        // 1. Upload attachment
        $response = $this->post(route('kanban.tasks.attachments.store', $task), [
            'file' => $file,
        ]);
        $response->assertSessionHas('success');

        $attachment = KanbanAttachment::where('task_id', $task->id)->first();
        $this->assertNotNull($attachment);
        $this->assertEquals('technical-architecture.pdf', $attachment->file_name);
        Storage::disk('public')->assertExists($attachment->file_path);

        // 2. Delete attachment
        $this->delete(route('kanban.attachments.delete', $attachment))->assertSessionHas('success');
        $this->assertDatabaseMissing('kanban_attachments', ['id' => $attachment->id]);
        Storage::disk('public')->assertMissing($attachment->file_path);
    }

    public function test_deep_linking_item_retrieval(): void
    {
        $task = KanbanTask::first();

        $response = $this->get(route('kanban.index', ['item' => $task->id]));
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('kanban/index')
            ->has('selectedTask')
            ->where('selectedTask.id', $task->id)
        );
    }

    public function test_user_can_create_update_and_reorder_board_views(): void
    {
        $board = KanbanBoard::first();

        // 1. Create a Gantt view
        $response = $this->post(route('kanban.views.store', $board), [
            'name' => 'Master Gantt Roadmap',
            'type' => 'gantt',
        ]);
        $response->assertSessionHas('success');

        $view = BoardView::where('name', 'Master Gantt Roadmap')->first();
        $this->assertNotNull($view);
        $this->assertEquals('gantt', $view->type);

        // 2. Set view as default
        $this->patch(route('kanban.views.update', $view), [
            'is_default' => true,
        ])->assertSessionHas('success');

        $this->assertTrue($view->fresh()->is_default);

        // 3. Reorder views
        $viewsList = BoardView::where('board_id', $board->id)->pluck('id')->toArray();
        $reversed = array_reverse($viewsList);

        $this->post(route('kanban.views.reorder', $board), [
            'view_ids' => $reversed,
        ])->assertSessionHas('success');

        $firstAfterReorder = BoardView::find($reversed[0]);
        $this->assertEquals(0, $firstAfterReorder->position);

        // 4. Delete view
        $this->delete(route('kanban.views.delete', $view))->assertSessionHas('success');
        $this->assertDatabaseMissing('board_views', ['id' => $view->id]);
    }

    public function test_task_schedule_update_and_reschedule(): void
    {
        $task = KanbanTask::first();

        $this->patch(route('kanban.tasks.schedule.update', $task), [
            'start_date' => '2026-11-01',
            'due_date' => '2026-11-15',
        ])->assertSessionHas('success');

        $this->assertEquals('2026-11-01', $task->fresh()->start_date);
        $this->assertEquals('2026-11-15', $task->fresh()->due_date);
    }

    public function test_task_dependencies_creation_and_circular_dependency_prevention(): void
    {
        $board = KanbanBoard::first();
        $tasks = KanbanTask::where('board_id', $board->id)->take(3)->get();

        $t1 = $tasks[0];
        $t2 = $tasks[1];
        $t3 = $tasks[2];

        // 1. Link T1 -> depends on T2
        $res1 = $this->post(route('kanban.tasks.dependencies.store', $t1), [
            'depends_on_task_id' => $t2->id,
            'dependency_type' => 'finish_to_start',
        ]);
        $res1->assertSessionHas('success');

        $this->assertEquals(1, $t1->dependencies()->count());
        $this->assertEquals($t2->id, $t1->dependencies->first()->depends_on_task_id);

        // 2. Link T2 -> depends on T3
        $res2 = $this->post(route('kanban.tasks.dependencies.store', $t2), [
            'depends_on_task_id' => $t3->id,
            'dependency_type' => 'finish_to_start',
        ]);
        $res2->assertSessionHas('success');

        // 3. Attempting to link T3 -> depends on T1 MUST fail with circular dependency error
        // Because chain would be T1 -> T2 -> T3 -> T1 (infinite loop)
        $resCycle = $this->post(route('kanban.tasks.dependencies.store', $t3), [
            'depends_on_task_id' => $t1->id,
            'dependency_type' => 'finish_to_start',
        ]);
        $resCycle->assertSessionHas('error');

        // Verify cycle was blocked in database
        $this->assertDatabaseMissing('task_dependencies', [
            'task_id' => $t3->id,
            'depends_on_task_id' => $t1->id,
        ]);

        // 4. Delete dependency
        $dep = TaskDependency::where('task_id', $t1->id)->first();
        $this->delete(route('kanban.dependencies.delete', $dep))->assertSessionHas('success');
        $this->assertDatabaseMissing('task_dependencies', ['id' => $dep->id]);
    }

    public function test_user_can_create_update_toggle_and_duplicate_automations(): void
    {
        $board = KanbanBoard::first();

        // 1. Create automation
        $response = $this->post(route('kanban.automations.store', $board), [
            'name' => 'Auto-escalate Urgent Tasks',
            'description' => 'When priority becomes Urgent, notify manager',
            'trigger_type' => 'priority_changed',
            'conditions' => [
                'match_type' => 'and',
                'rules' => [
                    ['field' => 'priority', 'operator' => 'equals', 'value' => 'Urgent'],
                ],
            ],
            'actions' => [
                ['type' => 'create_audit_event', 'description' => 'Urgent item escalated'],
            ],
        ]);
        $response->assertSessionHas('success');

        $automation = BoardAutomation::where('name', 'Auto-escalate Urgent Tasks')->first();
        $this->assertNotNull($automation);
        $this->assertTrue($automation->is_active);

        // 2. Toggle automation
        $this->post(route('kanban.automations.toggle', $automation))->assertSessionHas('success');
        $this->assertFalse($automation->fresh()->is_active);

        $this->post(route('kanban.automations.toggle', $automation))->assertSessionHas('success');
        $this->assertTrue($automation->fresh()->is_active);

        // 3. Duplicate automation
        $this->post(route('kanban.automations.duplicate', $automation))->assertSessionHas('success');
        $this->assertDatabaseHas('board_automations', [
            'name' => 'Auto-escalate Urgent Tasks (Copy)',
        ]);

        // 4. Update automation
        $this->patch(route('kanban.automations.update', $automation), [
            'description' => 'Updated escalation policy',
        ])->assertSessionHas('success');
        $this->assertEquals('Updated escalation policy', $automation->fresh()->description);

        // 5. Delete automation
        $this->delete(route('kanban.automations.delete', $automation))->assertSessionHas('success');
        $this->assertDatabaseMissing('board_automations', ['id' => $automation->id]);
    }

    public function test_automation_executes_on_status_change_and_records_history(): void
    {
        $board = KanbanBoard::first();
        $doneCol = KanbanColumn::where('board_id', $board->id)->whereRaw('LOWER(title) LIKE ?', ['%done%'])->first();
        if (!$doneCol) {
            $doneCol = KanbanColumn::create(['board_id' => $board->id, 'title' => 'Done', 'color' => '#00c875', 'position' => 10]);
        }

        $task = KanbanTask::where('board_id', $board->id)->first();

        // Create automation rule: When status moves to Done -> create audit log & notification
        $automation = BoardAutomation::create([
            'board_id' => $board->id,
            'name' => 'Done Audit & Alert',
            'trigger_type' => 'status_changed',
            'trigger_config' => ['to_status' => 'Done'],
            'conditions' => [
                'match_type' => 'and',
                'rules' => [
                    ['field' => 'status', 'operator' => 'equals', 'value' => 'Done'],
                ],
            ],
            'actions' => [
                ['type' => 'create_audit_event', 'description' => 'Item verified complete.'],
                ['type' => 'notify_creator', 'title' => 'Complete', 'message' => 'Task is finished.'],
            ],
            'is_active' => true,
            'created_by' => $this->user->id,
        ]);

        // Move task to Done
        $this->patch(route('kanban.tasks.update-column', $task), [
            'column_id' => $doneCol->id,
        ])->assertSessionHas('success');

        // Check automation executed
        $this->assertEquals(1, $automation->fresh()->execution_count);
        $this->assertNotNull($automation->fresh()->last_executed_at);

        // Check history log created
        $execution = AutomationExecution::where('automation_id', $automation->id)->first();
        $this->assertNotNull($execution);
        $this->assertEquals('success', $execution->status);
        $this->assertEquals($task->id, $execution->task_id);
    }

    public function test_dry_run_test_automation_endpoint(): void
    {
        $board = KanbanBoard::first();
        $task = KanbanTask::where('board_id', $board->id)->first();

        $automation = BoardAutomation::create([
            'board_id' => $board->id,
            'name' => 'Dry Run Test Rule',
            'trigger_type' => 'item_updated',
            'conditions' => ['match_type' => 'and', 'rules' => []],
            'actions' => [
                ['type' => 'create_audit_event', 'description' => 'Test dry run succeeded'],
            ],
            'is_active' => true,
            'created_by' => $this->user->id,
        ]);

        $response = $this->post(route('kanban.automations.test', $automation));
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('automation_executions', [
            'automation_id' => $automation->id,
            'status' => 'success',
        ]);
    }
}
