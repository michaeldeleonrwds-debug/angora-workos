<?php

namespace Database\Seeders;

use App\Models\AgencyProject;
use App\Models\BoardColumn;
use App\Models\BoardGroup;
use App\Models\BoardMember;
use App\Models\BoardView;
use App\Models\ClientContact;
use App\Models\KanbanAttachment;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanComment;
use App\Models\KanbanTask;
use App\Models\ProjectDeliverable;
use App\Models\SalesCustomer;
use App\Models\TaskReviewCycle;
use App\Models\TaskReviewDecision;
use App\Models\TaskReviewStage;
use App\Models\User;
use App\Models\Workspace;
use App\Models\WorkspaceMember;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ClientPortalDemoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * STRICT SAFETY RULE: Local development and testing only. Never run in production.
     */
    public function run(): void
    {
        if (! app()->environment('local', 'testing')) {
            $this->command?->warn('ClientPortalDemoSeeder skipped: only allowed in local/testing environment.');
            return;
        }

        // 1. Establish or resolve Customer Account
        $customer = SalesCustomer::firstOrCreate(
            ['email' => 'client@apex.test'],
            [
                'name' => 'Alex Vance (Apex Client)',
                'company' => 'Apex Global Industries',
                'company_name' => 'Apex Global Industries',
                'phone' => '+1 (555) 839-2041',
                'city' => 'San Francisco',
                'status' => 'active',
                'total_spend' => 45000.00,
                'portal_access_enabled' => true,
            ]
        );

        // Ensure company is populated
        if (empty($customer->company)) {
            $customer->update(['company' => 'Apex Global Industries']);
        }

        // 2. Resolve Account Manager and Project Manager
        $am = User::role('account_manager')->first() ?? User::role('admin')->first() ?? User::first();
        $pm = User::role('project_manager')->first() ?? User::role('admin')->first() ?? User::first();
        $designer = User::role('designer')->first() ?? User::first();

        $customer->update(['account_manager_id' => $am?->id]);

        // 3. Create or resolve Test Client User (EXTERNAL PORTAL IDENTITY, NO INTERNAL SPATIE ROLE)
        $testPassword = env('TEST_CLIENT_PASSWORD', 'Client2026!Demo#Secure');
        $clientUser = User::firstOrCreate(
            ['email' => 'client.demo@apex.test'],
            [
                'name' => 'Alex Vance',
                'password' => Hash::make($testPassword),
                'department' => 'Client External',
                'status' => 'active',
            ]
        );

        // Ensure no internal Spatie roles are assigned to the external client identity
        $clientUser->syncRoles([]);

        // Link user to customer profile & client contacts
        $customer->update(['user_id' => $clientUser->id, 'portal_access_enabled' => true]);

        ClientContact::firstOrCreate(
            ['client_id' => $customer->id, 'user_id' => $clientUser->id],
            ['role' => 'Decision Maker', 'is_active' => true]
        );

        // 4. Find production board
        $prodBoard = KanbanBoard::where('title', 'like', '%Production%Demo%')->first()
            ?? KanbanBoard::where('title', 'like', '%Production%')->first()
            ?? KanbanBoard::first();

        // 5. Create Dedicated Client Review Board linked to Production Board
        $workspace = Workspace::firstOrCreate(
            ['name' => 'Apex Client Portal Workspace'],
            [
                'description' => 'Dedicated client review workspace for Apex Global Industries',
                'owner_id' => $pm?->id ?? $clientUser->id,
                'color' => '#6366f1',
                'icon' => 'briefcase',
                'is_favorite' => false,
            ]
        );

        WorkspaceMember::firstOrCreate(
            ['workspace_id' => $workspace->id, 'user_id' => $clientUser->id],
            ['role' => 'member']
        );

        $clientBoard = KanbanBoard::firstOrCreate(
            [
                'workspace_id' => $workspace->id,
                'title' => 'Apex Dynamics — Client Review Board',
            ],
            [
                'description' => 'Dedicated client portal review board linked to Angora Production — Demo.',
                'department' => 'Client Portal',
                'visibility' => 'private',
                'settings' => [
                    'client_id' => $customer->id,
                    'linked_production_board_id' => $prodBoard?->id,
                ],
                'created_by' => $pm?->id ?? $clientUser->id,
            ]
        );

        BoardMember::firstOrCreate(
            ['board_id' => $clientBoard->id, 'user_id' => $clientUser->id],
            ['role' => 'viewer']
        );

        // Client board status columns
        $clientCols = [
            ['title' => 'Awaiting Approval', 'color' => '#579BFC', 'semantic' => 'in_review', 'key' => 'client_under_review', 'pos' => 0],
            ['title' => 'Needs Revision', 'color' => '#FF642E', 'semantic' => 'in_progress', 'key' => 'for_revision', 'pos' => 1],
            ['title' => 'Approved', 'color' => '#00C875', 'semantic' => 'completed', 'key' => 'complete', 'pos' => 2],
        ];

        foreach ($clientCols as $cc) {
            KanbanColumn::firstOrCreate(
                ['board_id' => $clientBoard->id, 'title' => $cc['title']],
                [
                    'color' => $cc['color'],
                    'semantic_category' => $cc['semantic'],
                    'stage_key' => $cc['key'],
                    'position' => $cc['pos'],
                ]
            );
        }

        BoardView::firstOrCreate(
            ['board_id' => $clientBoard->id, 'name' => 'Client Kanban'],
            ['type' => 'kanban', 'is_default' => true, 'is_system' => true, 'position' => 0]
        );

        // 6. Agency Project
        $project = AgencyProject::firstOrCreate(
            ['name' => 'Apex Q4 Omnichannel Marketing Campaign'],
            [
                'client_id' => $customer->id,
                'board_id' => $prodBoard?->id,
                'project_manager_id' => $pm?->id,
                'project_leader_id' => $pm?->id,
                'status' => 'In Progress',
                'priority' => 'High',
                'start_date' => now()->subDays(14)->toDateString(),
                'due_date' => now()->addDays(21)->toDateString(),
                'budget' => 45000.00,
                'client_visible' => true,
            ]
        );

        // 7. Seed Demo Tasks on Production Board covering all three states
        if ($prodBoard) {
            $colClientReview = $prodBoard->columns()->where('stage_key', 'client_under_review')->first();
            $colNewTask = $prodBoard->columns()->where('stage_key', 'new_task')->first();
            $colComplete = $prodBoard->columns()->where('stage_key', 'complete')->first();

            // Task 1: AWAITING CLIENT APPROVAL
            $taskAwaiting = KanbanTask::firstOrCreate(
                [
                    'board_id' => $prodBoard->id,
                    'title' => 'APEX — Brand Launch Motion Graphics Package',
                ],
                [
                    'column_id' => $colClientReview?->id ?? $prodBoard->columns()->first()?->id,
                    'client_id' => $customer->id,
                    'description' => 'Full suite of 4K animated brand stings, lower thirds, and video transition cards.',
                    'priority' => 'Urgent',
                    'due_date' => now()->addDays(5)->toDateString(),
                    'client_deadline' => now()->addDays(4)->toDateString(),
                    'assigned_to' => $designer?->id,
                    'created_by' => $pm?->id ?? $am?->id,
                    'is_client_visible' => true,
                    'client_review_status' => 'submitted',
                    'internal_revision_count' => 1,
                    'client_revision_count' => 0,
                    'progress' => 85,
                ]
            );

            // Update in case it existed
            $taskAwaiting->update([
                'column_id' => $colClientReview?->id ?? $taskAwaiting->column_id,
                'client_id' => $customer->id,
                'is_client_visible' => true,
                'client_review_status' => 'submitted',
                'client_deadline' => now()->addDays(4)->toDateString(),
            ]);

            // Review cycle for Task 1
            $cycleAwaiting = TaskReviewCycle::firstOrCreate(
                [
                    'task_id' => $taskAwaiting->id,
                    'review_type' => 'client',
                    'round_number' => 1,
                ],
                [
                    'client_id' => $customer->id,
                    'submitted_by' => $pm?->id ?? $am?->id,
                    'state' => 'pending',
                    'total_stages' => 1,
                    'current_stage_index' => 1,
                    'notes' => 'Internal quality checks passed. Ready for official client signoff.',
                    'submitted_at' => now()->subHours(4),
                ]
            );

            TaskReviewStage::firstOrCreate(
                ['review_cycle_id' => $cycleAwaiting->id, 'stage_index' => 1],
                ['name' => 'Client Approval', 'required_role' => 'client', 'status' => 'in_progress']
            );

            ProjectDeliverable::firstOrCreate(
                ['project_id' => $project->id, 'task_id' => $taskAwaiting->id, 'version' => 1],
                [
                    'title' => 'Brand Launch 4K Motion Package',
                    'description' => 'Comprehensive motion assets ready for broadcast & digital ad rollout.',
                    'external_url' => 'https://vimeo.com/demo-apex-motion-v1',
                    'status' => 'approved_for_client',
                    'submitted_by' => $designer?->id,
                    'reviewed_by' => $pm?->id,
                    'is_client_visible' => true,
                    'approved_for_client_at' => now()->subHours(4),
                    'client_status' => 'pending',
                ]
            );

            // Comments on Task 1 (one internal, one client-visible)
            KanbanComment::firstOrCreate(
                ['task_id' => $taskAwaiting->id, 'message' => 'Internal note: Sound design mastered at -14 LUFS. Art Director approved.'],
                ['user_id' => $pm?->id, 'is_client_visible' => false]
            );

            KanbanComment::firstOrCreate(
                ['task_id' => $taskAwaiting->id, 'message' => 'Delivered 4K motion graphics assets ready for your review and signoff!'],
                ['user_id' => $pm?->id, 'is_client_visible' => true]
            );

            // Attachments on Task 1 (one internal, one client-visible)
            KanbanAttachment::firstOrCreate(
                ['task_id' => $taskAwaiting->id, 'file_name' => 'raw_project_internal_qc.json'],
                [
                    'user_id' => $pm?->id,
                    'file_path' => 'attachments/kanban/raw_project_internal_qc.json',
                    'file_size_bytes' => 14200,
                    'mime_type' => 'application/json',
                    'is_client_visible' => false,
                ]
            );

            KanbanAttachment::firstOrCreate(
                ['task_id' => $taskAwaiting->id, 'file_name' => 'Apex_Brand_Launch_Preview.mp4'],
                [
                    'user_id' => $designer?->id,
                    'file_path' => 'attachments/kanban/Apex_Brand_Launch_Preview.mp4',
                    'file_size_bytes' => 18450000,
                    'mime_type' => 'video/mp4',
                    'is_client_visible' => true,
                ]
            );

            // Task 2: REVISION REQUESTED / SENT BACK TO PRODUCTION
            $taskRevision = KanbanTask::firstOrCreate(
                [
                    'board_id' => $prodBoard->id,
                    'title' => 'APEX — Responsive Landing Page Hero Banner',
                ],
                [
                    'column_id' => $colNewTask?->id ?? $prodBoard->columns()->first()?->id,
                    'client_id' => $customer->id,
                    'description' => 'High-converting responsive hero illustration and mobile layouts.',
                    'priority' => 'High',
                    'due_date' => now()->addDays(2)->toDateString(),
                    'client_deadline' => now()->addDays(3)->toDateString(),
                    'assigned_to' => $designer?->id,
                    'created_by' => $pm?->id ?? $am?->id,
                    'is_client_visible' => true,
                    'client_review_status' => 'revision_requested',
                    'internal_revision_count' => 0,
                    'client_revision_count' => 1,
                    'progress' => 50,
                ]
            );

            $taskRevision->update([
                'column_id' => $colNewTask?->id ?? $taskRevision->column_id,
                'client_id' => $customer->id,
                'is_client_visible' => true,
                'client_review_status' => 'revision_requested',
                'client_revision_count' => 1,
            ]);

            $cycleRevision = TaskReviewCycle::firstOrCreate(
                [
                    'task_id' => $taskRevision->id,
                    'review_type' => 'client',
                    'round_number' => 1,
                ],
                [
                    'client_id' => $customer->id,
                    'submitted_by' => $pm?->id ?? $am?->id,
                    'state' => 'revision_requested',
                    'client_feedback' => 'Please make the CTA button coral (#FF642E) and increase copy contrast on mobile screens.',
                    'total_stages' => 1,
                    'current_stage_index' => 1,
                    'submitted_at' => now()->subDays(1),
                    'resolved_at' => now()->subHours(6),
                ]
            );

            TaskReviewDecision::firstOrCreate(
                ['review_cycle_id' => $cycleRevision->id, 'decision' => 'revision_requested'],
                [
                    'reviewer_id' => $clientUser->id,
                    'feedback' => 'Please make the CTA button coral (#FF642E) and increase copy contrast on mobile screens.',
                    'decided_at' => now()->subHours(6),
                ]
            );

            // Task 3: FULLY APPROVED & COMPLETE
            $taskApproved = KanbanTask::firstOrCreate(
                [
                    'board_id' => $prodBoard->id,
                    'title' => 'APEX — Q4 Omnichannel Marketing Banner Set',
                ],
                [
                    'column_id' => $colComplete?->id ?? $prodBoard->columns()->last()?->id,
                    'client_id' => $customer->id,
                    'description' => 'Multi-format display banner kit (10 aspect ratios) for Q4 ad campaigns.',
                    'priority' => 'Medium',
                    'due_date' => now()->subDays(2)->toDateString(),
                    'client_deadline' => now()->subDays(3)->toDateString(),
                    'assigned_to' => $designer?->id,
                    'created_by' => $pm?->id ?? $am?->id,
                    'is_client_visible' => true,
                    'client_review_status' => 'approved',
                    'internal_revision_count' => 1,
                    'client_revision_count' => 1,
                    'completed_at' => now()->subDays(1),
                    'progress' => 100,
                ]
            );

            $taskApproved->update([
                'column_id' => $colComplete?->id ?? $taskApproved->column_id,
                'client_id' => $customer->id,
                'is_client_visible' => true,
                'client_review_status' => 'approved',
                'completed_at' => now()->subDays(1),
                'progress' => 100,
            ]);

            $cycleApproved = TaskReviewCycle::firstOrCreate(
                [
                    'task_id' => $taskApproved->id,
                    'review_type' => 'client',
                    'round_number' => 1,
                ],
                [
                    'client_id' => $customer->id,
                    'submitted_by' => $pm?->id ?? $am?->id,
                    'state' => 'approved',
                    'client_feedback' => 'Approved! All format exports look sharp and match our brand guidelines.',
                    'total_stages' => 1,
                    'current_stage_index' => 1,
                    'submitted_at' => now()->subDays(3),
                    'resolved_at' => now()->subDays(1),
                ]
            );

            TaskReviewDecision::firstOrCreate(
                ['review_cycle_id' => $cycleApproved->id, 'decision' => 'approved'],
                [
                    'reviewer_id' => $clientUser->id,
                    'feedback' => 'Approved! All format exports look sharp and match our brand guidelines.',
                    'decided_at' => now()->subDays(1),
                ]
            );

            ProjectDeliverable::firstOrCreate(
                ['project_id' => $project->id, 'task_id' => $taskApproved->id, 'version' => 1],
                [
                    'title' => 'Q4 Omnichannel Banner Asset Kit',
                    'description' => 'Final SVG and high-DPI raster assets for ad platforms.',
                    'external_url' => 'https://figma.com/demo-apex-banners-final',
                    'status' => 'client_approved',
                    'submitted_by' => $designer?->id,
                    'reviewed_by' => $pm?->id,
                    'is_client_visible' => true,
                    'approved_for_client_at' => now()->subDays(3),
                    'client_status' => 'approved',
                    'client_reviewed_at' => now()->subDays(1),
                ]
            );
        }

        $this->command?->info('========================================================');
        $this->command?->info('ANGORA WORK OS — TEST CLIENT CREDENTIALS (LOCAL DEV)');
        $this->command?->info('========================================================');
        $this->command?->info("Portal URL:  http://angora.test/client-portal");
        $this->command?->info("Email:       client.demo@apex.test");
        $this->command?->info("Password:    {$testPassword}");
        $this->command?->info("Client:      Alex Vance (Apex Global Industries)");
        $this->command?->info("Board:       Apex Dynamics — Client Review Board (ID: {$clientBoard->id})");
        $this->command?->info('========================================================');
    }
}
