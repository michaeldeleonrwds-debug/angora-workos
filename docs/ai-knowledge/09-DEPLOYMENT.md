# 09 — Deployment direction

The intended production target is a VPS with PHP 8.3 or newer, Nginx/PHP-FPM, MariaDB/MySQL, Redis, persistent queue workers, the Laravel scheduler, Laravel Reverb, and a private Amazon S3 bucket over HTTPS. The VPS has not been provisioned. Step 1A does not install or require Redis, Reverb, S3, or a new queue worker.

Composer still declares `php: ^8.2`. The selected `spatie/laravel-permission` v6 package is compatible with this constraint. Confirm the actual VPS PHP runtime and extensions before deployment; do not change the Composer minimum silently.

## Deployment gates

1. Take a recoverable database backup and verify its integrity.
2. Rehearse database migrations and rollback against a restored copy.
3. Run focused security tests, Work OS tests, the full Laravel suite, TypeScript checks, and a frontend build.
4. Deploy code and dependencies with the migration sequence in [[handoffs/step-1a-spatie-rbac-migration]].
5. Run `php artisan migrate --force`, clear and rebuild Laravel permission/config caches, and verify role assignments and access.
6. Keep automated database and object-storage backups, monitoring, logs, and recovery procedures in the VPS plan.

Local EnvKit MinIO is intended for a later S3-compatible storage milestone. Production will use private Amazon S3 through Laravel's filesystem abstraction. Storage credentials, SMTP credentials, and other secrets must stay outside Git and Obsidian. A future protected Super Admin settings page is planned for authorized S3/MinIO and SMTP configuration; `system.settings.manage` is registered in Step 1A without implementing the settings page.

The former shared-hosting design is historical context in [[decisions/ADR-005-shared-hosting-zero-redis-production-architecture]] and is no longer the production target.
