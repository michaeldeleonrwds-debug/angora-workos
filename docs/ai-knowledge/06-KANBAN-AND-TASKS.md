# 06 — Kanban & Tasks

## 1. Dual Canvas: Main Table & Production Kanban
Angora provides two primary representations of the same underlying board state:
1. **Main Table (`TableView.tsx`)**:
   - High-density spreadsheet-like view grouped by `BoardGroup`.
   - Collapsible groups with color badges and count summaries.
   - Dynamic custom column cells with inline keyboard and click editing.
   - Subitem nested accordion rows (`SubitemTable.tsx`).
2. **Production Kanban (`KanbanBoardView.tsx`)**:
   - Vertical columns represent workflow stages (`KanbanColumn`).
   - Cards display priority badges, dynamic people avatars, exact deadline counters, progress bars, and blocker flags.
   - HTML5 / drag-and-drop support with live lexical reordering.

---

## 2. Dynamic Workflow Stages & Categories
Every column maps to a semantic category:
- `not_started`: Backlog and pending tasks.
- `in_progress`: Active development / production work.
- `in_review`: Deliverables submitted for QA or client inspection.
- `completed`: Approved and closed tasks.

### Transition Rules
- **Privileged Users (Super Admin, Admin, PM)**: Can transition tasks between any stages at will.
- **Designers (Employees)**:
  - Can move assigned tasks from `not_started` ➔ `in_progress` ➔ `in_review`.
  - **Cannot** move assigned tasks directly to `completed`.
  - Cannot move tasks assigned to other team members.

---

## 3. Deadline Calculations & Precision Countdown
Deadlines store both `due_date` (`YYYY-MM-DD`) and `due_time` (`HH:MM:SS`, e.g. `17:00:00` for 5:00 PM).
- **Exact Countdown Logic**:
  - Compares the exact target timestamp against `now`.
  - Displays dynamic badges:
    - Overdue: `Xh overdue` or `X days overdue` (red badge).
    - Under 24h: `Due in Xh` or `Due in Xm` (amber badge).
    - Under 48h: `Due in 1d` or `Due in 2d` (blue badge).
    - Extended: `Due in X days` (slate badge).

---

## 4. Key Cross-References
- Frontend layout structure: [[07-FRONTEND-DESIGN]]
- Task policy and authorization: [[04-RBAC-AND-SECURITY]]
- Core Kanban module guide: [[modules/kanban-core]]
