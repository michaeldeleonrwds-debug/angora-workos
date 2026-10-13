<?php

namespace Database\Seeders;

use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\BoardView;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanComment;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class AngoraWorkOsDemoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Non-destructive, idempotent seeder that creates a comprehensive Monday.com-style
     * "Enterprise Engineering & Operations Sprint" board with custom dynamic columns,
     * status options, groups, tasks, subitems, and comments.
     */
    public function run(): void
    {
        $admin = User::where('role', 'super_admin')->first() ?? User::first();
        if (!$admin) {
            return;
        }

        $allUsers = User::all();

        // 1. Workspace
        $workspace = Workspace::firstOrCreate(
            ['name' => 'Engineering & Product Operations'],
            [
                'description' => 'Cross-functional engineering sprints, roadmap milestones, and operational delivery.',
                'icon' => 'cpu',
                'color' => '#579BFC',
                'owner_id' => $admin->id,
                'is_favorite' => true,
            ]
        );

        foreach ($allUsers as $u) {
            WorkspaceMember::firstOrCreate(
                [
                    'workspace_id' => $workspace->id,
                    'user_id' => $u->id,
                ],
                [
                    'role' => $u->role === 'super_admin' ? 'owner' : 'member',
                ]
            );
        }

        // 2. Kanban Board
        $board = KanbanBoard::firstOrCreate(
            [
                'workspace_id' => $workspace->id,
                'title' => 'Sprint 42: Next-Gen Architecture & Scale',
            ],
            [
                'description' => 'Active delivery sprint tracking high-impact architecture, performance improvements, and operational work.',
                'department' => 'Engineering',
                'created_by' => $admin->id,
                'visibility' => 'main',
                'is_favorite' => true,
            ]
        );

        // 3. Status Columns (Workflow stages)
        $statuses = [
            ['title' => 'Backlog', 'color' => '#94A3B8', 'position' => 0],
            ['title' => 'Working on it', 'color' => '#FDAB3D', 'position' => 1],
            ['title' => 'In Review', 'color' => '#A25DDC', 'position' => 2],
            ['title' => 'Stuck', 'color' => '#E2445C', 'position' => 3],
            ['title' => 'Done', 'color' => '#00C875', 'position' => 4],
        ];

        $columnMap = [];
        foreach ($statuses as $st) {
            $col = KanbanColumn::firstOrCreate(
                [
                    'board_id' => $board->id,
                    'title' => $st['title'],
                ],
                [
                    'color' => $st['color'],
                    'position' => $st['position'],
                ]
            );
            $columnMap[$st['title']] = $col;
        }

        // 4. Board Views
        $views = [
            ['name' => 'Main Table', 'type' => 'table', 'is_default' => true],
            ['name' => 'Sprint Kanban', 'type' => 'kanban', 'is_default' => false],
            ['name' => 'Timeline / Roadmap', 'type' => 'timeline', 'is_default' => false],
            ['name' => 'Gantt Schedule', 'type' => 'gantt', 'is_default' => false],
            ['name' => 'Release Calendar', 'type' => 'calendar', 'is_default' => false],
        ];

        foreach ($views as $idx => $v) {
            BoardView::firstOrCreate(
                [
                    'board_id' => $board->id,
                    'name' => $v['name'],
                ],
                [
                    'type' => $v['type'],
                    'is_default' => $v['is_default'],
                    'position' => $idx,
                ]
            );
        }

        // 5. Dynamic Board Columns
        $boardColumnsDef = [
            [
                'key' => 'person',
                'title' => 'Owner',
                'type' => 'people',
                'width' => 150,
                'position' => 1,
            ],
            [
                'key' => 'status',
                'title' => 'Status',
                'type' => 'status',
                'width' => 140,
                'position' => 2,
                'config' => [
                    'status_options' => [
                        ['label' => 'Working on it', 'color' => '#FDAB3D'],
                        ['label' => 'In Review', 'color' => '#A25DDC'],
                        ['label' => 'Stuck', 'color' => '#E2445C'],
                        ['label' => 'Done', 'color' => '#00C875'],
                    ],
                ],
            ],
            [
                'key' => 'priority',
                'title' => 'Priority',
                'type' => 'priority',
                'width' => 120,
                'position' => 3,
            ],
            [
                'key' => 'timeline',
                'title' => 'Timeline',
                'type' => 'timeline',
                'width' => 170,
                'position' => 4,
            ],
            [
                'key' => 'due_date',
                'title' => 'Due Date',
                'type' => 'date',
                'width' => 130,
                'position' => 5,
            ],
            [
                'key' => 'progress',
                'title' => 'Progress',
                'type' => 'progress',
                'width' => 130,
                'position' => 6,
            ],
            [
                'key' => 'spec_notes',
                'title' => 'Spec Notes',
                'type' => 'long_text',
                'width' => 200,
                'position' => 7,
            ],
            [
                'key' => 'effort_points',
                'title' => 'Effort (SP)',
                'type' => 'number',
                'width' => 110,
                'position' => 8,
            ],
            [
                'key' => 'client_approved',
                'title' => 'Approved',
                'type' => 'checkbox',
                'width' => 100,
                'position' => 9,
            ],
        ];

        foreach ($boardColumnsDef as $bcd) {
            BoardColumn::firstOrCreate(
                [
                    'board_id' => $board->id,
                    'key' => $bcd['key'],
                ],
                [
                    'title' => $bcd['title'],
                    'type' => $bcd['type'],
                    'width' => $bcd['width'],
                    'position' => $bcd['position'],
                    'is_visible' => true,
                    'config' => $bcd['config'] ?? null,
                ]
            );
        }

        // 6. Board Groups
        $groupDeliverables = BoardGroup::firstOrCreate(
            [
                'board_id' => $board->id,
                'title' => 'Active Deliverables',
            ],
            [
                'color' => '#579BFC',
                'position' => 0,
            ]
        );

        $groupBacklog = BoardGroup::firstOrCreate(
            [
                'board_id' => $board->id,
                'title' => 'Sprint Planning & Backlog',
            ],
            [
                'color' => '#A25DDC',
                'position' => 1,
            ]
        );

        // 7. Seed Tasks with Interactive Values & Subitems
        $now = Carbon::now();

        $tasksData = [
            [
                'group_id' => $groupDeliverables->id,
                'title' => 'Migrate Auth Gateway to Laravel 12 Sanctum Tokens',
                'column_id' => $columnMap['Working on it']->id,
                'priority' => 'Urgent',
                'start_date' => $now->copy()->subDays(2)->toDateString(),
                'start_time' => '09:00:00',
                'due_date' => $now->copy()->addDays(2)->toDateString(),
                'due_time' => '17:00:00',
                'progress' => 65,
                'is_milestone' => true,
                'custom_values' => [
                    'spec_notes' => 'Ensures backward compatibility with SPA tokens and mobile clients.',
                    'effort_points' => 8,
                    'client_approved' => true,
                ],
                'subitems' => [
                    ['title' => 'Audit legacy token revocation hooks', 'progress' => 100, 'completed' => true],
                    ['title' => 'Implement automated rotation middleware', 'progress' => 50, 'completed' => false],
                    ['title' => 'Run end-to-end authentication matrix', 'progress' => 0, 'completed' => false],
                ],
            ],
            [
                'group_id' => $groupDeliverables->id,
                'title' => 'Real-Time Dynamic Columns Architecture & Indexing',
                'column_id' => $columnMap['In Review']->id,
                'priority' => 'High',
                'start_date' => $now->copy()->subDays(4)->toDateString(),
                'start_time' => '10:00:00',
                'due_date' => $now->copy()->addDays(1)->toDateString(),
                'due_time' => '15:00:00',
                'progress' => 85,
                'is_milestone' => false,
                'custom_values' => [
                    'spec_notes' => 'Support duplicate columns, long text, and responsive table cells.',
                    'effort_points' => 5,
                    'client_approved' => true,
                ],
                'subitems' => [
                    ['title' => 'Duplicate column backend endpoint with custom values migration', 'progress' => 100, 'completed' => true],
                    ['title' => 'Interactive cell triggers and drawer synchronization', 'progress' => 100, 'completed' => true],
                ],
            ],
            [
                'group_id' => $groupDeliverables->id,
                'title' => 'Optimize MariaDB / MySQL Large Query Response Times',
                'column_id' => $columnMap['Done']->id,
                'priority' => 'Medium',
                'start_date' => $now->copy()->subDays(7)->toDateString(),
                'start_time' => '08:30:00',
                'due_date' => $now->copy()->subDays(1)->toDateString(),
                'due_time' => '18:00:00',
                'progress' => 100,
                'is_milestone' => true,
                'custom_values' => [
                    'spec_notes' => 'Reduced cursor polling overhead by 68% using compound workspace indices.',
                    'effort_points' => 3,
                    'client_approved' => true,
                ],
                'subitems' => [],
            ],
            [
                'group_id' => $groupBacklog->id,
                'title' => 'Implement Automated S3 Asset Mirroring Pipeline',
                'column_id' => $columnMap['Backlog']->id,
                'priority' => 'Medium',
                'start_date' => $now->copy()->addDays(3)->toDateString(),
                'start_time' => '11:00:00',
                'due_date' => $now->copy()->addDays(10)->toDateString(),
                'due_time' => '17:00:00',
                'progress' => 0,
                'is_milestone' => false,
                'custom_values' => [
                    'spec_notes' => 'Asynchronous chunk uploads compatible with shared hosting.',
                    'effort_points' => 13,
                    'client_approved' => false,
                ],
                'subitems' => [
                    ['title' => 'Design multipart upload controller', 'progress' => 0, 'completed' => false],
                ],
            ],
        ];

        foreach ($tasksData as $tData) {
            $task = KanbanTask::firstOrCreate(
                [
                    'board_id' => $board->id,
                    'group_id' => $tData['group_id'],
                    'title' => $tData['title'],
                ],
                [
                    'column_id' => $tData['column_id'],
                    'assigned_to' => $admin->id,
                    'priority' => $tData['priority'],
                    'start_date' => $tData['start_date'],
                    'start_time' => $tData['start_time'],
                    'due_date' => $tData['due_date'],
                    'due_time' => $tData['due_time'],
                    'progress' => $tData['progress'],
                    'is_milestone' => $tData['is_milestone'],
                    'custom_values' => $tData['custom_values'],
                    'created_by' => $admin->id,
                ]
            );

            // Subitems
            foreach ($tData['subitems'] as $sData) {
                KanbanTask::firstOrCreate(
                    [
                        'board_id' => $board->id,
                        'parent_id' => $task->id,
                        'title' => $sData['title'],
                    ],
                    [
                        'group_id' => $tData['group_id'],
                        'column_id' => $sData['completed'] ? $columnMap['Done']->id : $columnMap['Working on it']->id,
                        'progress' => $sData['progress'],
                        'completed_at' => $sData['completed'] ? Carbon::now() : null,
                        'created_by' => $admin->id,
                    ]
                );
            }

            // Seed comment
            KanbanComment::firstOrCreate(
                [
                    'task_id' => $task->id,
                    'user_id' => $admin->id,
                    'message' => 'Initial scope, milestones, and dynamic column attributes configured for this deliverable.',
                ]
            );
        }
    }
}
