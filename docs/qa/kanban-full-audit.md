# Angora Work OS — full Kanban QA audit

**Audit date:** 16 October 2026 (Asia/Manila)  
**Mode:** Read-only investigation. No application records, settings, code, or database schema were intentionally changed. No fixes or migrations were run.  
**Browser coverage:** Chrome automation was unavailable in this session. The local application was inspected through Codex's in-app browser, using the built-in local Admin test persona. Findings below distinguish those observations from source-only conclusions. No destructive UI actions were submitted. No screenshot file could be saved through the available browser surface.

## Executive summary

The reported **“To do” tab is a board view**, while the empty **“To Do” Kanban lane is a workflow stage** and the absent **“To Do” Main Table section is a table group**. These are three different records. The custom tab cannot be deleted from the current interface because Table views are pinned in the tab bar, and delete controls are rendered only for views in the **More** menu. The server does expose a view-only delete endpoint; its implementation removes the `board_views` row and does not delete tasks or their comments/files.

The two main canvases receive the same loaded board but deliberately partition tasks on independent `group_id` and `column_id` relationships. The demo board seeds a `New Task` table group and a `New Task` stage; the running board also has an empty `To Do` stage. This explains why names and counts can differ. Current UI does not explain this distinction. View IDs and configuration are not used when selecting content; views of the same type behave as one tab. The view management API is more complete than its UI, but the UI omits rename and reorder.

## Data model and endpoint boundary

| Concept | Storage and code | Meaning | Safe delete target |
| --- | --- | --- | --- |
| Board | `kanban_boards`; `KanbanBoard` | Owns tasks, groups, stages and views | `/kanban/boards/{board}` is **not** a view action |
| View/tab | `board_views`; `BoardView` | Saved presentation name, type, settings, default flag, position | `/kanban/views/{view}` only |
| Table group | `board_groups`; `BoardGroup` | Independent grouping of tasks by `group_id` | `/kanban/groups/{group}` moves grouped tasks before deleting |
| Kanban column / workflow stage | `kanban_columns`; `KanbanColumn` | Stage associated with tasks by `column_id` and semantic category | `/kanban/stages/{column}` archives an empty stage |
| Task status | Task's stage/semantic state | Workflow state of a task, not a view or group | Change through task status route and policy |

Evidence: `app/Models/KanbanBoard.php:82-89`, `app/Http/Controllers/KanbanController.php:157-176`, `routes/web.php:93-98`, `app/Http/Controllers/KanbanController.php:803-817`, `app/Http/Controllers/KanbanController.php:655-671`.

## Confirmed findings, prioritized

### P1-01 — Custom Table/Kanban/Timeline/Calendar views have no delete control

**Severity:** P1. **Evidence:** In-app browser and source. The existing `To do` tab was visible beside Main Table; no tab menu or delete action appeared. `BoardUnifiedHeader.tsx:143-148` places every `table`, `kanban`, `timeline`, `gantt`, and `calendar` view in `pinnedViews`; `BoardUnifiedHeader.tsx:975-992` renders them as bare buttons. Delete is rendered only inside `moreViews.map` at `BoardUnifiedHeader.tsx:1010-1041`.

**Reproduce:** On the demo board, select the existing `To do` Table tab and inspect its button and More menu. There is no delete action. For any custom view of a primary type, the same code path applies. **Root cause:** The UI partitions by *type* instead of system/user-created status, then attaches management actions only to the non-primary partition. **Recommended fix:** Give every user-created view an accessible context menu with Rename, Delete/Archive, Set default, and Reorder. Keep system views protected by an explicit immutable/system flag. **Coverage:** `tests/Feature/WorkOsBoardTest.php:359-395` verifies a direct delete request, not visibility or usability of the tab control. Add a UI test for each primary view type and role.

### P1-02 — View identity collapses to type; duplicate types cannot hold distinct state

