# Module: Task Review Cycles

## 1. Overview
The **Task Review Cycles** module manages formal QA and client approval workflows. Designers submit deliverables, generating versioned rounds (`round_number`), while Project Managers and Admins inspect work and issue decisions.

---

## 2. Controllers & Routes
- **`App\Http\Controllers\TaskReviewController`**:
  - `GET /kanban/tasks/{task}/review`: Fetch active and past review cycles.
  - `POST /kanban/tasks/{task}/review/submit`: Submit deliverable URLs and notes.
    - Authorized for: Assigned Designer, PM, Admin.
    - Transitions task status to `in_review`.
  - `POST /kanban/tasks/{task}/review/decide`: Approve, request changes, or reject.
    - Authorized for: Super Admin, Admin, PM.
    - **Forbidden for**: Designers (cannot approve their own work).

---

## 3. Review Cycle States
- `pending`: Awaiting manager inspection.
- `approved`: Task is marked approved and can transition to `completed`.
- `changes_requested`: Sent back to designer; round increments on resubmission.
- `rejected`: Terminated or cancelled.

---

## 4. Key Cross-References
- Model schema: [[03-DATABASE-AND-MODELS]]
- RBAC rules: [[04-RBAC-AND-SECURITY]]
- Feature tests: `WorkOsEmployeeTaskModalTest.php`
