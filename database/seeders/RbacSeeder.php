<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\RolePermission;
use App\Models\RbacPermission;
use App\Models\RbacRole;
use App\Support\RbacCapabilityCatalog;
use Illuminate\Database\Seeder;

class RbacSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Define all granular permissions across departments
        $permissions = [
            // Kanban
            ['name' => 'kanban.view', 'label' => 'View Kanban Boards', 'department' => 'Kanban', 'description' => 'Can view sprint boards and task lanes'],
            ['name' => 'kanban.create', 'label' => 'Create Kanban Tasks', 'department' => 'Kanban', 'description' => 'Can create and assign tasks'],
            ['name' => 'kanban.manage', 'label' => 'Manage Kanban Boards', 'department' => 'Kanban', 'description' => 'Can configure columns and delete tasks'],

            // HR
            ['name' => 'hr.view', 'label' => 'View HR Directory', 'department' => 'HR', 'description' => 'Can view employee directory and roster'],
            ['name' => 'hr.manage', 'label' => 'Manage Employees', 'department' => 'HR', 'description' => 'Can add/edit employees and compensation'],
            ['name' => 'hr.approve_leaves', 'label' => 'Approve Leave Applications', 'department' => 'HR', 'description' => 'Can approve or reject time-off requests'],

            // Production
            ['name' => 'production.view', 'label' => 'View Production Orders', 'department' => 'Production', 'description' => 'Can view work orders and assembly lines'],
            ['name' => 'production.manage', 'label' => 'Manage Work Orders', 'department' => 'Production', 'description' => 'Can create work orders and update status'],
            ['name' => 'production.qc', 'label' => 'Quality Control Inspections', 'department' => 'Production', 'description' => 'Can record QA tests and log defects'],

            // Sales CRM
            ['name' => 'sales.view', 'label' => 'View Sales Pipeline', 'department' => 'Sales', 'description' => 'Can view deals and customer directory'],
            ['name' => 'sales.manage', 'label' => 'Manage Deals & Accounts', 'department' => 'Sales', 'description' => 'Can create customers and advance deals'],
            ['name' => 'sales.invoices', 'label' => 'Issue Quotations & Invoices', 'department' => 'Sales', 'description' => 'Can create and send client billing'],

            // Marketing
            ['name' => 'marketing.view', 'label' => 'View Campaigns', 'department' => 'Marketing', 'description' => 'Can view campaigns and content calendar'],
            ['name' => 'marketing.manage', 'label' => 'Manage Campaigns', 'department' => 'Marketing', 'description' => 'Can create campaigns and schedule content'],

            // Finance
            ['name' => 'finance.view', 'label' => 'View Budgets & Ledgers', 'department' => 'Finance', 'description' => 'Can view department budgets and AP/AR'],
            ['name' => 'finance.manage', 'label' => 'Manage Ledgers', 'department' => 'Finance', 'description' => 'Can record transactions and update caps'],
            ['name' => 'finance.approve_expenses', 'label' => 'Approve Expense Claims', 'department' => 'Finance', 'description' => 'Can approve or reject employee claims'],

            // Operations
            ['name' => 'operations.view', 'label' => 'View Operations', 'department' => 'Operations', 'description' => 'Can view workflows and service tickets'],
            ['name' => 'operations.manage', 'label' => 'Manage Workflows', 'department' => 'Operations', 'description' => 'Can initiate workflows and resolve tickets'],

            // Compliance & Risk
            ['name' => 'compliance.view', 'label' => 'View Policies & Risks', 'department' => 'Compliance', 'description' => 'Can view ISO policies and risk matrix'],
            ['name' => 'compliance.manage', 'label' => 'Manage Compliance', 'department' => 'Compliance', 'description' => 'Can register risk assessments and log incidents'],

            // Documents
            ['name' => 'documents.view', 'label' => 'View Document Vault', 'department' => 'Documents', 'description' => 'Can browse and download documents'],
            ['name' => 'documents.upload', 'label' => 'Upload Documents', 'department' => 'Documents', 'description' => 'Can upload new documents and revisions'],
            ['name' => 'documents.manage', 'label' => 'Manage Document Vault', 'department' => 'Documents', 'description' => 'Can move documents to trash and restore'],

            // Analytics
            ['name' => 'analytics.view', 'label' => 'View Analytics Telemetry', 'department' => 'Analytics', 'description' => 'Can view executive BI telemetry & export'],

            // Governance
            ['name' => 'audit_logs.view', 'label' => 'View Audit Trail', 'department' => 'Governance', 'description' => 'Can inspect immutable system event logs'],
            ['name' => 'rbac.manage', 'label' => 'Manage RBAC Permissions', 'department' => 'System', 'description' => 'Can manage roles and assign permissions'],
        ];

        foreach ($permissions as $p) {
            Permission::updateOrCreate(['name' => $p['name']], $p);
        }

        // 2. Map default permissions per role
        $rolePermissionMap = [
            'admin_manager' => [
                'kanban.view', 'kanban.create', 'kanban.manage',
                'hr.view', 'hr.manage', 'hr.approve_leaves',
                'production.view', 'production.manage', 'production.qc',
                'sales.view', 'sales.manage', 'sales.invoices',
                'marketing.view', 'marketing.manage',
                'finance.view', 'finance.manage', 'finance.approve_expenses',
                'operations.view', 'operations.manage',
                'compliance.view', 'compliance.manage',
                'documents.view', 'documents.upload', 'documents.manage',
                'analytics.view', 'audit_logs.view', 'rbac.manage',
            ],
            'dept_user' => [
                'kanban.view', 'kanban.create',
                'operations.view', 'operations.manage',
                'documents.view', 'documents.upload',
            ],
            'hr_staff' => [
                'hr.view', 'hr.manage', 'hr.approve_leaves',
                'kanban.view', 'kanban.create',
                'documents.view', 'documents.upload',
            ],
            'production_staff' => [
                'production.view', 'production.manage', 'production.qc',
                'kanban.view', 'kanban.create',
                'documents.view', 'documents.upload',
            ],
            'sales_staff' => [
                'sales.view', 'sales.manage', 'sales.invoices',
                'kanban.view', 'kanban.create',
                'documents.view', 'documents.upload',
            ],
            'marketing_staff' => [
                'marketing.view', 'marketing.manage',
                'kanban.view', 'kanban.create',
                'documents.view', 'documents.upload',
            ],
            'finance_staff' => [
                'finance.view', 'finance.manage', 'finance.approve_expenses',
                'sales.view',
                'kanban.view', 'kanban.create',
                'documents.view', 'documents.upload',
                'analytics.view',
            ],
            'team_member' => [
                'kanban.view', 'kanban.create',
                'documents.view',
                'operations.view',
            ],
            'external_user' => [
                'sales.view',
                'documents.view',
            ],
        ];

        // Seed historical defaults once. Re-running the seeder must not restore
        // a permission that an administrator deliberately revoked later.
        $rolesNeedingDefaults = [];
        foreach (array_keys($rolePermissionMap) as $roleName) {
            $rolesNeedingDefaults[$roleName] = ! RolePermission::where('role', $roleName)->exists();
        }

        foreach ($rolePermissionMap as $role => $perms) {
            foreach ($perms as $permName) {
                $permission = Permission::where('name', $permName)->first();
                if ($permission) {
                    RolePermission::firstOrCreate([
                        'role' => $role,
                        'permission_id' => $permission->id,
                    ]);
                }
            }
        }

        // Keep the legacy catalog intact while seeding the authoritative Spatie catalog.
        foreach ($permissions as $definition) {
            RbacPermission::updateOrCreate(
                ['name' => $definition['name'], 'guard_name' => 'web'],
                $definition + [
                    'guard_name' => 'web',
                    'is_protected' => $definition['name'] === 'rbac.manage',
                    'is_delegable' => $definition['name'] !== 'rbac.manage',
                ]
            );
        }
        foreach (['permissions.manage', 'system.settings.manage'] as $name) {
            RbacPermission::firstOrCreate(
                ['name' => $name, 'guard_name' => 'web'],
                ['label' => $name, 'department' => 'System', 'is_protected' => true, 'is_delegable' => false]
            );
        }
        foreach (RbacCapabilityCatalog::workOs() as $name => $capability) {
            RbacPermission::firstOrCreate(
                ['name' => $name, 'guard_name' => 'web'],
                ['label' => $capability['label'], 'department' => 'Work OS', 'is_protected' => false, 'is_delegable' => true]
            );
        }

        foreach (array_unique(array_merge(array_keys($rolePermissionMap), [
            'super_admin', 'admin', 'project_manager', 'account_manager',
            'employee', 'designer', 'developer', 'client', 'guest',
        ])) as $name) {
            RbacRole::firstOrCreate(
                ['name' => $name, 'guard_name' => 'web'],
                ['is_system' => true, 'is_protected' => in_array($name, ['super_admin', 'admin'], true)]
            );
        }

        foreach ($rolePermissionMap as $name => $grants) {
            if (! $rolesNeedingDefaults[$name]) {
                continue;
            }
            $role = RbacRole::findByName($name, 'web');
            foreach ($grants as $grant) {
                if ($grant !== 'rbac.manage') {
                    $role->givePermissionTo($grant);
                }
            }
        }
        $superAdmin = RbacRole::findByName('super_admin', 'web');
        foreach (RbacPermission::all() as $permission) {
            $superAdmin->givePermissionTo($permission);
        }
        RbacRole::findByName('admin', 'web')->givePermissionTo('rbac.manage');
    }
}
