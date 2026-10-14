# Module: Task Blueprints & Templates

## 1. Overview
The **Task Blueprints & Templates** module allows teams to standardize recurring operational workflows (e.g. "Brand Identity Package", "Monthly SEO Audit", "Video Production Sprint") by saving and instantiating structured groups and tasks.

---

## 2. Key Controllers & Routes
- **`App\Http\Controllers\TemplateController`**:
  - `GET /kanban/boards/{board}/task-blueprints`: List available blueprints.
  - `POST /kanban/boards/{board}/task-blueprints/instantiate`: Clone a blueprint into a board group.
  - `POST /kanban/groups/{group}/save-as-blueprint`: Convert an existing group into a reusable blueprint.
  - `POST /templates/save-board/{board}`: Save an entire board configuration as a workspace template.

---

## 3. Authorization Rules
- Only **Super Admin**, **Admin**, and **Project Manager** roles can create or instantiate blueprints.
- **Designers** cannot save blueprints or modify global templates.

---

## 4. Key Cross-References
- Modal component: `resources/js/pages/kanban/components/WorkflowBlueprintModal.tsx`
- RBAC tests: `WorkOsRbacSecurityAuditTest.php`