**Severity:** P1. **Evidence:** Source plus in-app browser. Clicking `To do` after Main Table left the same table visible. `BoardUnifiedHeader.tsx:976-980` selects by `activeTab === v.type` and calls `onTabChange(v.type)`; `resources/js/pages/kanban/index.tsx:80-82,356-417` stores only a type string and renders one component per type. `BoardUnifiedHeader.tsx:351-365` selects the newly created view by type alone. **Reproduce:** Create two Table views on a disposable board, switch between their tabs, set different intended settings, then observe both resolve to the same `table` component and active state. This destructive step was **not performed** on the real board; the source path is decisive. **Root cause:** `BoardView.id` and `settings` never enter active view selection or the Table/Kanban/Calendar/Timeline render path. **Recommended fix:** Track selected view ID, load its saved settings, and pass them to each renderer. Preserve a view-specific URL or preference. **Coverage:** Add UI and controller tests for two views of the same type with different settings and active-tab behavior; the existing happy-path test does not cover this.

### P1-03 — Main Table groups and Kanban stages visibly disagree, and the demo seed reinforces the mismatch

**Severity:** P1. **Evidence:** In-app browser and source. Main Table showed `Resources`, `Hold`, `New Task`, `In Progress`, `For Review`, `Completed`; Kanban showed additional stages including `To Do`, `Processing`, `Progress Report`, `Ready to Report`, and `Client Under Review`. `TableView.tsx:170-175,233-240` uses `board.groups` and each group's tasks; `KanbanBoardView.tsx:70,277-279` uses `board.columns` and each stage's tasks. Both come from the same board load at `KanbanController.php:157-176`, yet seed definitions are independent at `database/seeders/AngoraWorkOsDemoSeeder.php:405-423,645-660`. **Reproduce:** Switch between Main Table and Production Kanban on the demo board and compare headings. **Root cause:** Groups and stages are distinct dimensions, seeded with different names and counts; the UI presents both as comparable lanes. This is a product consistency defect, **not evidence of two task databases or task loss**. **Recommended fix:** Decide whether Table should group by workflow stage or by independent group. If independent groups are intentional, label the distinction clearly, expose both dimensions, and ensure table status derives from `column_id`. Migrate/demo-seed naming only after product decision. **Coverage:** Add a cross-view fixture test proving each task ID appears in both views under the expected group and stage; existing group fixture assertions at `tests/Feature/WorkOsPhase36DynamicColumnsAndCellsTest.php:273-281` only verify group creation.

### P1-04 — Kanban task movement errors are silent in the UI

**Severity:** P1 (downgraded from open). **Status:** **Implemented but not browser-verified** (commit `9223b85`, present at HEAD).

**Why the original “console-only” conclusion was incomplete:** `KanbanBoardView.tsx:236-238` (`onError: console.error`) is a component-level callback, not the error transport. Kanban drags use Inertia `router.patch`, which runs on axios (not `window.fetch`), so the `fetch` wrapper in `permission-errors.ts:66-88` does not apply. The covering handler is the global `inertia:invalid` listener installed in `app.tsx:20-23` → `permission-errors.ts:101-115`.

**Verified trace — Designer Processing → To Do:**
1. `handleDrop` (`KanbanBoardView.tsx:209-240`) sends `PATCH /kanban/tasks/{id}/column` via Inertia axios with `X-Inertia: true`.
2. The production workflow grants only `to_do → processing` for contributors (`angora_workflows.php:42`); `processing → to_do` is not a contributor edge (`TaskPolicy.php:193-195, 213-225` → `WorkflowService::contributorMayTransition` returns `false`).
3. `TaskPolicy` denies → Laravel returns **HTTP 403**. The global handler (`bootstrap/app.php`) responds with JSON `{message, code: "permission_denied"}` and **no** `X-Inertia` header — confirmed by `WorkOsPermissionErrorUXTest::test_inertia_mutation_denial_returns_json_without_page_response` (10/10 passing).
4. Because the response is not a valid Inertia page, Inertia dispatches the cancelable `inertia:invalid` event. The global listener checks status 403, calls `preventDefault()` (suppressing the raw HTML overlay at `index.js` `handleNonInertiaResponse` → `He.show`), and toasts **“Action Not Permitted — You don't have permission to perform this action.”**
5. No page navigation occurs (board/modal stay open); the card is never moved locally, so a rejected drop leaves it in Processing.

