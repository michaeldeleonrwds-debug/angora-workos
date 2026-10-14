# 07 — Frontend Design

## 1. UI Hierarchy & 4-Row Compact Layout
To maximize canvas area on laptops and desktop displays, Angora uses a strict 4-row header hierarchy ([`BoardUnifiedHeader.tsx`](file:///c:/Users/REYMARK/Documents/Sites/angora/resources/js/pages/kanban/components/BoardUnifiedHeader.tsx)):

```text
┌────────────────────────────────────────────────────────────────────────┐
│ Row 1: Compact Global App Bar (~52px)                                  │
│ [Sidebar Toggle] [Workspace Dropdown] [Board Dropdown] ... [Search] [Theme] [User] │
├────────────────────────────────────────────────────────────────────────┤
│ Row 2: Board Identity Bar (~44px)                                      │
│ ★ Board Title: Angora Production — Demo   |  Members  |  Stats  |  Filters │
├────────────────────────────────────────────────────────────────────────┤
│ Row 3: Board View Navigation Strip (~38px)                             │
│ [Main Table]  [Production Kanban]  [Timeline Overview]  [Calendar]     │
├────────────────────────────────────────────────────────────────────────┤
│ Row 4: View Canvas (Fills remaining height)                            │
│ TableView / KanbanBoardView with independent scroll containers         │
└────────────────────────────────────────────────────────────────────────┘
```

> [!NOTE]
> Board view tabs are strictly located in **Row 3** directly underneath the board identity bar. They must never be merged into the Row 1 global application bar.

---

## 2. Role-Based Task Details Modal ([`ItemDetailDrawer.tsx`](file:///c:/Users/REYMARK/Documents/Sites/angora/resources/js/pages/kanban/components/ItemDetailDrawer.tsx))
When a card or table row is opened, the drawer dynamically branches layout based on user permissions:

### A. Manager View (Super Admin, Admin, PM, Authorized AM)
- Full administrative management controls.
- Editable title, description, priority, deadline, custom column editors.
- Destructive actions (Delete Task) and stage management.

### B. Employee / Designer View ([`EmployeeTaskPanel.tsx`](file:///c:/Users/REYMARK/Documents/Sites/angora/resources/js/pages/kanban/components/EmployeeTaskPanel.tsx))
A clean, Monday.com-inspired two-column label/value panel optimized for production execution:
1. **Task Name**: Prominent heading, read-only.
2. **Project Manager**: Avatar + full name (falls back to "Not assigned").
3. **Account Manager**: Avatar + full name (supports multiple AMs).
4. **Assigned Designers**: Avatars + names for all assigned designers.
5. **Status**: Workflow stage badge (dropdown with permitted transitions if assigned).
6. **Service Type**: Configured service category badge.
7. **Deadline**: 12-hour AM/PM formatted date + time + exact countdown badge.
8. **Progress**: Visual progress bar + quick-set percentage buttons (`0%`, `25%`, `50%`, `75%`, `100%`).
9. **Description**: Formatted brief with "Show more / Show less" toggle.
10. **Subtasks & Priority**: Interactive checklist for assigned subtasks and priority indicator.
11. **Deduplicated Custom Columns**: Only non-core custom fields are rendered to prevent repeating status or deadline.

---

## 3. Right Collaboration Panel (5 Tabs)
1. **Updates**: Rich communication feed with user avatars, role badges (`PM`, `AM`, `DESIGNER`, `ADMIN`), 12h timestamps, threaded replies, emoji reactions, and author-checked deletion.
2. **Files**: Upload and preview deliverables.
3. **Activity Log**: Chronological audit trail of all status and field mutations.
4. **Reviews**: Formal deliverable submission for designers and approval decision actions for managers.
5. **Dependencies**: Visual list of blocker and related tasks.

---

## 4. Key Cross-References
- ADR on Employee Task Modal: [[decisions/ADR-004-monday-inspired-role-based-task-modal]]
- ADR on Compact Kanban Layout: [[decisions/ADR-001-hybrid-table-kanban-architecture]]
- Kanban canvas: [[06-KANBAN-AND-TASKS]]
