<?php

namespace App\Support;

final class RbacCapabilityCatalog
{
    /**
     * The seven authoritative global system roles in Angora Work OS.
     *
     * @return array<string, string>
     */
    public static function roles(): array
    {
        return [
            'super_admin' => 'Super Admin',
            'admin' => 'Admin',
            'account_manager' => 'Account Manager',
            'project_manager' => 'Project Manager',
            'employee' => 'Employee',
            'designer' => 'Designer',
            'developer' => 'Developer',
        ];
    }

    /**
     * Active capability catalog organized strictly around the application domains.
     *
     * @return array<string, array{label: string, department: string, roles: list<string>, is_protected?: bool, is_delegable?: bool}>
     */
    public static function capabilities(): array
    {
        $governors = ['super_admin', 'admin'];
        $producers = [...$governors, 'project_manager'];
        $liaisons = [...$producers, 'account_manager'];
        $contributors = ['employee', 'designer', 'developer'];
        $allActive = [...$liaisons, ...$contributors];

        return [
            // 1. Dashboard
            'dashboard.view' => [
                'label' => 'View Work OS Dashboard',
                'department' => 'Dashboard',
                'roles' => $allActive,
            ],

            // 2. Workspaces
            'workspaces.manage' => [
                'label' => 'Manage Workspaces',
                'department' => 'Workspaces',
                'roles' => $governors,
            ],

            // 3. Boards
            'workos.boards.manage' => [
                'label' => 'Manage Authorized Boards & Settings',
                'department' => 'Boards',
                'roles' => $liaisons,
            ],
            'workos.tasks.export' => [
                'label' => 'Export Board Data (CSV/JSON)',
                'department' => 'Boards',
                'roles' => $allActive,
            ],

            // 4. Kanban Columns
            'kanban.columns.manage' => [
                'label' => 'Configure Columns & Workflow Stages',
                'department' => 'Kanban Columns',
                'roles' => $producers,
            ],

            // 5. Tasks
            'workos.tasks.create' => [
                'label' => 'Create Tasks on Authorized Boards',
                'department' => 'Tasks',
                'roles' => $liaisons,
            ],
            'workos.tasks.update' => [
                'label' => 'Update Task Metadata & Details',
                'department' => 'Tasks',
                'roles' => $liaisons,
            ],
            'workos.tasks.delete' => [
                'label' => 'Delete Authorized Tasks',
                'department' => 'Tasks',
                'roles' => $producers,
            ],
            'workos.tasks.move.any' => [
                'label' => 'Move Any Task Across Permitted Stages',
                'department' => 'Tasks',
                'roles' => $producers,
            ],

            // 6. Assignments
            'workos.tasks.update.assigned' => [
                'label' => 'Update Assigned Task Progress & Subitems',
                'department' => 'Assignments',
                'roles' => $allActive,
            ],
            'workos.tasks.move.assigned' => [
                'label' => 'Move Assigned Tasks Through Allowed Stages',
                'department' => 'Assignments',
                'roles' => $allActive,
            ],

            // 7. Reviews
            'workos.tasks.review.submit' => [
                'label' => 'Submit Assigned Tasks for Review',
                'department' => 'Reviews',
                'roles' => $allActive,
            ],
            'workos.tasks.review.decide' => [
                'label' => 'Approve or Request Revisions on Reviews',
                'department' => 'Reviews',
                'roles' => $producers,
            ],

            // 8. Comments
            'tasks.comments.create' => [
                'label' => 'Post Comments and Reactions',
                'department' => 'Comments',
                'roles' => $allActive,
            ],

            // 9. Attachments
            'tasks.attachments.upload' => [
                'label' => 'Upload and Manage Task Attachments',
                'department' => 'Attachments',
                'roles' => $allActive,
            ],

            // 10. Notifications
            'notifications.view' => [
                'label' => 'View System Notifications',
                'department' => 'Notifications',
                'roles' => $allActive,
            ],

            // 11. Users
            'workos.users.view' => [
                'label' => 'View User Directory',
                'department' => 'Users',
                'roles' => $liaisons,
            ],
            'workos.users.manage' => [
                'label' => 'Manage User Accounts & Invitations',
                'department' => 'Users',
                'roles' => $governors,
            ],

            // 12. Roles & Permissions
            'rbac.manage' => [
                'label' => 'Manage RBAC Matrix & Role Permissions',
                'department' => 'Roles & Permissions',
                'roles' => $governors,
                'is_protected' => true,
                'is_delegable' => false,
            ],
            'permissions.manage' => [
                'label' => 'Manage Protected System Capabilities',
                'department' => 'Roles & Permissions',
                'roles' => ['super_admin'],
                'is_protected' => true,
                'is_delegable' => false,
            ],

            // 13. System Settings
            'system.settings.manage' => [
                'label' => 'Manage System Settings (S3 / SMTP)',
                'department' => 'System Settings',
                'roles' => ['super_admin'],
                'is_protected' => true,
                'is_delegable' => false,
            ],
        ];
    }

    /**
     * Backward-compatibility wrapper for Work OS capability list.
     *
     * @return array<string, array{label: string, roles: list<string>}>
     */
    public static function workOs(): array
    {
        return array_filter(
            self::capabilities(),
            fn ($k) => str_starts_with($k, 'workos.'),
            ARRAY_FILTER_USE_KEY
        );
    }
}