**Same-shape coverage:** the same handler covers `router.get`/`post`/`patch`/`delete` across the app; 403 → fixed denial toast, 422 → “Action Not Allowed” with the server’s safe message. `fetch`-based paths are covered by the wrapper.

**Duplicate-toast check:** clean. Fetch wrapper does not fire for axios requests; the listener fires once per response; the Kanban component `onError` only writes to `console.error` and shows no UI.

**Remaining gaps:** (a) not observed in a real browser session; (b) if `TaskPolicy` were ever bypassed locally (`canMoveTask` returns true for any assigned contributor move at `KanbanBoardView.tsx:154-162`, which does not pre-filter workflow edges), the drop would still be rejected and toasted server-side, but drag UX could be improved by pre-filtering allowed destinations; (c) `onError` remains console-only — intentional, since global handlers own visible feedback. **Recommended:** confirm in Chrome with a Designer persona; optionally pre-filter drop targets from the workflow graph.

### P2-01 — No rename or reorder UI for board views despite server routes

**Severity:** P2. **Evidence:** Source only. Header view handlers include create, delete, and set-default at `BoardUnifiedHeader.tsx:351-390`; no rename or reorder handler exists, and the tab markup at `BoardUnifiedHeader.tsx:975-1059` offers neither control. Backend update and reorder routes exist at `routes/web.php:96-98`, implemented at `KanbanController.php:1798-1824,1849-1862`. **Reproduce:** Inspect a custom tab and More menu; neither Rename nor drag/reorder action is offered. **Root cause:** API lifecycle was implemented without corresponding UI. **Recommended fix:** Add accessible rename and reorder controls for user views, with optimistic state and error handling. **Coverage:** Extend `WorkOsBoardTest.php:359-395` to rename and verify complete ordering; add UI keyboard and pointer tests.

### P2-02 — Stored tab order is ignored by the pinned tab bar

**Severity:** P2. **Evidence:** Source only. `KanbanBoard::views()` orders by `position` (`app/Models/KanbanBoard.php:82-84`), and the server writes positions at `KanbanController.php:1849-1862`. But `BoardUnifiedHeader.tsx:143-148` sorts primary types by a fixed type array, overriding saved order. **Reproduce:** On a disposable board, reorder persisted view IDs through the route and reload; primary type tabs still follow `table, kanban, timeline, gantt, calendar`. **Root cause:** Fixed type sort supersedes `position`. **Recommended fix:** Render all views by saved `position`, with explicit pinning as a separate property if needed. Validate the reorder payload as a complete, distinct set of this board's view IDs. **Coverage:** Existing `WorkOsBoardTest.php:381-390` only checks a database position; assert rendered order after reload and reject duplicate/foreign/incomplete IDs.

### P2-03 — Current view selection is lost on reload and may become ambiguous after deletion

**Severity:** P2. **Evidence:** Source only. `resources/js/pages/kanban/index.tsx:80-82` initializes from the board default and holds selected type only in React state; no view ID appears in the URL or persisted preference. `BoardUnifiedHeader.tsx:370-378` falls back to `table` if the deleted view shares the active type, even when another view of that type remains. **Reproduce:** Switch to Calendar, reload, and observe the configured default returning; delete a disposable duplicate and observe type-based fallback. **Root cause:** No stable selected view identity. **Recommended fix:** Persist selected view ID per board in URL or user preference and select the nearest surviving view after delete. **Coverage:** UI reload, back/forward, and delete-active-view tests.

### P2-04 — System/default versus user-created views are not modeled or protected

