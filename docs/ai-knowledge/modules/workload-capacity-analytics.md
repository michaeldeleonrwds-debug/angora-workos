# Module: Workload Capacity & Analytics

## 1. Overview
The **Workload Capacity** module enables project managers to monitor team allocation, prevent burnout, and forecast agency delivery bandwidth.

---

## 2. Controllers & Routes
- **`App\Http\Controllers\WorkloadCapacityController`**:
  - `GET /kanban/boards/{board}/workload-analytics`: Aggregate team workload data.
  - `PATCH /users/{user}/capacity`: Update user capacity baseline hours (Admin or self only).
  - `GET /kanban/boards/{board}/workload-analytics/export`: Export workload stats.

---

## 3. Allocation Modes
- **Equal Split**: When multiple designers are assigned to a task with estimated hours, effort is divided equally among assignees.
- **Full Effort**: Each assignee is credited with the full task duration.

---

## 4. Key Cross-References
- Workload view component: `resources/js/pages/kanban/components/WorkloadView.tsx`
- Feature tests: `WorkOsPhase5WorkloadCapacityTest.php`
