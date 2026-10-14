# 04 — RBAC & Security

## 1. Security Philosophy: Deny-by-Default
Angora Work OS enforces a **strict deny-by-default access control architecture**.
- Users possess zero operational authority unless an explicit policy method or role check grants it.
- **Board membership does NOT confer editing or administrative authority.**
- **Workspace membership does NOT confer task mutation authority.**
- Hiding a button on the frontend is never considered an authorization fix. Every state mutation endpoint evaluates Laravel Policies on the backend.

---

## 2. Centralized Permission Matrix

| Capability | Super Admin | Admin | Project Manager | Account Manager | Designer (Employee) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Workspace Management** | ✅ | ✅ (Own) | ❌ | ❌ | ❌ |
| **Board Creation / Deletion** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Board Column Configuration** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Workflow Stage Configuration** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Automations & Blueprints** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Task Creation** | ✅ | ✅ | ✅ | ✅ (Configured) | ❌ |
| **Task Deletion** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Assign Users / Deadlines / Priority** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Move Any Task Card** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Move Assigned Task Card** | ✅ | ✅ | ✅ | ❌ | ✅ (Permitted Stages) |
| **Directly Complete (Bypass QA)** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Update Assigned Task Progress** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Add / Complete Assigned Subtasks** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Post Comments & Reactions** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Submit Review Deliverables** | ✅ | ✅ | ✅ | ❌ | ✅ (Assigned Only) |
| **Approve / Reject Review Cycles** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Export Board CSV / JSON** | ✅ | ✅ | ✅ | ❌ | ❌ |

---

## 3. Assignment-Based Task Movement (`canMoveAssignedTask`)
Enhanced in commit `fix(work-os): enable category-assigned task movement and simplify child cards`, `TaskPolicy::canMoveAssignedTask` permits contributors (`designer`, `developer`, `dept_user`, `employee`) to move cards under strict conditions:
1. **Assignment Check**: User must be directly assigned (`assigned_to`), referenced in dynamic designer/person columns (`task.custom_values.designer_ids`), OR assigned to any child work category belonging to the parent project (`task.subitems`).
2. **Transition Rules**:
   - `not_started` ➔ `in_progress`, `in_review`, `blocked` ✅
   - `in_progress` ➔ `in_review`, `not_started`, `blocked` ✅
   - `in_review` ➔ `in_progress` (rework) ✅
   - Direct move to `completed` or `cancelled` ❌ (Denied: must pass through PM/reviewer approval).
3. **Unassigned Tasks**: Employees cannot move tasks unless assigned to the parent or at least one child work category.
4. **Progress Deprecation**: Legacy progress percentages and bars have been removed across all production UI views in favor of discrete status transitions.

### Code Reference: `App\Policies\TaskPolicy.php`
```php
public function updateTaskColumn(User $user, KanbanTask $task, KanbanColumn $targetColumn): bool
{
    // Super Admin, Admin, and Project Manager have full movement authority
    if ($this->canManageTasks($user, $task->board)) {
        return true;
    }

    // Designers can only move tasks assigned to them through permitted stages
    if ($user->role === 'designer') {
        if (!$task->isAssignedTo($user)) {
            return false;
        }

        // Must not transition directly to completed without PM review approval
        if ($targetColumn->semantic_category === 'completed') {
            return false;
        }

        return true;
    }

    return false;
}
```

---

## 4. Protected Endpoints & Policies
- **`BoardPolicy`**: Protects board CRUD, columns, stages, automations, blueprints, and data exports.
- **`TaskPolicy`**: Protects task creation, field updates, column moves, deletion, subitem creation, and dependency links.
- **`TaskReviewPolicy`**: Protects submission (designers) vs approval/decision (PMs and Admins).
- **`UserController`**: Prevents privilege escalation (Admins cannot create or assign `super_admin` roles).

---

## 5. Security Audit Log
All administrative actions, role assignments, user status toggles (suspensions), and security-sensitive updates write immutable records to the `audit_logs` table via `AuditLogService`.

---

## 6. Key Cross-References
- Architectural decision record: [[decisions/ADR-002-role-based-access-control-and-deny-by-default]]
- Assignment movement decision: [[decisions/ADR-003-assignment-based-task-movement-and-employee-filters]]
- RBAC feature tests: [[08-TESTING-AND-QA]]