**Severity:** P2. **Evidence:** Source only. `BoardView.php:11-26` and migration `database/migrations/2026_10_13_000001_create_work_os_expansion_tables.php:68-77` have default and position fields but no system/creator marker. `KanbanController.php:1826-1846` can delete any view except the final one, including seeded Main Table or the current default. **Reproduce:** On a disposable board, call view delete for a seeded view while another remains; route permits it for a board manager. **Root cause:** `is_default` means launch preference, not system ownership, and no immutable view classification exists. **Recommended fix:** Add explicit `is_system` or ownership metadata and enforce lifecycle rules server-side. Decide whether default can be deleted and define replacement deterministically by position. **Coverage:** Test system view rejection, user view deletion, and default replacement.

### P2-05 — “Colored clickable lines” have a plausible visual source, but exact overlap is unconfirmed

**Severity:** P2 (visual, pending Chrome confirmation). **Evidence:** In-app browser screenshot showed a row of small stage-color arcs immediately below the tab strip while Kanban was active. DOM inspection identified `button[title="Change stage color"]` elements at `KanbanBoardView.tsx:294-314`; they are live clickable controls. Their measured boxes were below the tab navigation, not on top of it, at the inspected viewport. Calendar did not reproduce the lines in the available in-app browser. **Reproduce:** Use Chrome at the user's viewport, switch between Kanban and Calendar, scroll vertically/horizontally, and inspect whether stage header controls clip under the sticky tab bar. **Root cause:** Not established; likely stage-header/color-control exposure during scroll or clipping, but it must not be asserted as fact. **Recommended fix:** Once reproduced, correct stacking, clipping, and scroll container boundaries; avoid interactive hit targets visually reduced to lines. **Coverage:** Responsive screenshot and hit-target tests at narrow and wide widths.

### P2-06 — Table completion summary infers workflow state from mutable stage title

**Severity:** P2. **Evidence:** Source only. `TableView.tsx:237-240` counts a task complete when its stage title contains `done` or `complete`, or when `completed_at` is set. Stage titles can be renamed at `KanbanController.php:610-629`. **Reproduce:** On a disposable board, rename a completed semantic stage to an unrelated label or rename an incomplete stage to include “Complete”; compare group completion percentage. **Root cause:** Summary uses text matching instead of `semantic_category`/`completed_at`. **Recommended fix:** Derive counts from stable semantic status, with a defined precedence for `completed_at`. **Coverage:** Rename-stage test should leave completion statistics unchanged.

### P2-07 — View reorder endpoint accepts partial and duplicate IDs

**Severity:** P2. **Evidence:** Source only. `KanbanController.php:1849-1862` validates `exists` but not `distinct`, complete membership, or non-empty array. It silently skips foreign-board IDs in the update loop, and can assign repeated positions or leave gaps when the submitted list is incomplete. **Reproduce:** On a disposable board, POST duplicate or partial `view_ids` and inspect `position` values; not run on the live board. **Root cause:** Weak set validation. **Recommended fix:** Validate distinct IDs, all belonging to the same board, and exact set equality in one transaction. **Coverage:** Negative route tests for duplicates, foreign IDs, missing IDs and empty input.

### P2-08 — Table group ordering is stored but has no management path

**Severity:** P2. **Evidence:** Source only. `BoardGroup.position` is assigned on create at `KanbanController.php:767-783`, and the relationship is ordered by position in `app/Models/KanbanBoard.php:56-59`; `TableView.tsx:233-235` renders that order. `routes/web.php:50-55` provides group create/update/delete and stage reorder, but no group reorder route; no group reorder handler appears in `TableView.tsx`. **Reproduce:** Inspect Main Table group controls; they allow rename/delete/color but no move or drag reorder. **Root cause:** Persisted position has no update operation. **Recommended fix:** Add a board-scoped group reorder endpoint with exact-set validation and accessible controls, keeping it distinct from stage reorder. **Coverage:** Route and UI tests for order persistence, foreign IDs, and keyboard operation.

## Dynamic functionality checklist

