# ADR-003: Assignment-Based Task Movement & Employee Filtering

## Status
Accepted (Enhancement to `245acd8`)

## Context
Following the deny-by-default lockdown, Designers were completely blocked from dragging Kanban cards, which prevented them from advancing legitimate assigned work through production stages. Additionally, boards defaulted to showing all agency tasks rather than focusing on the employee's assigned workload.

## Decision
1. Implemented `TaskPolicy::moveAssignedTask`:
   - Designers can drag cards and update stage columns **only for tasks assigned to them**.
   - Allowed stage transitions: `not_started` ➔ `in_progress` ➔ `in_review`.
   - Direct transitions to `completed` remain prohibited (must undergo PM review approval).
2. Added default employee filtering in `KanbanController::index`:
   - When a user with the `designer` role opens a board, the view defaults to filtering by their assigned user ID.
   - Preserves toggle to clear filters if authorized.

## Consequences
- Employees maintain high productivity without breaking security constraints.
- Prevents accidental modification or movement of other employees' tasks.
- Tested and verified in `WorkOsEmployeeTaskMovementTest.php`.
