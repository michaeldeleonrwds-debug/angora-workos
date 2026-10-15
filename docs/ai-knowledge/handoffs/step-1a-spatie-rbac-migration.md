# Step 1A — Spatie RBAC migration and rollback

## Scope

Spatie Laravel Permission v6 adds database-managed global roles and registered capabilities. `users.role` becomes `users.legacy_role`; existing users, memberships, tasks, legacy RBAC tables, and historical progress data remain in place. Workspace and board roles stay separate. Spatie Teams is disabled.

## Local rehearsal, 15 October 2026

- Source database: `angora`; restored test copy: `angora_step1a_restore_20261015`.
- EnvKit snapshot ID: `20261015-051053`. The original and copy dump SHA-256 both equal `c9ba2b8d09f7c4f985628d3ee610295ba58e40bf546740b92d9c4a994100b700`.
- Before and after rehearsal: 8 users, 27 legacy permissions, 102 legacy role grants, 0 direct user grants, 18 workspace memberships, 0 board memberships, and 63 tasks.
- Legacy role distribution: 1 Super Admin, 1 Admin, 2 Project Managers, 4 department users. All 8 Spatie assignments match the corresponding `legacy_role`; no role mismatch.
- New schema contains 18 roles, 41 registered permissions, 8 user-role assignments, and 210 role-permission grants. All existing legacy role grants for actual user roles were retained. The Super Admin gained all registered capabilities. `admin_manager` intentionally loses the legacy `rbac.manage` grant.
- Both migrations were rolled back on the copy. `users.role` returned, with the old rows intact; Spatie tables were retained by design. Reapplying both migrations succeeded with the same counts and assignments.
- `RbacSeeder` was run twice on the copy with stable row counts. Existing grants are not overwritten by repeat runs.

## Local working database result

After the restored-copy migration and rollback rehearsal passed, the two Step 1A migrations were applied to the local `angora` database with `php artisan migrate --force`. Permission cache reset succeeded. The local database retained the same 8 users, 27 legacy permissions, 102 legacy role grants, 18 workspace memberships, 0 board memberships, and 63 tasks. The new tables contain 18 roles, 41 registered permissions, 8 user-role assignments, and 210 role-permission grants. All 8 assignments match `legacy_role`; historical progress values were not migrated or altered. No production database was changed.

## Working database rollout

1. Confirm a fresh, recoverable backup of the target database and record its hash. The local snapshot above protects this rehearsal; repeat the backup on the actual deployment target.
2. Restore the backup into a separate database and rehearse the exact release migrations there. Compare counts, role distribution, and representative effective access.
3. Deploy the matching code and Composer lockfile together. Do not serve mixed old/new code during the `users.role` rename.
4. Run `php artisan migrate --force`, then `php artisan permission:cache-reset` and application cache rebuild commands.
5. Compare `users.legacy_role` with `model_has_roles` for every user. Verify a Super Admin, Admin, PM, assigned employee, child-category assignee, and client through HTTP and browser checks. Verify unauthorized direct requests return 403.
6. Keep the backup and migration comparison until the release has passed a full operational review.

The demo `DatabaseSeeder` must not be run against production data. The cutover migration itself populates the Spatie catalog and assignments.

## Rollback

1. Put the application in maintenance mode and preserve a current backup before reversing anything.
2. While still running the Step 1A release code, run `php artisan migrate:rollback --step=2 --force` on the tested migration path. The down migrations rename `legacy_role` back to `role` and intentionally retain Spatie tables and assignments to avoid deleting new grants. Confirm the column and original role values.
3. Restore the previous application code and Composer dependencies together, rebuild caches, then exit maintenance mode. Do not serve either code version against the other version's user column.
4. If a later release has added migrations or new role edits, use the verified pre-cutover database backup as the recovery path instead of blindly rolling back two steps. Reconcile any post-backup changes separately.

Rollback was tested on the restored copy. It has not been exercised on an actual VPS because that host is not provisioned.