| Area | Observation / source conclusion | Status |
| --- | --- | --- |
| Create custom view | POST route and Add View dialog are present (`KanbanController.php:1776-1795`, `BoardUnifiedHeader.tsx:1343-1357`); no real view created during audit | Code verified; live mutation not tested |
| Rename custom view | Backend PATCH accepts name; UI has no control | Missing UI |
| Delete/archive custom view | Backend DELETE only deletes `BoardView`; pinned primary-type tab has no action | Broken UI; data deletion boundary verified |
| Reorder tabs | Backend position exists; UI absent and fixed type sort overrides it | Broken |
| Switch views | Table, Kanban and Calendar rendered from the same `board` prop; selected type held in memory | Basic switch observed; identity/persistence broken |
| Table / Kanban / Timeline / Calendar | Render branches present in `index.tsx:356-417`; Timeline and Gantt share `GanttView` | Code verified; Table/Kanban/Calendar observed |
| Group CRUD | Store/update/delete routes present; delete moves tasks to another group (`KanbanController.php:767-817`) | Code verified; no live mutation |
| Table group order | Position exists, but no group reorder route or UI | Missing |
| Stage CRUD | Store/update/archive/reorder routes present (`KanbanController.php:563-693`) | Code verified; no live mutation |
| Task cards and subitems | Card and work-category counts visible in Kanban; drawer showed child work categories | In-app browser observed |
| Assignments, comments, files | Drawer showed assignees, Updates thread, Files tab and empty file state | In-app browser observed; upload/edit not tested |
| Persistent task ID | Opening a card produced `?item=<id>` and detail drawer | In-app browser observed |
| PM-only New Task/To Do entry | No proof of the requested PM-only rule found from the safe browser checks; `TaskPolicy.php:121-195` enforces assignment and semantic transition constraints but no title-specific PM rule was established | Open verification item |
| Unauthorized feedback | Drag `onError` logs to console, but global `inertia:invalid` handler (commit `9223b85`) suppresses raw overlays and toasts 403/422 for Inertia/axios mutations; fetch wrapper covers `fetch` paths; branded 403/422 pages cover full-page navigation | Implemented; backend tests 10/10; browser unverified (see P1-04) |
| Responsive/overlays | One wide and one narrower in-app browser rendering observed; no saved screenshot and no Chrome/device matrix | Partial |

## RBAC and data integrity

`KanbanController.php:1776-1780,1798-1803,1826-1831,1849-1852` gates view CRUD/reorder through `BoardPolicy::update`; `BoardPolicy.php:97-121` requires `workos.boards.manage`, view access, and qualifying board/workspace ownership or membership. `WorkOsPermissionService.php:16-21,37-39` exposes `canManageBoard` and maps `canManageColumns`/`canManageGroups` to it. The header uses `canManageColumns` to show view controls (`BoardUnifiedHeader.tsx:995,1032,1045,1063`). This is an indirect but presently equivalent capability; a dedicated `canManageViews` would clarify UI and API intent. Admin or PM role name alone does not prove access to every board. Restricted members should see no management control. Role-specific live mutation/denial tests were not run.

View deletion at `KanbanController.php:1838-1846` calls only `$view->delete()` and optionally selects a replacement default. `board_views.board_id` references `kanban_boards` (`...create_work_os_expansion_tables.php:69-77`); deleting a view has no cascade path into `kanban_tasks`, `kanban_columns`, `board_groups`, comments or attachments. The existing backend test checks the view row disappears (`WorkOsBoardTest.php:392-394`) but does **not** assert preservation of those related records. Add explicit preservation assertions. Do not use board, group, stage, or task delete endpoints to remove a tab.

One additional integrity concern: `KanbanController.php:131-133,256-303` runs `ensureBoardIntegrity` during GET and can create default groups/columns or reassign ungrouped tasks when a board lacks them. The audit did not determine whether it fired for the inspected board. This should be reviewed separately because a read request may mutate data; future QA should use a snapshot/disposable board when probing empty or malformed boards.

## Tests performed and limits

