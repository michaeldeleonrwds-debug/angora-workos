<?php

namespace Database\Seeders;

use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\BoardView;
use App\Models\KanbanBoard;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Database\Seeder;

class WorkOsExpansionSeeder extends Seeder
{
    public function run(): void
    {
        $superAdmin = User::role('super_admin')->first() ?? User::first();
        if (!$superAdmin) {
            return;
        }

        // 1. Ensure Main Workspace
        $workspace = Workspace::firstOrCreate(
            ['name' => 'Main Workspace'],
            [
                'description' => 'Cross-functional enterprise workspace spanning all departments.',
                'icon' => 'layout-grid',
                'color' => '#C8AEF5',
                'owner_id' => $superAdmin->id,
                'is_favorite' => true,
            ]
        );

        // 2. Ensure all users are workspace members
        $allUsers = User::all();
        foreach ($allUsers as $user) {
            WorkspaceMember::firstOrCreate(
                [
                    'workspace_id' => $workspace->id,
                    'user_id' => $user->id,
                ],
                [
                    'role' => $user->primaryRoleName() === 'super_admin' ? 'owner' : ($user->primaryRoleName() === 'admin_manager' ? 'admin' : 'member'),
                ]
            );
        }

        // 3. For each existing KanbanBoard, link to workspace and create groups, columns, views
        $boards = KanbanBoard::all();
        foreach ($boards as $board) {
            if (!$board->workspace_id) {
                $board->update(['workspace_id' => $workspace->id]);
            }

            // A. Create standard Board Groups if none exist
            if ($board->groups()->count() === 0) {
                $g1 = BoardGroup::create([
                    'board_id' => $board->id,
                    'title' => 'Active Deliverables',
                    'color' => '#579BFC',
                    'position' => 0,
                ]);

                $g2 = BoardGroup::create([
                    'board_id' => $board->id,
                    'title' => 'Future Sprints & Backlog',
                    'color' => '#A25DDC',
                    'position' => 1,
                ]);

                // Link existing tasks without a group
                $tasks = KanbanTask::where('board_id', $board->id)->whereNull('group_id')->get();
                foreach ($tasks as $idx => $t) {
                    $targetGroup = ($idx % 2 === 0) ? $g1 : $g2;
                    $t->update([
                        'group_id' => $targetGroup->id,
                        'start_date' => $t->start_date ?? now()->subDays(rand(1, 4))->toDateString(),
                        'progress' => $t->completed_at ? 100 : ($t->priority === 'Urgent' ? 65 : 30),
                        'estimated_hours' => 16.0,
                        'actual_hours' => $t->completed_at ? 16.0 : 6.0,
                    ]);
                }
            }

            // B. Create standard Board Columns if none exist
            if ($board->boardColumns()->count() === 0) {
                $defaultCols = [
                    ['key' => 'col_person', 'title' => 'Owner', 'type' => 'people', 'position' => 0, 'width' => 140],
                    ['key' => 'col_status', 'title' => 'Status', 'type' => 'status', 'position' => 1, 'width' => 150],
                    ['key' => 'col_priority', 'title' => 'Priority', 'type' => 'priority', 'position' => 2, 'width' => 130],
                    ['key' => 'col_date', 'title' => 'Due Date', 'type' => 'date', 'position' => 3, 'width' => 130],
                    ['key' => 'col_timeline', 'title' => 'Timeline', 'type' => 'timeline', 'position' => 4, 'width' => 170],
                    ['key' => 'col_progress', 'title' => 'Progress', 'type' => 'progress', 'position' => 5, 'width' => 150],
                ];

                foreach ($defaultCols as $col) {
                    BoardColumn::create([
                        'board_id' => $board->id,
                        'key' => $col['key'],
                        'title' => $col['title'],
                        'type' => $col['type'],
                        'position' => $col['position'],
                        'width' => $col['width'],
                        'is_visible' => true,
                    ]);
                }
            }

            // C. Create standard Views if none exist
            if ($board->views()->count() === 0) {
                BoardView::create([
                    'board_id' => $board->id,
                    'name' => 'Main Table',
                    'type' => 'table',
                    'is_default' => true,
                    'is_system' => true,
                    'position' => 0,
                ]);

                BoardView::create([
                    'board_id' => $board->id,
                    'name' => 'Kanban',
                    'type' => 'kanban',
                    'is_default' => false,
                    'is_system' => true,
                    'position' => 1,
                ]);

                BoardView::create([
                    'board_id' => $board->id,
                    'name' => 'Timeline',
                    'type' => 'timeline',
                    'is_default' => false,
                    'is_system' => true,
                    'position' => 2,
                ]);

                BoardView::create([
                    'board_id' => $board->id,
                    'name' => 'Calendar',
                    'type' => 'calendar',
                    'is_default' => false,
                    'is_system' => true,
                    'position' => 3,
                ]);
            }
        }
    }
}
