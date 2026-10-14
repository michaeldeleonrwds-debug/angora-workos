# ADR-002: Role-Based Access Control and Deny-by-Default

## Status
Accepted (Security Remediation `245acd8`)

## Context
An audit revealed that Designer accounts could access administrative task modification controls, delete tasks, and alter deadlines. The system previously inferred permissions from broad workspace or board membership.

## Decision
We established a strict deny-by-default RBAC security model across all Work OS controllers and policies:
1. Workspace or board membership grants **zero** editing authority by default.
2. Explicit Laravel Gates and Policies (`BoardPolicy`, `TaskPolicy`, `TaskReviewPolicy`) guard every mutation route.
3. Designers cannot create, delete, reorder, or reassign tasks, nor alter deadlines, blueprints, or column configurations.
4. Inertia props pass explicit boolean capability flags (`canEditTask`, `canDeleteTask`, etc.) derived directly from policy checks.

## Consequences
- Completely eliminates designer privilege escalation.
- Backend policies guarantee security regardless of frontend UI state.
- Covered by 26 automated feature tests in `WorkOsRbacSecurityAuditTest.php`.