- Architecture graph searched for `BoardView`, `KanbanController`, and related models; graph freshness reported stale after a recent controller change, so every cited finding was checked against live source.
- Inspected live local demo board in Codex's in-app browser as the built-in Admin test persona. Switched among Main Table, custom `To do`, Production Kanban and Production Calendar; observed groups/stages and opened one task drawer, its Updates and Files areas. No create, rename, reorder, drag, delete, upload, or task update was submitted.
- Reviewed `tests/Feature/WorkOsBoardTest.php:359-395` and relevant source/tests. Automated suites were **not run** because they could write to test databases and the requested mode was strict read-only.
- Chrome was unavailable to automation (`Browser is not available: chrome`); therefore **no Chrome testing is claimed**. In-app browser observation is narrower than the requested Chrome QA. Mobile viewport, PM/employee persona matrix, and colored-line reproduction at the user's precise viewport remain unverified.
- Browser screenshots were viewed transiently but the available surface did not provide a supported save-to-workspace action, so none are attached.

## Fix backlog

**P0:** None confirmed.  
**P1:** 4 findings — accessible deletion for custom primary-type views; view ID/configuration identity; cross-view grouping clarity and consistency; visible transition failure feedback (P1-04 **implemented in `9223b85`, backend-verified, pending browser confirmation** — see P1-04).  
**P2:** 8 findings — rename/reorder UI; persisted view order; selection persistence; system-view lifecycle rules; colored-line visual investigation; stable completion calculation; strict view reorder validation; table group ordering.  
**P3:** None confirmed.

Prioritize a disposable-board end-to-end pass after fixing P1-01 and P1-02. It should assert that deleting a custom view preserves task IDs, stage IDs, group IDs, comments, and files, and should cover Admin, PM, contributor, and viewer permissions. Keep the five resource types in the table above separate throughout implementation and test naming.

## Reported bug history: all 20 items

The table below classifies every reported item. “Code-only” means the current implementation was traced but the required mutation or role scenario was not safely exercised. Browser observations are limited to the in-app browser because Chrome was unavailable.

