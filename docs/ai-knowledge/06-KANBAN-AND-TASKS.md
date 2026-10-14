# 06 — Kanban & Tasks

## 1. Dual Canvas: Main Table & Production Kanban
Angora provides two primary representations of the same underlying board state:
1. **Main Table (`TableView.tsx`)**:
   - High-density spreadsheet-like view grouped by `BoardGroup`.
   - Collapsible groups with color badges and count summaries.
   - Dynamic custom column cells with inline keyboard and click editing.
   - Work category nested accordion rows (`SubitemTable.tsx`).
   - Obsolete progress column filtered out of visibility.
2. **Production Kanban (`KanbanBoardView.tsx`)**:
   - Vertical columns represent workflow stages (`KanbanColumn`).
   - Cards display priority badges, dynamic assignee avatars, exact deadline counters, and blocker flags.
   - Child entries represent **Work Categories** (e.g., Design, Build/Development, Video Editing, QA, Deployment) showing responsible team members.
   - Drag isolation ensures clicking or interacting with work categories does not unintentionally drag the parent card.
   - HTML5 drag-and-drop movement is authorized if the user is assigned directly to the parent project OR to any child work category belonging to that project.
   - Progress bars and completion checkboxes have been removed in favor of discrete workflow stage transitions.

---

## 2. Dynamic Workflow Stages & Categories
Every column maps to a semantic category:
- `not_started`: Backlog and pending tasks.
- `in_progress`: Active development / production work.
- `in_review`: Deliverables submitted for QA or client inspection.
- `completed`: Approved and closed tasks.

### Transition Rules
- **Privileged Users (Super Admin, Admin, PM)**: Can transition tasks between any stages at will.
- **Designers & Production Contributors (Employees)**:
  - Can move assigned tasks (or tasks where they own a child work category) across permitted stages: `not_started` ➔ `in_progress` ➔ `in_review`.
  - **Cannot** move assigned tasks directly to `completed` or `cancelled` without review approval.
  - Cannot move tasks when unassigned to both the parent and all child categories.


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
