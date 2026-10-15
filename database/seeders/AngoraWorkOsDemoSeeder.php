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
use App\Services\TaskActivityService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class AngoraWorkOsDemoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Non-destructive, idempotent development seeders that create:
     * 1. "Sprint 42: Next-Gen Architecture & Scale" (Engineering sprint board)
     * 2. "Angora Production — Demo" (Realistic Monday.com-inspired production-management board)
     */
    public function run(): void
    {
        $admin = User::role('super_admin')->first() ?? User::first();
        if (!$admin) {
            return;
        }

        // Ensure safe demo team members exist for realistic assignment
        $demoUsers = $this->ensureDemoUsers();

        // 1. Seed Engineering Sprint Board
        $this->seedEngineeringSprintBoard($admin);

        // 2. Seed Realistic Production Management Board
        $this->seedProductionDemoBoard($admin, $demoUsers);
    }

    /**
     * Ensure development demo team members exist safely and idempotently.
     */
    protected function ensureDemoUsers(): array
    {
        $userDefinitions = [
            'am_maria' => [
                'name' => 'Maria Santos',
                'email' => 'maria.santos@angora.internal',
                'role' => 'project_manager',
                'department' => 'Account Management',
            ],
            'am_chris' => [
                'name' => 'Chris Vance',
                'email' => 'chris.vance@angora.internal',
                'role' => 'project_manager',
                'department' => 'Account Management',
            ],
            'designer_leo' => [
                'name' => 'Leo De Guzman',
                'email' => 'leo.deguzman@angora.internal',
                'role' => 'dept_user',
                'department' => 'Creative & Design',
            ],
            'designer_chloe' => [
                'name' => 'Chloe Bennett',
                'email' => 'chloe.bennett@angora.internal',
                'role' => 'dept_user',
                'department' => 'Creative & Design',
            ],
            'designer_maya' => [
                'name' => 'Maya Lin',
                'email' => 'maya.lin@angora.internal',
                'role' => 'dept_user',
                'department' => 'Video & Motion',
            ],
            'dev_sam' => [
                'name' => 'Sam Rivera',
                'email' => 'sam.rivera@angora.internal',
                'role' => 'dept_user',
                'department' => 'Web Development',
            ],
        ];

        $users = [];
        foreach ($userDefinitions as $key => $uDef) {
            $user = User::firstOrCreate(
                ['email' => $uDef['email']],
                [
                    'name' => $uDef['name'],
                    'password' => bcrypt('password123'),
                    'department' => $uDef['department'],
                    'status' => 'active',
                ]
            );
            if ($user->roles()->doesntExist()) {
                $user->assignRole($uDef['role']);
            }
            $users[$key] = $user;
        }

        return $users;
    }

    /**
     * Seed 1: Engineering Sprint Board
     */
    protected function seedEngineeringSprintBoard(User $admin): void
    {
        $allUsers = User::all();

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
                ['workspace_id' => $workspace->id, 'user_id' => $u->id],
                ['role' => $u->primaryRoleName() === 'super_admin' ? 'owner' : 'member']
            );
        }

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
                ['board_id' => $board->id, 'title' => $st['title']],
                ['color' => $st['color'], 'position' => $st['position']]
            );
            $columnMap[$st['title']] = $col;
        }

        $views = [
            ['name' => 'Main Table', 'type' => 'table', 'is_default' => true],
            ['name' => 'Sprint Kanban', 'type' => 'kanban', 'is_default' => false],
            ['name' => 'Timeline / Roadmap', 'type' => 'timeline', 'is_default' => false],
            ['name' => 'Gantt Schedule', 'type' => 'gantt', 'is_default' => false],
            ['name' => 'Release Calendar', 'type' => 'calendar', 'is_default' => false],
        ];

        foreach ($views as $idx => $v) {
            BoardView::firstOrCreate(
                ['board_id' => $board->id, 'name' => $v['name']],
                ['type' => $v['type'], 'is_default' => $v['is_default'], 'position' => $idx]
            );
        }

        $boardColumnsDef = [
            ['key' => 'person', 'title' => 'Owner', 'type' => 'people', 'width' => 150, 'position' => 1],
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
            ['key' => 'priority', 'title' => 'Priority', 'type' => 'priority', 'width' => 120, 'position' => 3],
            ['key' => 'timeline', 'title' => 'Timeline', 'type' => 'timeline', 'width' => 170, 'position' => 4],
            ['key' => 'due_date', 'title' => 'Due Date', 'type' => 'date', 'width' => 130, 'position' => 5],
            ['key' => 'progress', 'title' => 'Progress', 'type' => 'progress', 'width' => 130, 'position' => 6],
            ['key' => 'spec_notes', 'title' => 'Spec Notes', 'type' => 'long_text', 'width' => 200, 'position' => 7],
            ['key' => 'effort_points', 'title' => 'Effort (SP)', 'type' => 'number', 'width' => 110, 'position' => 8],
            ['key' => 'client_approved', 'title' => 'Approved', 'type' => 'checkbox', 'width' => 100, 'position' => 9],
        ];

        foreach ($boardColumnsDef as $bcd) {
            BoardColumn::firstOrCreate(
                ['board_id' => $board->id, 'key' => $bcd['key']],
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

        $groupDeliverables = BoardGroup::firstOrCreate(
            ['board_id' => $board->id, 'title' => 'Active Deliverables'],
            ['color' => '#579BFC', 'position' => 0]
        );

        $groupBacklog = BoardGroup::firstOrCreate(
            ['board_id' => $board->id, 'title' => 'Sprint Planning & Backlog'],
            ['color' => '#A25DDC', 'position' => 1]
        );

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

            KanbanComment::firstOrCreate(
                [
                    'task_id' => $task->id,
                    'user_id' => $admin->id,
                    'message' => 'Initial scope, milestones, and dynamic column attributes configured for this deliverable.',
                ]
            );
        }
    }

    /**
     * Seed 2: Realistic Production Management Board ("Angora Production — Demo")
     * Inspired by creative agency / media production Monday.com workflows.
     */
    protected function seedProductionDemoBoard(User $admin, array $demoUsers): void
    {
        $allUsers = User::all();

        // 1. Workspace
        $workspace = Workspace::firstOrCreate(
            ['name' => 'Agency Production Operations'],
            [
                'description' => 'Creative agency media production, graphic design, video editing, and client deliverables.',
                'icon' => 'layout-grid',
                'color' => '#FDAB3D',
                'owner_id' => $admin->id,
                'is_favorite' => true,
            ]
        );

        foreach ($allUsers as $u) {
            WorkspaceMember::firstOrCreate(
                ['workspace_id' => $workspace->id, 'user_id' => $u->id],
                ['role' => $u->primaryRoleName() === 'super_admin' ? 'owner' : 'member']
            );
        }

        // 2. Board
        $board = KanbanBoard::firstOrCreate(
            [
                'workspace_id' => $workspace->id,
                'title' => 'Angora Production — Demo',
            ],
            [
                'description' => 'Real-time production management tracking creative assignments, account managers, deadlines, and revisions.',
                'department' => 'Production',
                'created_by' => $admin->id,
                'visibility' => 'main',
                'is_favorite' => true,
            ]
        );

        // 3. Status Workflow Stages (Configured with vivid Monday.com-style status tags)
        $productionStatuses = [
            ['title' => 'Resources', 'color' => '#579BFC', 'position' => 0],
            ['title' => 'Hold', 'color' => '#E2445C', 'position' => 1],
            ['title' => 'New Task', 'color' => '#0086C0', 'position' => 2],
            ['title' => 'Working on it', 'color' => '#FDAB3D', 'position' => 3],
            ['title' => 'For Review', 'color' => '#A25DDC', 'position' => 4],
            ['title' => 'Needs Revision', 'color' => '#FF642E', 'position' => 5],
            ['title' => 'Done', 'color' => '#00C875', 'position' => 6],
        ];

        $statusMap = [];
        foreach ($productionStatuses as $st) {
            $col = KanbanColumn::firstOrCreate(
                ['board_id' => $board->id, 'title' => $st['title']],
                ['color' => $st['color'], 'position' => $st['position']]
            );
            $statusMap[$st['title']] = $col;
        }

        // 4. Board Views
        $views = [
            ['name' => 'Main Table', 'type' => 'table', 'is_default' => true],
            ['name' => 'Production Kanban', 'type' => 'kanban', 'is_default' => false],
            ['name' => 'Timeline Overview', 'type' => 'timeline', 'is_default' => false],
            ['name' => 'Production Calendar', 'type' => 'calendar', 'is_default' => false],
        ];

        foreach ($views as $idx => $v) {
            BoardView::firstOrCreate(
                ['board_id' => $board->id, 'name' => $v['name']],
                ['type' => $v['type'], 'is_default' => $v['is_default'], 'position' => $idx]
            );
        }

        // 5. Configured Dynamic Columns In Requested Order:
        // 1. Task (Primary column)
        // 2. Designer (People assignment)
        // 3. AM (Account Manager assignment)
        // 4. Status (Configurable status labels)
        // 5. Deadline (date/time)
        // 6. Client Deadline (date/time)
        // 7. Service Type (Dropdown selection)
        // 8. No. of Task Simul (Numeric column with footer sum)
        $serviceTypeOptions = [
            'Email Automation',
            'Landing Page',
            'Logo',
            'Poster',
            'Promotional Kit',
            'Resolution & Image Quality',
            'Social Media Post',
            'Video',
        ];

        $boardColumns = [
            [
                'key' => 'person', // primary assignee: Designer
                'title' => 'Designer',
                'type' => 'people',
                'width' => 150,
                'position' => 1,
            ],
            [
                'key' => 'account_manager', // custom people column: AM
                'title' => 'AM',
                'type' => 'people',
                'width' => 140,
                'position' => 2,
            ],
            [
                'key' => 'status',
                'title' => 'Status',
                'type' => 'status',
                'width' => 150,
                'position' => 3,
                'config' => [
                    'status_options' => [
                        ['label' => 'Resources', 'color' => '#579BFC'],
                        ['label' => 'Hold', 'color' => '#E2445C'],
                        ['label' => 'New Task', 'color' => '#0086C0'],
                        ['label' => 'Working on it', 'color' => '#FDAB3D'],
                        ['label' => 'For Review', 'color' => '#A25DDC'],
                        ['label' => 'Needs Revision', 'color' => '#FF642E'],
                        ['label' => 'Done', 'color' => '#00C875'],
                    ],
                ],
            ],
            [
                'key' => 'due_date', // Deadline
                'title' => 'Deadline',
                'type' => 'date',
                'width' => 205,
                'position' => 4,
            ],
            [
                'key' => 'client_deadline', // Client Deadline
                'title' => 'Client Deadline',
                'type' => 'date',
                'width' => 205,
                'position' => 5,
            ],
            [
                'key' => 'service_type', // Service Type
                'title' => 'Service Type',
                'type' => 'dropdown',
                'width' => 170,
                'position' => 6,
                'config' => [
                    'options' => $serviceTypeOptions,
                ],
            ],
            [
                'key' => 'simul_tasks', // No. of Task Simul
                'title' => 'No. of Task Simul',
                'type' => 'number',
                'width' => 140,
                'position' => 7,
            ],
        ];

        foreach ($boardColumns as $bc) {
            BoardColumn::firstOrCreate(
                ['board_id' => $board->id, 'key' => $bc['key']],
                [
                    'title' => $bc['title'],
                    'type' => $bc['type'],
                    'scope' => 'task',
                    'width' => $bc['width'],
                    'position' => $bc['position'],
                    'is_visible' => true,
                    'config' => $bc['config'] ?? null,
                ]
            );
        }

        // 5b. Configured Independent Subtask Columns
        $subitemColumns = [
            [
                'key' => 'sub_designer',
                'title' => 'Designer',
                'type' => 'people',
                'width' => 150,
                'position' => 0,
            ],
            [
                'key' => 'sub_deadline',
                'title' => 'Deadline',
                'type' => 'date',
                'width' => 205,
                'position' => 1,
            ],
            [
                'key' => 'sub_status',
                'title' => 'Status',
                'type' => 'status',
                'width' => 140,
                'position' => 2,
                'config' => [
                    'status_options' => [
                        ['label' => 'New Task', 'color' => '#0086C0'],
                        ['label' => 'Working on it', 'color' => '#FDAB3D'],
                        ['label' => 'For Review', 'color' => '#A25DDC'],
                        ['label' => 'Needs Revision', 'color' => '#FF642E'],
                        ['label' => 'Done', 'color' => '#00C875'],
                    ],
                ],
            ],
            [
                'key' => 'sub_task_type',
                'title' => 'Task Type',
                'type' => 'dropdown',
                'width' => 170,
                'position' => 3,
                'config' => [
                    'options' => [
                        'Email Automation',
                        'Landing Page',
                        'Logo',
                        'Poster',
                        'Promotional Kit',
                        'Resolution & Image Quality',
                        'Social Media Post',
                        'Video',
                    ],
                ],
            ],
            [
                'key' => 'sub_internal_revision',
                'title' => 'Internal Revision',
                'type' => 'text',
                'width' => 140,
                'position' => 4,
            ],
            [
                'key' => 'sub_client_revision',
                'title' => 'Client Revision',
                'type' => 'text',
                'width' => 140,
                'position' => 5,
            ],
            [
                'key' => 'sub_client_requests',
                'title' => 'Client Requests',
                'type' => 'text',
                'width' => 180,
                'position' => 6,
            ],
        ];

        foreach ($subitemColumns as $sc) {
            BoardColumn::firstOrCreate(
                ['board_id' => $board->id, 'key' => $sc['key']],
                [
                    'title' => $sc['title'],
                    'type' => $sc['type'],
                    'scope' => 'subtask',
                    'width' => $sc['width'],
                    'position' => $sc['position'],
                    'is_visible' => true,
                    'config' => $sc['config'] ?? null,
                ]
            );
        }

        // Ensure options are refreshed if board already existed
        BoardColumn::where('board_id', $board->id)->where('key', 'service_type')->update([
            'config' => ['options' => $serviceTypeOptions],
        ]);
        BoardColumn::where('board_id', $board->id)->where('key', 'sub_task_type')->update([
            'config' => ['options' => $serviceTypeOptions],
        ]);

        // 6. Board Groups:
        // - Resources
        // - Hold
        // - New Task
        // - In Progress
        // - For Review
        // - Completed
        $groupsDef = [
            ['title' => 'Resources', 'color' => '#579BFC', 'position' => 0],
            ['title' => 'Hold', 'color' => '#E2445C', 'position' => 1],
            ['title' => 'New Task', 'color' => '#0086C0', 'position' => 2],
            ['title' => 'In Progress', 'color' => '#FDAB3D', 'position' => 3],
            ['title' => 'For Review', 'color' => '#A25DDC', 'position' => 4],
            ['title' => 'Completed', 'color' => '#00C875', 'position' => 5],
        ];

        $groupMap = [];
        foreach ($groupsDef as $gDef) {
            $group = BoardGroup::firstOrCreate(
                ['board_id' => $board->id, 'title' => $gDef['title']],
                ['color' => $gDef['color'], 'position' => $gDef['position']]
            );
            $groupMap[$gDef['title']] = $group;
        }

        // 7. Seed Realistic Tasks & Nested Subitems
        $now = Carbon::now();

        $leoId = $demoUsers['designer_leo']->id;
        $chloeId = $demoUsers['designer_chloe']->id;
        $mayaId = $demoUsers['designer_maya']->id;
        $samId = $demoUsers['dev_sam']->id;
        $mariaId = $demoUsers['am_maria']->id;
        $chrisId = $demoUsers['am_chris']->id;

        // Group 1: Resources (with expandable subitems)
        $resourcesTasks = [
            [
                'title' => 'RESOURCES',
                'designer_id' => null,
                'am_id' => $mariaId,
                'status' => 'Resources',
                'deadline' => null,
                'client_deadline' => null,
                'service' => 'Logo',
                'simul' => 0,
                'subitems' => [
                    ['title' => 'Brand Typography & Google Webfonts Kit', 'designer_id' => $leoId, 'status' => 'Done', 'task_type' => 'Logo'],
                    ['title' => 'Figma Global Tokens & Component Library v2', 'designer_id' => $chloeId, 'status' => 'Done', 'task_type' => 'Landing Page'],
                    ['title' => '4K Video B-Roll Library & Sound Effects Drive', 'designer_id' => $mayaId, 'status' => 'Done', 'task_type' => 'Video'],
                    ['title' => 'Official Agency Color Palettes (RGB / CMYK / Hex)', 'designer_id' => $leoId, 'status' => 'Done', 'task_type' => 'Resolution & Image Quality'],
                ],
            ],
            [
                'title' => 'CLIENT RESOURCES',
                'designer_id' => null,
                'am_id' => $chrisId,
                'status' => 'Resources',
                'deadline' => null,
                'client_deadline' => null,
                'service' => 'Logo',
                'simul' => 0,
                'subitems' => [
                    ['title' => 'Apex Global Brand Guide 2026', 'designer_id' => $leoId, 'status' => 'Done', 'task_type' => 'Logo'],
                    ['title' => 'Nexus Media Raw Product Photo Captures', 'designer_id' => $chloeId, 'status' => 'Done', 'task_type' => 'Resolution & Image Quality'],
                    ['title' => 'Trade Star Webinar Presentation Guidelines', 'designer_id' => $mayaId, 'status' => 'Done', 'task_type' => 'Promotional Kit'],
                ],
            ],
        ];

        // Group 2: Hold (inspired by reference: MENICO1, DLT90, Roof Smart, Graphics for Posting)
        $holdTasks = [
            [
                'title' => 'MENICO1 — Kings of Kings | Static & Video',
                'designer_id' => [$mayaId, $leoId],
                'am_id' => [$mariaId, $chrisId],
                'status' => 'Hold',
                'deadline' => $now->copy()->addDays(5)->toDateString(),
                'client_deadline' => $now->copy()->addDays(7)->toDateString(),
                'service' => 'Video',
                'simul' => 2,
                'subitems' => [
                    ['title' => '15s Instagram Reel Cut with Sound Sync', 'designer_id' => $mayaId, 'status' => 'Hold', 'task_type' => 'Video'],
                    ['title' => 'High-Res Static Feed Promo Carousel', 'designer_id' => $leoId, 'status' => 'Hold', 'task_type' => 'Social Media Post'],
                ],
            ],
            [
                'title' => 'DLT90 — Trade Star Webinar',
                'designer_id' => $chloeId,
                'am_id' => $chrisId,
                'status' => 'Hold',
                'deadline' => $now->copy()->addDays(3)->toDateString(),
                'client_deadline' => $now->copy()->addDays(4)->toDateString(),
                'service' => 'Promotional Kit',
                'simul' => 1,
                'subitems' => [],
            ],
            [
                'title' => 'MENICO1 — Roof Smart | Roofing & Lighting',
                'designer_id' => $leoId,
                'am_id' => $mariaId,
                'status' => 'Hold',
                'deadline' => $now->copy()->addDays(6)->toDateString(),
                'client_deadline' => $now->copy()->addDays(8)->toDateString(),
                'service' => 'Poster',
                'simul' => 3,
                'subitems' => [],
            ],
            [
                'title' => 'Graphics for Posting — Weekly Social Batch',
                'designer_id' => $chloeId,
                'am_id' => $mariaId,
                'status' => 'Hold',
                'deadline' => $now->copy()->addDays(2)->toDateString(),
                'client_deadline' => $now->copy()->addDays(3)->toDateString(),
                'service' => 'Social Media Post',
                'simul' => 4,
                'subitems' => [],
            ],
        ];

        // Group 3: New Task
        $newTaskTasks = [
            [
                'title' => 'APEX — Q4 Omnichannel Marketing Banner Set',
                'designer_id' => $leoId,
                'am_id' => $mariaId,
                'status' => 'New Task',
                'deadline' => $now->copy()->addDays(4)->toDateString(),
                'client_deadline' => $now->copy()->addDays(5)->toDateString(),
                'service' => 'Landing Page',
                'simul' => 5,
                'subitems' => [
                    [
                        'title' => 'Google Display Ads (300x250, 728x90, 160x600)',
                        'designer_id' => $leoId,
                        'status' => 'New Task',
                        'deadline' => $now->copy()->addDays(3)->toDateString(),
                        'task_type' => 'Poster',
                        'internal_revision' => 'Round 1 Initial Layout',
                        'client_revision' => 'Pending First Batch',
                        'client_requests' => 'Export at 2x retina display and keep file sizes under 150KB per spec.',
                    ],
                    [
                        'title' => 'Facebook & Instagram Story Creative Sizes',
                        'designer_id' => [$leoId, $chloeId],
                        'status' => 'New Task',
                        'deadline' => $now->copy()->addDays(4)->toDateString(),
                        'task_type' => 'Social Media Post',
                        'internal_revision' => 'Pending Review',
                        'client_revision' => '-',
                        'client_requests' => 'Adhere strictly to 9:16 safe zones for CTAs.',
                    ],
                ],
            ],
            [
                'title' => 'VORTEX — Cyber Monday Teaser Reels',
                'designer_id' => $mayaId,
                'am_id' => $chrisId,
                'status' => 'New Task',
                'deadline' => $now->copy()->addDays(3)->toDateString(),
                'client_deadline' => $now->copy()->addDays(5)->toDateString(),
                'service' => 'Video',
                'simul' => 2,
                'subitems' => [],
            ],
            [
                'title' => 'LUMINA — Print Catalog & Tri-Fold Product Brochure',
                'designer_id' => $chloeId,
                'am_id' => $mariaId,
                'status' => 'New Task',
                'deadline' => $now->copy()->addDays(7)->toDateString(),
                'client_deadline' => $now->copy()->addDays(9)->toDateString(),
                'service' => 'Promotional Kit',
                'simul' => 1,
                'subitems' => [],
            ],
            [
                'title' => 'STELLAR — Landing Page Hero Illustration & Iconography',
                'designer_id' => $samId,
                'am_id' => $chrisId,
                'status' => 'New Task',
                'deadline' => $now->copy()->addDays(6)->toDateString(),
                'client_deadline' => $now->copy()->addDays(8)->toDateString(),
                'service' => 'Landing Page',
                'simul' => 2,
                'subitems' => [],
            ],
            [
                'title' => 'ZENITH — Corporate Rebrand Guidelines Sheet',
                'designer_id' => $leoId,
                'am_id' => $mariaId,
                'status' => 'New Task',
                'deadline' => $now->copy()->addDays(10)->toDateString(),
                'client_deadline' => $now->copy()->addDays(12)->toDateString(),
                'service' => 'Logo',
                'simul' => 1,
                'subitems' => [],
            ],
            [
                'title' => 'KINETIC — TikTok Sound Sync Product Spot 9:16',
                'designer_id' => $mayaId,
                'am_id' => $chrisId,
                'status' => 'New Task',
                'deadline' => $now->copy()->addDays(4)->toDateString(),
                'client_deadline' => $now->copy()->addDays(6)->toDateString(),
                'service' => 'Video',
                'simul' => 2,
                'subitems' => [],
            ],
        ];

        // Group 4: In Progress
        $inProgressTasks = [
            [
                'title' => 'CASCADE — 3D Product Mockups for eCommerce Store',
                'designer_id' => [$leoId, $chloeId],
                'am_id' => $mariaId,
                'status' => 'Working on it',
                'deadline' => $now->copy()->addDays(1)->toDateString(),
                'client_deadline' => $now->copy()->addDays(2)->toDateString(),
                'service' => 'Poster',
                'simul' => 3,
                'subitems' => [
                    [
                        'title' => 'Front & isometric 3D render composition',
                        'designer_id' => $leoId,
                        'status' => 'Done',
                        'deadline' => $now->copy()->subDays(1)->toDateString(),
                        'task_type' => 'Resolution & Image Quality',
                        'internal_revision' => 'Approved by Art Director',
                        'client_revision' => 'No edits required',
                        'client_requests' => 'Make lighting dramatic with warm highlights.',
                    ],
                    [
                        'title' => 'Packaging shadow masking and color grading',
                        'designer_id' => [$leoId, $samId],
                        'status' => 'Working on it',
                        'deadline' => $now->copy()->addDays(1)->toDateString(),
                        'task_type' => 'Resolution & Image Quality',
                        'internal_revision' => 'Shadow opacity adjustment in progress',
                        'client_revision' => 'Batch 2 requested softer shadow falloff',
                        'client_requests' => 'Use transparent PNG backgrounds.',
                    ],
                ],
            ],
            [
                'title' => 'SOLARIS — Annual Investor Keynote Deck Redesign',
                'designer_id' => $chloeId,
                'am_id' => $chrisId,
                'status' => 'Working on it',
                'deadline' => $now->copy()->addDays(2)->toDateString(),
                'client_deadline' => $now->copy()->addDays(3)->toDateString(),
                'service' => 'Promotional Kit',
                'simul' => 1,
                'subitems' => [],
            ],
            [
                'title' => 'HYPERION — 60s Brand Story Explainer Animation',
                'designer_id' => $mayaId,
                'am_id' => $mariaId,
                'status' => 'Working on it',
                'deadline' => $now->copy()->addDays(3)->toDateString(),
                'client_deadline' => $now->copy()->addDays(4)->toDateString(),
                'service' => 'Video',
                'simul' => 2,
                'subitems' => [],
            ],
            [
                'title' => 'QUANTUM — SaaS Pricing Matrix & Feature Comparison Table',
                'designer_id' => $samId,
                'am_id' => $chrisId,
                'status' => 'Working on it',
                'deadline' => $now->copy()->toDateString(),
                'client_deadline' => $now->copy()->addDays(1)->toDateString(),
                'service' => 'Landing Page',
                'simul' => 2,
                'subitems' => [],
            ],
            [
                'title' => 'ORBIT — Influencer Gifting Kit Box Packaging Artwork',
                'designer_id' => $chloeId,
                'am_id' => $mariaId,
                'status' => 'Working on it',
                'deadline' => $now->copy()->addDays(2)->toDateString(),
                'client_deadline' => $now->copy()->addDays(4)->toDateString(),
                'service' => 'Promotional Kit',
                'simul' => 1,
                'subitems' => [],
            ],
            [
                'title' => 'PRISM — Black Friday Static Ad Creatives (10 Variants)',
                'designer_id' => $leoId,
                'am_id' => $chrisId,
                'status' => 'Working on it',
                'deadline' => $now->copy()->addDays(1)->toDateString(),
                'client_deadline' => $now->copy()->addDays(2)->toDateString(),
                'service' => 'Poster',
                'simul' => 4,
                'subitems' => [],
            ],
        ];

        // Group 5: For Review
        $forReviewTasks = [
            [
                'title' => 'NEXUS — YouTube Pre-Roll 30s Cut with Motion Graphics',
                'designer_id' => $mayaId,
                'am_id' => $mariaId,
                'status' => 'For Review',
                'deadline' => $now->copy()->toDateString(),
                'client_deadline' => $now->copy()->addDays(1)->toDateString(),
                'service' => 'Video',
                'simul' => 2,
                'subitems' => [
                    [
                        'title' => 'Voiceover audio normalization and sound mix',
                        'designer_id' => $mayaId,
                        'status' => 'Done',
                        'deadline' => $now->copy()->subDays(1)->toDateString(),
                        'task_type' => 'Video',
                        'internal_revision' => 'LUFS matched at -14dB',
                        'client_revision' => 'Client approved audio master',
                        'client_requests' => 'Include clean instrumental background bed.',
                    ],
                    [
                        'title' => 'Color grading in Rec709',
                        'designer_id' => [$mayaId, $chloeId],
                        'status' => 'For Review',
                        'deadline' => $now->copy()->toDateString(),
                        'task_type' => 'Resolution & Image Quality',
                        'internal_revision' => 'Version 2 with boosted saturation',
                        'client_revision' => 'Awaiting AM signoff before sending to brand team',
                        'client_requests' => 'Match hero product cyan hue to pantone guide.',
                    ],
                ],
            ],
            [
                'title' => 'ATLAS — Corporate LinkedIn Thought Leadership Carousels',
                'designer_id' => [$chloeId, $leoId],
                'am_id' => $chrisId,
                'status' => 'For Review',
                'deadline' => $now->copy()->toDateString(),
                'client_deadline' => $now->copy()->addDays(1)->toDateString(),
                'service' => 'Social Media Post',
                'simul' => 3,
                'subitems' => [],
            ],
            [
                'title' => 'VELOCITY — Mobile App Store Preview Screenshots (iOS & Play)',
                'designer_id' => $leoId,
                'am_id' => $mariaId,
                'status' => 'Needs Revision',
                'deadline' => $now->copy()->subDays(1)->toDateString(),
                'client_deadline' => $now->copy()->toDateString(),
                'service' => 'Poster',
                'simul' => 5,
                'subitems' => [],
            ],
            [
                'title' => 'AURORA — High-Impact Newsletter Header GIFs',
                'designer_id' => $mayaId,
                'am_id' => $chrisId,
                'status' => 'For Review',
                'deadline' => $now->copy()->addDays(1)->toDateString(),
                'client_deadline' => $now->copy()->addDays(2)->toDateString(),
                'service' => 'Email Automation',
                'simul' => 2,
                'subitems' => [],
            ],
            [
                'title' => 'STRATA — Event Rollup Banner Stand & Conference Backdrop',
                'designer_id' => $chloeId,
                'am_id' => [$mariaId, $chrisId],
                'status' => 'For Review',
                'deadline' => $now->copy()->addDays(1)->toDateString(),
                'client_deadline' => $now->copy()->addDays(3)->toDateString(),
                'service' => 'Promotional Kit',
                'simul' => 1,
                'subitems' => [],
            ],
        ];

        // Group 6: Completed
        $completedTasks = [
            [
                'title' => 'COSMOS — Brand Launch Press Kit & Media Asset Pack',
                'designer_id' => $leoId,
                'am_id' => $mariaId,
                'status' => 'Done',
                'deadline' => $now->copy()->subDays(4)->toDateString(),
                'client_deadline' => $now->copy()->subDays(3)->toDateString(),
                'service' => 'Logo',
                'simul' => 1,
                'subitems' => [
                    ['title' => 'High-resolution logo transparent exports', 'designer_id' => $leoId, 'status' => 'Done', 'task_type' => 'Logo'],
                    ['title' => 'Media release PDF interactive links check', 'designer_id' => $leoId, 'status' => 'Done', 'task_type' => 'Promotional Kit'],
                ],
            ],
            [
                'title' => 'ECLIPSE — Autumn Sale Web Header Responsive Banners',
                'designer_id' => $chloeId,
                'am_id' => $chrisId,
                'status' => 'Done',
                'deadline' => $now->copy()->subDays(5)->toDateString(),
                'client_deadline' => $now->copy()->subDays(4)->toDateString(),
                'service' => 'Landing Page',
                'simul' => 4,
                'subitems' => [],
            ],
            [
                'title' => 'PULSE — 15s Product Feature Story Highlight Clips',
                'designer_id' => $mayaId,
                'am_id' => $mariaId,
                'status' => 'Done',
                'deadline' => $now->copy()->subDays(3)->toDateString(),
                'client_deadline' => $now->copy()->subDays(2)->toDateString(),
                'service' => 'Video',
                'simul' => 3,
                'subitems' => [],
            ],
            [
                'title' => 'AEON — Investor Deck Financial Graphs & Data Infographics',
                'designer_id' => $samId,
                'am_id' => $chrisId,
                'status' => 'Done',
                'deadline' => $now->copy()->subDays(6)->toDateString(),
                'client_deadline' => $now->copy()->subDays(5)->toDateString(),
                'service' => 'Promotional Kit',
                'simul' => 2,
                'subitems' => [],
            ],
            [
                'title' => 'VERTEX — Business Card Foil Stamping Artwork Spec',
                'designer_id' => $chloeId,
                'am_id' => $mariaId,
                'status' => 'Done',
                'deadline' => $now->copy()->subDays(8)->toDateString(),
                'client_deadline' => $now->copy()->subDays(7)->toDateString(),
                'service' => 'Promotional Kit',
                'simul' => 1,
                'subitems' => [],
            ],
            [
                'title' => 'TITAN — Multi-Vendor Trade Booth 3D Mockup Presentation',
                'designer_id' => $leoId,
                'am_id' => $mariaId,
                'status' => 'Done',
                'deadline' => $now->copy()->subDays(9)->toDateString(),
                'client_deadline' => $now->copy()->subDays(8)->toDateString(),
                'service' => 'Poster',
                'simul' => 2,
                'subitems' => [],
            ],
        ];

        $allProductionGroups = [
            ['group' => $groupMap['Resources'], 'tasks' => $resourcesTasks],
            ['group' => $groupMap['Hold'], 'tasks' => $holdTasks],
            ['group' => $groupMap['New Task'], 'tasks' => $newTaskTasks],
            ['group' => $groupMap['In Progress'], 'tasks' => $inProgressTasks],
            ['group' => $groupMap['For Review'], 'tasks' => $forReviewTasks],
            ['group' => $groupMap['Completed'], 'tasks' => $completedTasks],
        ];

        foreach ($allProductionGroups as $gPack) {
            $group = $gPack['group'];
            foreach ($gPack['tasks'] as $tData) {
                $statusCol = $statusMap[$tData['status']] ?? $statusMap['New Task'];
                $isDone = $tData['status'] === 'Done';

                $designerArray = is_array($tData['designer_id'])
                    ? $tData['designer_id']
                    : ($tData['designer_id'] ? [$tData['designer_id']] : []);
                $primaryDesigner = $designerArray[0] ?? null;

                $amArray = is_array($tData['am_id'])
                    ? $tData['am_id']
                    : ($tData['am_id'] ? [$tData['am_id']] : []);

                $task = KanbanTask::firstOrCreate(
                    [
                        'board_id' => $board->id,
                        'group_id' => $group->id,
                        'title' => $tData['title'],
                    ],
                    [
                        'column_id' => $statusCol->id,
                        'assigned_to' => $primaryDesigner,
                        'priority' => $isDone ? 'Low' : ($tData['status'] === 'Hold' ? 'High' : 'Medium'),
                        'due_date' => $tData['deadline'],
                        'due_time' => $tData['deadline'] ? '17:00:00' : null,
                        'progress' => $isDone ? 100 : ($tData['status'] === 'Working on it' ? 60 : ($tData['status'] === 'For Review' ? 90 : 0)),
                        'completed_at' => $isDone ? $now : null,
                        'custom_values' => [
                            'account_manager' => $amArray,
                            'designer_ids' => $designerArray,
                            'person' => $designerArray,
                            'client_deadline' => $tData['client_deadline'],
                            'service_type' => $tData['service'],
                            'simul_tasks' => $tData['simul'],
                        ],
                        'created_by' => $admin->id,
                    ]
                );

                // Ensure multi-assignees and custom values stay synchronized if task previously existed
                $mergedCustom = array_merge($task->custom_values ?? [], [
                    'account_manager' => $amArray,
                    'designer_ids' => $designerArray,
                    'person' => $designerArray,
                    'client_deadline' => $tData['client_deadline'],
                    'service_type' => $tData['service'],
                    'simul_tasks' => $tData['simul'],
                ]);
                $task->update([
                    'assigned_to' => $primaryDesigner,
                    'custom_values' => $mergedCustom,
                ]);

                // Initial task creation activity log
                TaskActivityService::log(
                    task: $task,
                    eventType: 'task_created',
                    description: "{$admin->name} created task '{$task->title}' in group '{$group->title}'",
                    user: $admin
                );

                // Designer assignment activity
                if (!empty($designerArray)) {
                    $dNames = User::whereIn('id', $designerArray)->pluck('name')->join(', ');
                    TaskActivityService::log(
                        task: $task,
                        eventType: 'people_assignment_changed',
                        description: "{$admin->name} assigned Designer(s): {$dNames}",
                        fieldName: 'designer_ids',
                        oldValue: 'Unassigned',
                        newValue: $dNames,
                        user: $admin
                    );
                }

                // AM assignment activity
                if (!empty($amArray)) {
                    $amNames = User::whereIn('id', $amArray)->pluck('name')->join(', ');
                    TaskActivityService::log(
                        task: $task,
                        eventType: 'people_assignment_changed',
                        description: "{$admin->name} assigned Account Manager(s): {$amNames}",
                        fieldName: 'account_manager',
                        oldValue: 'Unassigned',
                        newValue: $amNames,
                        user: $admin
                    );
                }

                // Status movement activity
                if ($tData['status'] !== 'New Task') {
                    TaskActivityService::log(
                        task: $task,
                        eventType: 'status_changed',
                        description: "{$admin->name} moved status to '{$tData['status']}'",
                        fieldName: 'status',
                        oldValue: 'New Task',
                        newValue: $tData['status'],
                        user: $admin
                    );
                }

                // Nested Subitems
                foreach ($tData['subitems'] as $sData) {
                    $subStatusCol = $statusMap[$sData['status']] ?? $statusMap['New Task'];
                    $subIsDone = $sData['status'] === 'Done';

                    $subDesigners = is_array($sData['designer_id'])
                        ? $sData['designer_id']
                        : ($sData['designer_id'] ? [$sData['designer_id']] : []);
                    $subPrimary = $subDesigners[0] ?? null;

                    $sub = KanbanTask::firstOrCreate(
                        [
                            'board_id' => $board->id,
                            'parent_id' => $task->id,
                            'title' => $sData['title'],
                        ],
                        [
                            'group_id' => $group->id,
                            'column_id' => $subStatusCol->id,
                            'assigned_to' => $subPrimary,
                            'due_date' => $sData['deadline'] ?? null,
                            'due_time' => isset($sData['deadline']) ? '17:00:00' : null,
                            'progress' => $subIsDone ? 100 : ($sData['status'] === 'Working on it' ? 50 : ($sData['status'] === 'For Review' ? 85 : 0)),
                            'completed_at' => $subIsDone ? $now : null,
                            'custom_values' => [
                                'designer_ids' => $subDesigners,
                                'sub_designer' => $subDesigners,
                                'person' => $subDesigners,
                                'sub_deadline' => $sData['deadline'] ?? null,
                                'sub_status' => $sData['status'] ?? 'New Task',
                                'sub_task_type' => $sData['task_type'] ?? 'Design Phase',
                                'sub_internal_revision' => $sData['internal_revision'] ?? '',
                                'sub_client_revision' => $sData['client_revision'] ?? '',
                                'sub_client_requests' => $sData['client_requests'] ?? '',
                            ],
                            'created_by' => $admin->id,
                        ]
                    );

                    $sub->update([
                        'assigned_to' => $subPrimary,
                        'due_date' => $sData['deadline'] ?? $sub->due_date,
                        'custom_values' => array_merge($sub->custom_values ?? [], [
                            'designer_ids' => $subDesigners,
                            'sub_designer' => $subDesigners,
                            'person' => $subDesigners,
                            'sub_deadline' => $sData['deadline'] ?? $sub->due_date,
                            'sub_status' => $sData['status'] ?? 'New Task',
                            'sub_task_type' => $sData['task_type'] ?? 'Design Phase',
                            'sub_internal_revision' => $sData['internal_revision'] ?? '',
                            'sub_client_revision' => $sData['client_revision'] ?? '',
                            'sub_client_requests' => $sData['client_requests'] ?? '',
                        ]),
                    ]);

                    TaskActivityService::log(
                        task: $task,
                        eventType: 'subitem_created',
                        description: "{$admin->name} added subtask '{$sData['title']}'",
                        fieldName: 'subitems',
                        newValue: $sData['title'],
                        user: $admin
                    );
                }

                // Sample production update / comment
                $commentUserId = !empty($amArray) ? $amArray[0] : (!empty($designerArray) ? $designerArray[0] : $admin->id);
                if ($tData['status'] === 'Hold') {
                    $comment = KanbanComment::firstOrCreate(
                        [
                            'task_id' => $task->id,
                            'user_id' => $commentUserId,
                            'message' => 'Client requested temporary hold awaiting high-resolution raw footage files from their internal server.',
                        ]
                    );
                    TaskActivityService::log(
                        task: $task,
                        eventType: 'comment_added',
                        description: "{$comment->user?->name} posted an update on the hold status",
                        fieldName: 'comments',
                        user: $comment->user
                    );
                } elseif ($tData['status'] === 'For Review') {
                    $comment = KanbanComment::firstOrCreate(
                        [
                            'task_id' => $task->id,
                            'user_id' => $commentUserId,
                            'message' => 'First cut ready for Account Manager & creative director inspection. Check color grading and typography placement.',
                        ]
                    );
                    TaskActivityService::log(
                        task: $task,
                        eventType: 'comment_added',
                        description: "{$comment->user?->name} posted review readiness notes",
                        fieldName: 'comments',
                        user: $comment->user
                    );
                } elseif ($tData['status'] === 'Needs Revision') {
                    $comment = KanbanComment::firstOrCreate(
                        [
                            'task_id' => $task->id,
                            'user_id' => $commentUserId,
                            'message' => 'Client requested adjusting the background gradient to match their updated brand swatch #579BFC.',
                        ]
                    );
                    TaskActivityService::log(
                        task: $task,
                        eventType: 'comment_added',
                        description: "{$comment->user?->name} posted client revision instructions",
                        fieldName: 'comments',
                        user: $comment->user
                    );
                }
            }
        }
    }
}
