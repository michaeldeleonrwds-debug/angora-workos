# 10 — Known Issues & Architectural Nuances

## 1. Project Manager Data Model Gap
- **Issue**: The `kanban_tasks` table does not have an explicit `project_manager_id` foreign key column.
- **Current Behavior**: Project Manager assignments are stored dynamically in `custom_values->project_manager` or board `people` columns.
- **Resolution in UI**: The redesigned [[07-FRONTEND-DESIGN|EmployeeTaskPanel.tsx]] inspects both `custom_values` and board columns, safely falling back to displaying `"Not assigned"` without fabricating users.
- **Recommendation for Phase 6**: When Phase 6 begins, consider a dedicated database migration adding `project_manager_id` with foreign key constraints.

---

## 2. In-Memory SQLite vs MySQL in Tests
- SQLite in-memory databases are used during `php artisan test` (`RefreshDatabase`).
- Ensure all custom column queries and JSON operators (`->` and `json_extract`) remain compatible with both SQLite and MySQL 8.0+.
- Avoid MySQL-specific window functions or SQLite-specific PRAGMA commands in application controllers.

---

## 3. Deadline Exact Countdown Boundary Nuance
- Previously, deadlines within 48 hours were grouped into a generic "Due Soon" bucket.
- This was resolved by computing exact remaining hours/days:
  - `< 24 hours`: Exact hours remaining (`Due in 5h`).
  - `24–48 hours`: Exact days remaining (`Due in 1d` or `Due in 2d`).
  - `< 0 hours`: `Xh overdue`.

---

## 4. Unassigned Tasks & Designer Movement
- Under the deny-by-default model, Designers cannot move tasks that have no assignees.
- **Workflow Requirement**: A Project Manager or Admin must assign the task to the Designer before the Designer can drag it into `in_progress` or `in_review`.
