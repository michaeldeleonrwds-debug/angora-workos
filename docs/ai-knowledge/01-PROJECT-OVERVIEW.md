# 01 — Project Overview

## 1. What is Angora Work OS?
**Angora Work OS** is a modern, unified agency and production operating system designed for digital creative agencies, video production teams, and professional service studios. It bridges the gap between project management (Monday.com-style hybrid table & Kanban boards) and agency operations (client portals, review/approval cycles, resource workload tracking, and automated delivery pipelines).

---

## 2. Core Operational Pillars
1. **Unified Workspace & Board Architecture**:
   - Multi-tenant workspace partitioning (`workspaces` table).
   - Boards support flexible views: **Main Table**, **Production Kanban**, **Timeline / Gantt**, **Production Calendar**, and **Workload Capacity**.
2. **Strict Role-Based Access Control (RBAC)**:
   - Deny-by-default permission model.
   - Distinct roles: `Super Admin`, `Admin`, `Project Manager`, `Account Manager`, and `Designer` (Employee).
   - Assignment-based task movement permitting designers to advance only their assigned work through authorized workflow stages.
3. **Multi-Round Review & Approval Engine**:
   - Deliverables submitted by designers undergo formal review cycles (`task_review_cycles`).
   - Project Managers and Admins can `Approve`, `Request Changes`, or `Reject`.
4. **Workload & Capacity Analytics**:
   - Member effort allocation across multi-assignee tasks.
   - Weekly and daily baseline hours tracking with overload detection.
5. **Automation & Blueprint Engine**:
   - Trigger-action automation rules running synchronously or via scheduled commands.
   - Reusable board and group blueprints (`saved_group_blueprints`).

---

## 3. Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Backend Framework** | Laravel 12 (PHP 8.2+) | RESTful controllers, Form Requests, Policies, Gates, Observers |
| **Frontend Framework** | React 19 + TypeScript | Inertia.js client-side routing, single-page application experience |
| **Styling & UI** | Tailwind CSS v4 + Lucide React | High-density data tables, dark/light themes, compact Monday-inspired header |
| **Database** | SQLite (Dev) / MySQL 8.0+ (Prod) | Normalized relational schema with optimized JSON custom fields |
| **Shared-Hosting Compatibility** | Zero-Redis Architecture | Synchronous queue / database queue fallback; standard cPanel cron support |
| **Testing** | PHPUnit 11 | 203 automated feature tests covering all Work OS phases and authorization |

---

## 4. Key Cross-References
- Full architecture pipeline: [[02-ARCHITECTURE]]
- Entity relationship model: [[03-DATABASE-AND-MODELS]]
- Security matrix and permission policies: [[04-RBAC-AND-SECURITY]]
- Work OS Phase roadmap and status: [[05-WORK-OS-PHASES]]
