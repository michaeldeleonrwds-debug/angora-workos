# 08 — Testing & QA

## 1. Automated Test Suite Architecture
Angora maintains a comprehensive test suite built on **PHPUnit 11** with SQLite in-memory database testing (`RefreshDatabase`).
- **Total Tests**: `203 passed`
- **Total Assertions**: `983 assertions`
- **Execution Speed**: ~13 seconds for the full suite

---

## 2. Key Test Suites & Responsibilities

| Test File | Focus & Coverage |
| :--- | :--- |
| [`WorkOsRbacSecurityAuditTest.php`](file:///c:/Users/REYMARK/Documents/Sites/angora/tests/Feature/WorkOsRbacSecurityAuditTest.php) | 26 tests verifying deny-by-default access control, role precedence, and prevention of privilege escalation. |
| [`WorkOsEmployeeTaskMovementTest.php`](file:///c:/Users/REYMARK/Documents/Sites/angora/tests/Feature/WorkOsEmployeeTaskMovementTest.php) | Tests assignment-based task movement, transition rules, and employee default filtering. |
| [`WorkOsEmployeeTaskModalTest.php`](file:///c:/Users/REYMARK/Documents/Sites/angora/tests/Feature/WorkOsEmployeeTaskModalTest.php) | 10 tests covering the redesigned employee modal, field protection, progress updates, subtasks, and reviews. |
| [`WorkOsUserManagementTest.php`](file:///c:/Users/REYMARK/Documents/Sites/angora/tests/Feature/WorkOsUserManagementTest.php) | User lifecycle, rate-limited invitations, account suspension, and super-admin privilege isolation. |
| [`WorkOsPhase5TaskDependenciesTest.php`](file:///c:/Users/REYMARK/Documents/Sites/angora/tests/Feature/WorkOsPhase5TaskDependenciesTest.php) | Task dependencies, blocker states, DFS cycle detection, and workspace isolation. |
| [`WorkOsPhase5TaskRecurrenceTest.php`](file:///c:/Users/REYMARK/Documents/Sites/angora/tests/Feature/WorkOsPhase5TaskRecurrenceTest.php) | Recurrence scheduling, max occurrences, and on-completion triggers. |
| [`WorkOsPhase5WorkloadCapacityTest.php`](file:///c:/Users/REYMARK/Documents/Sites/angora/tests/Feature/WorkOsPhase5WorkloadCapacityTest.php) | Workload calculations, multi-assignee effort splitting, and overallocation detection. |
| [`WorkOsPhase5ReportsAndExportsTest.php`](file:///c:/Users/REYMARK/Documents/Sites/angora/tests/Feature/WorkOsPhase5ReportsAndExportsTest.php) | CSV/JSON export endpoints, authorization scoping, and CSV formula injection sanitization. |

---

## 3. Standard Verification Commands

### Run All Work OS Feature Tests
```bash
php artisan test --filter=WorkOs
```

### Run Specific Test Suite
```bash
php artisan test --filter=WorkOsEmployeeTaskModalTest
```

### TypeScript Static Typecheck
```bash
npm run types
```

### Production Asset Compilation
```bash
npm run build
```

---

## 4. Pre-Commit QA Checklist
Before creating any commit:
1. All feature tests must pass: `php artisan test --filter=WorkOs` (zero failures).
2. TypeScript static typecheck must pass: `npm run types` (zero errors).
3. Production assets must build cleanly: `npm run build`.
4. Git working tree must contain zero unintended edits or sensitive files.
