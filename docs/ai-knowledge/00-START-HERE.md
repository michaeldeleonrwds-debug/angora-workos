# Angora Work OS — AI Development Knowledge System

> **Welcome to the Angora Work OS Development Knowledge Vault.**  
> This vault is the single source of truth for architectural understanding, security policies, data models, development workflows, and QA handoffs. It is designed to be opened directly in **Obsidian** or indexed by local AI coding assistants (**Antigravity**, **Codex**, **Graphify**, and **ICM**).

---

## 🧭 Vault Navigation Map

```text
docs/ai-knowledge/
├── 00-START-HERE.md              ← You are here: Vault index and quick start
├── 01-PROJECT-OVERVIEW.md        ← Product mission, stack, architecture principles
├── 02-ARCHITECTURE.md            ← Full-stack monolith, Inertia.js pipeline, constraints
├── 03-DATABASE-AND-MODELS.md     ← Eloquent schema, relationships, JSON custom fields
├── 04-RBAC-AND-SECURITY.md       ← Deny-by-default permission matrix, policies, gates
├── 05-WORK-OS-PHASES.md          ← Phase 0–5 implementations and Phase 6 boundary
├── 06-KANBAN-AND-TASKS.md        ← Board/table canvas, stages, deadlines, reviews
├── 07-FRONTEND-DESIGN.md         ← UI hierarchy, compact headers, EmployeeTaskPanel
├── 08-TESTING-AND-QA.md          ← PHPUnit test suites (203 tests), TypeScript, builds
├── 09-DEPLOYMENT.md              ← Shared-hosting, zero-Redis runtime, cron schedules
├── 10-KNOWN-ISSUES.md            ← Documented technical nuances and roadmap items
│
├── decisions/                    ← Architecture Decision Records (ADRs)
│   ├── ADR-001-hybrid-table-kanban-architecture.md
│   ├── ADR-002-role-based-access-control-and-deny-by-default.md
│   ├── ADR-003-assignment-based-task-movement-and-employee-filters.md
│   ├── ADR-004-monday-inspired-role-based-task-modal.md
│   └── ADR-005-shared-hosting-zero-redis-production-architecture.md
│
├── modules/                      ← Deep-dive technical briefs for each subsystem
│   ├── kanban-core.md
│   ├── task-review-cycles.md
│   ├── workload-capacity-analytics.md
│   ├── task-blueprints-templates.md
│   ├── dependencies-and-recurrence.md
│   ├── data-exports-and-reporting.md
│   └── user-management-invitations.md
│
├── handoffs/                     ← AI Collaboration protocols & QA logs
│   ├── antigravity-codex-collaboration.md
│   └── phase-5-verification-and-phase-6-readiness.md
│
├── graph/                        ← Graphify local architecture graph artifacts
│   ├── graph.json                ← Machine-readable dependency & node graph
│   ├── graph.html                ← Interactive visualization canvas
│   └── GRAPH_REPORT.md           ← Verified answers to core architectural questions
│
└── icm/                          ← ICM (useicm.com) integration & context bundles
    ├── ICM-INTEGRATION-GUIDE.md  ← Operator specification, API endpoints & workflows
    └── angora-context-export.md  ← Exported public context payload (llm.txt)
```

---

## 🚀 Quick Start for Developers & AI Assistants

### Opening in Obsidian
1. Launch **Obsidian**.
2. Select **Open folder as vault**.
3. Choose the directory: `c:\Users\REYMARK\Documents\Sites\angora\docs\ai-knowledge`.
4. All internal links (`[[...]]` and standard Markdown links) and tags will resolve automatically.

### AI Assistant Workflow (Antigravity & Codex)
- **Antigravity**: Primary implementation agent. Writes code, executes migrations, runs tests, and compiles frontend assets.
- **Codex**: Architecture consultant and QA reviewer. Validates adherence to RBAC security policies, shared-hosting constraints, and Phase boundaries.
- **Review Protocol**:
  1. Read [[01-PROJECT-OVERVIEW]] and relevant [[modules/]] before modifying code.
  2. Verify authorization constraints in [[04-RBAC-AND-SECURITY]].
  3. Run `php artisan test --filter=WorkOs` and `npm run types` after every change.
  4. Consult [[handoffs/antigravity-codex-collaboration]] for handoff formats.

---

## 🔒 Security & Privacy Notice
- **Zero Secrets**: This vault contains zero API keys, passwords, database credentials, or private customer records.
- **Local-First**: Graph indexing and architectural querying run locally on developer hardware.
- **Hosted Context Policy**: Only non-sensitive architectural summaries and public guides may be shared to external context hubs (such as ICM). Private application source code is never uploaded without explicit human authorization.
