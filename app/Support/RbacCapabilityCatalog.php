<?php

namespace App\Support;

final class RbacCapabilityCatalog
{
    /** @return array<string, array{label: string, roles: list<string>}> */
    public static function workOs(): array
    {
        $governors = ['super_admin', 'admin', 'admin_manager'];
        $producers = [...$governors, 'project_manager'];
        $liaisons = [...$producers, 'account_manager'];
        $contributors = ['designer', 'developer', 'dept_user', 'employee', 'production_staff', 'team_member'];

        return [
            'workos.users.view' => ['label' => 'View user directory', 'roles' => $liaisons],
            'workos.users.manage' => ['label' => 'Manage user accounts', 'roles' => $governors],
            'workos.boards.manage' => ['label' => 'Manage authorized boards', 'roles' => [...$liaisons, 'dept_user']],
            'workos.tasks.create' => ['label' => 'Create tasks on authorized boards', 'roles' => $liaisons],
            'workos.tasks.update' => ['label' => 'Update authorized task metadata', 'roles' => $liaisons],
            'workos.tasks.update.assigned' => ['label' => 'Update assigned tasks', 'roles' => [...$contributors, 'guest']],
            'workos.tasks.delete' => ['label' => 'Delete authorized tasks', 'roles' => $producers],
            'workos.tasks.move.any' => ['label' => 'Move tasks on authorized boards', 'roles' => $producers],
            'workos.tasks.move.assigned' => ['label' => 'Move assigned tasks', 'roles' => [...$liaisons, ...$contributors]],
            'workos.tasks.review.submit' => ['label' => 'Submit assigned tasks for review', 'roles' => [...$liaisons, ...$contributors]],
            'workos.tasks.review.decide' => ['label' => 'Approve or request revisions', 'roles' => $producers],
            'workos.tasks.export' => ['label' => 'Export authorized board data', 'roles' => [...$liaisons, 'dept_user', 'developer', 'employee', 'production_staff', 'team_member', 'hr_staff', 'sales_staff', 'marketing_staff', 'finance_staff']],
        ];
    }
}