| ID | Status / severity | Verification and evidence | Relevant files / coverage |
| --- | --- | --- | --- |
| BUG 01 | Confirmed conceptual mismatch, P1 | Main Table uses independent `board_groups`; Kanban uses `kanban_columns`. The live board showed different headings, including an empty `To Do` stage. This is not task loss, but the UI does not explain the distinction. | `TableView.tsx:170-175,233-240`; `KanbanBoardView.tsx:70,278-279`; `KanbanController.php:157-176`; no cross-view identity test |
| BUG 02 | Partially confirmed, P2 | Group creation route and Add Group UI exist in source, but the control is buried in header/context menus and was not safely submitted. No evidence that the route is broken. | `KanbanController.php:767-783`; `TableView.tsx` group controls; add a browser visibility test |
| BUG 03 | Code-only, P1/P2 | Stage deletion is archive-only, rejects default stages, and rejects stages with tasks (`KanbanController.php:655-672`). A “For Revision” failure may be a legitimate task/reference invariant; exact live error was not reproduced. | `KanbanController.php:610-672`; `KanbanBoardView.tsx:117-121,344-347`; workflow settings tests |
| BUG 04 | Confirmed lifecycle split, P1 | Main Table group deletion moves tasks to another group; Kanban stage deletion archives only empty stages. They intentionally use different endpoints and safety rules, but error UX is inconsistent. | `KanbanController.php:803-817,655-672`; preserve-task deletion tests missing |
| BUG 05 | Confirmed, P1 | The live `To do` tab was visible, but delete controls are rendered only in `moreViews`; primary types are bare buttons. | `BoardUnifiedHeader.tsx:143-148,975-992,1010-1041`; `KanbanController.php:1826-1846`; `WorkOsBoardTest.php:359-395` |
| BUG 06 | Partially confirmed, P2 | In-app Kanban inspection found live clickable stage-color buttons immediately below the tab row. Exact Chrome overlap/z-index behavior remains unverified. | `KanbanBoardView.tsx:294-314`; responsive visual test missing |
| BUG 07 | Implemented, browser-unverified, P1 | Backend preserves authorization (`TaskPolicy.php:121-195`; `KanbanController.php:1319`). The drag `onError` still only logs to console (`KanbanBoardView.tsx:229-239`), but this is not the error transport: Inertia axios 403/422 responses are intercepted by the global `inertia:invalid` handler in `resources/js/lib/permission-errors.ts:101-115` (commit `9223b85`), which suppresses the raw overlay and toasts “Action Not Permitted” / “Action Not Allowed”; `WorkOsPermissionErrorUXTest` verifies the JSON payloads (10/10). Card stays put (no optimistic move). Chrome confirmation still outstanding. | Do not weaken policy; add browser confirmation; optional drop-target pre-filter |
| BUG 08 | Code-only, P1/P2 | Read-only code shows many `Gate::authorize` paths and generic aborts; global error handling changed in current HEAD `9223b85`. Cross-module toast versus branded-page behavior was not fully browser-tested. | `app/Exceptions/Handler.php` or current error middleware; RBAC and controller feature tests |
| BUG 09 | Code-only, P1 | Transition matrix has stage keys, semantic categories, required roles and contributor guards, but separate destination-entry and edge authorization need a role matrix test. | `KanbanController.php:674-760`; `TaskPolicy.php:121-195`; `WorkflowSettingsModal.tsx:210`; `WorkOsStep1bTransitionEnforcementTest.php` |
| BUG 10 | Mostly disproved, remaining risk P1/P2 | Add/rename/recolor/archive/reorder handlers are database-backed. Seeders provide starting stages, not immutable UI lists. Some display labels and legacy fallbacks still match titles. | `KanbanController.php:563-694`; `KanbanBoardView.tsx:70-121`; `KanbanColumn` model; Step 1B tests |
| BUG 11 | Confirmed conceptual mismatch, P1 | A task can legitimately be in a `New Task` table group while its status column is `Processing`; group and status are independent fields. The source explicitly renders them separately. | `TableView.tsx:233-240`; `KanbanTask` relationships; add explanatory UI/test |
| BUG 12 | Partially confirmed, P1/P2 | Main Table, Kanban, Calendar and Timeline receive the same loaded board object, but type-only view selection and independent group/stage relationships create apparent inconsistency. | `KanbanController.php:157-176`; `index.tsx:80-82,356-417`; cross-view task-ID test missing |
| BUG 13 | Code-only, P1 | Task detail route loads comments/replies, attachments, activity, dependencies and subitems; stage movement updates the same task ID. No mutation was run to prove preservation end-to-end. | `KanbanController.php:190-205,1342-1350`; `ItemDetailDrawer.tsx`; preservation test missing |
| BUG 14 | Partially confirmed, P2 | In-app drawer exposed properties, assignees, custom fields, work categories, Updates, Files, Activity and Reviews. It is a single responsive drawer rather than a strict two-panel modal; that is a product difference, not automatically a defect. | `ItemDetailDrawer.tsx`; browser observation |
| BUG 15 | Likely regression/obsolete fixture, P1 | Current architecture has separate client portal/resource-scoped paths, but tests still contain users assigned global `client` (`WorkOsAuthorizationTest.php:263`, `WorkOsPhase5MultiStageReviewTest.php:53`). The current suite was not run under read-only constraints. Do not restore an eighth global role without confirming the intended migration. | `TaskPolicy.php:271-284`; `TaskReviewController.php:184-186`; `WorkOsRoleSimplificationTest.php:114-132` |
| BUG 16 | Unverified baseline, P1 | The reported 232/15 baseline was not rerun because PHPUnit may reset/write test databases, prohibited by this audit. Source search confirms affected test families exist; no current pass/fail claim is made. | `tests/Feature/WorkOs*`; rerun in isolated CI/snapshot environment |
| BUG 17 | Mostly code-only, P1/P2 | Semantic categories, stable stage keys, review routing and migration tests exist. Seeders still contain legacy “To Do”, “New Task”, and title-based fallback values, so re-migration/template drift remains a risk. | `KanbanController.php:573-584,619-644`; `WorkflowService`; Step 1B migration/template tests |
| BUG 18 | Code-only, P1 | `manageStatuses` delegates to board update policy; Admin/PM access depends on both global permission and board/workspace ownership or qualifying membership. Employee restrictions are enforced. Role matrix was not live-tested. | `BoardPolicy.php:97-145`; `WorkOsPermissionService.php:16-45`; workflow settings tests |
| BUG 19 | Code-only, P1 | Workflow services distinguish configured boards and legacy fallback appears in transition logic. The UI/source reviewed did not establish a clear warning that zero edges revert behavior; this requires a disposable workflow fixture. | `KanbanController.php:1313-1319,1429-1433`; `WorkflowSettingsModal.tsx`; Step 1B transition tests |
| BUG 20 | Code-only, P2 | Dashboard and analytics aggregate largely by `completed_at`/null rather than semantic dynamic stages. This is consistent for completion but risks inaccurate status distributions for custom stages and reference-only columns. | `DashboardController.php:43-111`; `DashboardAnalyticsService.php:129-141,196-226,293-323`; dashboard tests |

