# Angora Work OS — Architectural & QA Context (Public LLM Context)

## Project Profile
- **Project**: Angora Work OS
- **Domain**: Creative Agency & Video Production Operating System
- **Stack**: Laravel 12 (PHP 8.2+), React 19, TypeScript, Inertia.js, Tailwind CSS v4, SQLite/MySQL
- **Milestone**: Phase 5 Complete & Verified (203 PHPUnit tests passing). Phase 6 Strictly Unstarted.

## Architectural Principles
1. **Deny-by-Default RBAC**:
   - Workspace or board membership grants zero default editing authority.
   - Designer role can only move cards assigned to them through permitted stages (`not_started` -> `in_progress` -> `in_review`).
   - Designers cannot bypass review cycles to reach `completed`.
2. **Shared Hosting Constraints**:
   - Zero Redis requirement (`CACHE_STORE=file/database`, `SESSION_DRIVER=database`, `QUEUE_CONNECTION=sync/database`).
   - Zero persistent daemon processes; background tasks run via standard cPanel cron (`php artisan schedule:run`).
3. **UI Layout Standards**:
   - 4-Row Header hierarchy: Row 1 Global App Bar, Row 2 Board Identity, Row 3 View Tabs, Row 4 Canvas.
   - Task Details Modal: Dual experience separating privileged manager forms from a Monday.com-inspired two-column employee panel (`EmployeeTaskPanel.tsx`).

## QA Verification Standards
- Full test suite: `php artisan test --filter=WorkOs` (must have 0 failures).
- TypeScript static check: `npm run types` (must have 0 errors).
- Production build: `npm run build` (must compile cleanly).
