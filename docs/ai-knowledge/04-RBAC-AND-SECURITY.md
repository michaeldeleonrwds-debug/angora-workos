# 04 — RBAC & Security

## Step 1A: global roles

Angora uses Spatie Laravel Permission v6 for global roles and registered capabilities. `User` uses `HasRoles`; the former `users.role` value is retained in `users.legacy_role` for audit and rollback only. Authorization reads Spatie assignments. Workspace and board membership roles remain in their existing tables and are separate from global roles. Spatie Teams is disabled.

The migration retains the legacy `permissions`, `role_permissions`, and `user_permissions` tables. New grants live in `roles`, `spatie_permissions`, `model_has_roles`, `model_has_permissions`, and `role_has_permissions`. Registered capability names come from reviewed migrations and seeders. The RBAC interface accepts permission IDs from this catalog; it cannot create executable permission strings.

## Governance

Only an active Super Admin or an active Admin with `rbac.manage` may open RBAC administration. Admin can create custom roles, assign permitted roles to other users, and grant registered delegable permissions. Admin cannot edit the protected Super Admin or Admin roles, assign them, change their holders, alter their own role, or grant protected capabilities. `rbac.manage`, `permissions.manage`, and `system.settings.manage` are protected; only the Super Admin role receives the latter two. The final active Super Admin cannot be demoted or suspended.

The legacy `admin_manager` matrix included `rbac.manage`. That grant is deliberately excluded during cutover. This is an intentional access reduction.

## Resource authorization

Spatie grants are necessary but never sufficient for a task or board operation. Laravel policies check workspace and board access, task assignment, target stage ownership, archived stages, dependency blockers, and review restrictions. A board member's local role does not become a global role. Child work-category assignment counts for parent task movement.

Important registered Work OS capabilities include `workos.boards.manage`, `workos.tasks.create`, `workos.tasks.update`, `workos.tasks.update.assigned`, `workos.tasks.move.any`, `workos.tasks.move.assigned`, `workos.tasks.review.submit`, `workos.tasks.review.decide`, and `workos.tasks.export`. The reviewed default grants are defined in `App\Support\RbacCapabilityCatalog`. Custom roles can receive delegable grants through the existing RBAC page.

Employees with only assigned-task capabilities cannot edit privileged metadata, manage board configuration, jump to completion, or approve their own work. A board or workspace manager still needs the relevant global capability. Review decisions require another reviewer, including when a manager submitted the cycle.

The UI receives capability-aware controls through `HandleInertiaRequests` and `WorkOsPermissionService`. The backend independently enforces every mutation. Client visibility remains bounded by explicit board access and client-specific task access; internal production records are not exposed through a global permission alone.

## Migration and rollback

See [[handoffs/step-1a-spatie-rbac-migration]] for the verified backup, restored-copy rehearsal, role comparison, rollout, and rollback procedure.

## Next milestones

Step 1B dynamic transitions, review routing, client handoffs, S3/MinIO storage, Reverb, and chat require separate approval. A future Super Admin settings milestone may configure S3/MinIO and SMTP securely; Step 1A only registers `system.settings.manage`. No storage or mail credentials belong in source control or this vault.