## Dynamic lifecycle matrix

| Object | Create | Rename/update | Reorder | Delete/archive | Shared across views | Permission / test status |
| --- | --- | --- | --- | --- | --- | --- |
| Workspace | Implemented | Implemented | Not applicable | Implemented | Board container | Policy-covered; live role matrix not run |
| Board | Implemented | Implemented | Not applicable | Implemented | Owns all board records | Board policy; no live mutation |
| View/tab | Implemented | PATCH exists, UI missing | POST exists, UI missing and fixed type sort wins | DELETE exists; primary UI missing | Configuration only; same board data | Admin/qualified board manager via update policy; incomplete tests |
| Table group | Implemented | Implemented inline | Missing endpoint/UI | Implemented; tasks reassigned | Independent of Kanban stage | Group policy path; no reorder coverage |
| Kanban stage | Implemented | Implemented | Implemented in Workflow Settings | Archive-only; blocked if default/tasks | Task `column_id` shared with status displays | `manageStatuses`; Step 1B tests |
| Transition graph | Implemented | Implemented | Edge list persisted | Zero-edge semantics need explicit warning | Applies to task moves | Workflow tests; no live mutation |
| Task card | Implemented | Implemented | Implemented for tasks | Implemented | Same task ID in group/stage/calendar | Task policy; no live mutation |
| Subitem | Implemented | Implemented | Limited | Implemented via task lifecycle | Attached to parent task | Drawer and feature tests |
| Status field | Implemented | Dynamic custom fields | Via stage reorder | Stage archive rules | Same `column_id` in Table/Kanban | Policy-backed; UI error feedback incomplete |
| Assignees | Implemented | Implemented | Not applicable | Remove/update | Same task relation | Permission-backed |
| Comments/replies | Implemented | Reply/update surfaces | Not applicable | Delete route | Same task ID | Drawer observed; preservation not mutation-tested |
| Attachments/files | Implemented | Upload/delete/download | Not applicable | Attachment delete | Same task ID | Drawer observed; upload not tested |
| Reviews/revisions | Implemented | Stage and role rules | Stage graph | Review lifecycle | Same task/review cycle | Client-role fixture conflict remains |

## Recommended implementation order

1. Stabilize view identity and lifecycle: ID-based selection, system/user classification, delete/rename/reorder controls, exact reorder validation, and preservation tests.
2. Make the group-versus-stage distinction explicit in product language and cross-view tests; decide whether “To Do” must be a group, a stage, or both.
3. ~~Add a shared async error presenter for task moves and all Inertia mutation failures while retaining 403/422 status codes.~~ **Done in commit `9223b85`** (global toast + `inertia:invalid` suppression + fetch wrapper + branded 403/422 pages; status codes and policies unchanged). Remaining: browser confirmation and optional drag pre-filtering.
4. Complete the stage-entry/transition role matrix and test Admin, PM, employee, designer, developer, viewer, and client-portal identities in isolated fixtures.
5. Replace title-based completion/fallback aggregation with stable semantic categories and document zero-edge workflow behavior.
6. Run the reported 15-test baseline in a disposable CI database, classify obsolete client-role fixtures, and only then update tests or implementation.
