# Module: User Management & Invitations

## 1. Overview
The **User Management & Invitations** module manages platform user identities, system roles (`super_admin`, `admin`, `project_manager`, `account_manager`, `designer`), email invitations, and account status (active vs suspended).

---

## 2. Controllers & Routes
- **`App\Http\Controllers\UserController`**:
  - `GET /users`: User directory (Super Admin & Admin only).
  - `POST /users`: Direct user creation.
  - `PATCH /users/{user}`: Role or profile updates.
  - `PATCH /users/{user}/status`: Account suspension / reactivation.
  - `POST /users/invite`: Send invitation email (rate-limited: max 20/min).
  - `DELETE /users/invitations/{invitation}`: Revoke invitation.
- **`App\Http\Controllers\Auth\InvitationRedemptionController`**:
  - `GET /invitations/{token}`: Public invitation acceptance view (rate-limited: 30/min).
  - `POST /invitations/{token}`: Complete account onboarding (rate-limited: 10/min).

---

## 3. Privilege Escalation Prevention
- An **Admin** cannot create, update, or assign the `super_admin` role.
- Only an authenticated `super_admin` can grant or revoke `super_admin` privileges.
- Suspended users are immediately blocked from logging in and rejected by all policy gates.

---

## 4. Key Cross-References
- Security Matrix: [[04-RBAC-AND-SECURITY]]
- Feature tests: `WorkOsUserManagementTest.php`
