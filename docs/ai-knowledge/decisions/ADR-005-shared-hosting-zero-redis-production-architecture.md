# ADR-005: Shared-Hosting Zero-Redis Production Architecture

## Status
Accepted

## Context
Deploying enterprise agency platforms often involves complex infrastructure (Redis clusters, background daemon supervisors like Laravel Horizon, Node.js sidecars, VPS provisioning). However, Angora is targeted to run cost-effectively on standard shared cPanel hosting with zero dedicated sysadmin overhead.

## Decision
1. **Zero-Redis Architecture**:
   - Cache, Sessions, and Queues utilize `database` or `file` drivers.
   - Redis dependencies are forbidden across production services.
2. **Standard Cron Task Execution**:
   - Background workflows (recurrence, due-date warnings, invitations cleanup) are triggered by standard artisan commands invoked via cron every minute:
     `php artisan schedule:run`
3. **Synchronous Immediate Execution Fallbacks**:
   - Critical audit logs and notifications execute synchronously or gracefully fall back to the database queue.

## Consequences
- Guaranteed compatibility with standard shared hosting environments.
- Dramatically lowers hosting and operational expenses.
- Zero risk of zombie Redis processes or supervisor configuration mismatches.
