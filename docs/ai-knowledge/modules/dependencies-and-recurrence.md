# Module: Dependencies & Recurrence

## 1. Overview
This module handles work order precedence and automated task scheduling:
1. **Task Dependencies (`TaskDependency`)**: Models blockers (`blocked_by`) and symmetrical relationships (`related_to`).
2. **Task Recurrence (`TaskRecurrenceRule`)**: Automated task creation on fixed intervals or upon task completion.

---

## 2. Dependency Rules & Cycle Prevention
- **Cycle Detection**: Before establishing a dependency, `TaskDependencyService` runs a depth-first search (DFS) over the workspace dependency graph. Any dependency that would create a circular loop (`A -> B -> C -> A`) is rejected with a `422 Unprocessable Entity`.
- **Self-Dependency**: Tasks cannot depend on themselves.
- **Workspace Scoping**: Both tasks must reside within the same workspace.
- **Blocker Status**: Tasks with unresolved blockers display a blocked indicator on Kanban cards and in `ItemDetailDrawer`.

---

## 3. Recurrence Engine & Artisan Command
- Supported frequencies: `daily`, `weekly`, `monthly`, `on_completion`.
- Execution command:
  ```bash
  php artisan kanban:process-recurrence
  ```
  Evaluates active rules where `next_run_at <= now()` and creates clone instances with incremented schedules.

---

## 4. Key Cross-References
- Model schemas: [[03-DATABASE-AND-MODELS]]
- Feature tests: `WorkOsPhase5TaskDependenciesTest.php`, `WorkOsPhase5TaskRecurrenceTest.php`
