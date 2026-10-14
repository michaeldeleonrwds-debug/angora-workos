# Module: Kanban Core

## 1. Overview
The **Kanban Core** module provides the multi-view workspace board engine. It handles board groups, workflow stages, cards, dynamic column definitions, and real-time state synchronization.

---

## 2. Key Controllers & Endpoints
- **`App\Http\Controllers\KanbanController`**:
  - `GET /kanban`: Board index rendering `TableView` or `KanbanBoardView`.
  - `POST /kanban/tasks`: Task creation.
  - `PATCH /kanban/tasks/{task}`: Task attributes update (title, due date, priority, progress, custom values).
  - `PATCH /kanban/tasks/{task}/column`: Workflow stage update (drag-and-drop column move).
  - `PATCH /kanban/tasks/{task}/group`: Group move (swimlane transfer).
  - `POST /kanban/tasks/reorder`: In-column card reordering with fractional positions.
  - `DELETE /kanban/tasks/{task}`: Task deletion.
  - `POST /kanban/tasks/{task}/subitems`: Subtask creation.

---

## 3. Dynamic Columns Engine
Boards support dynamic columns defined in the `board_columns` table:
- Evaluated and rendered via cell components: `DatePickerCell`, `MultiPeoplePicker`, `EditableDropdownCell`, `ImageCell`.
- Values are stored in `kanban_tasks.custom_values` keyed by column `key`.

---

## 4. Key Cross-References
- Model definitions: [[03-DATABASE-AND-MODELS]]
- Canvas guide: [[06-KANBAN-AND-TASKS]]
- Authorization rules: [[04-RBAC-AND-SECURITY]]
