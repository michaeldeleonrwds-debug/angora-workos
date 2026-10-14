# Handoff: Antigravity & Codex Collaboration Protocol

## 1. Division of Responsibilities

```text
┌─────────────────────────────────┐          ┌─────────────────────────────────┐
│           ANTIGRAVITY           │          │              CODEX              │
│       Implementation Agent      │ ◄──────► │     Architect & QA Reviewer     │
├─────────────────────────────────┤          ├─────────────────────────────────┤
│ • Reads requirements & specs    │          │ • Reviews high-level architecture│
│ • Inspects codebase & policies  │          │ • Audits security & RBAC gates  │
│ • Implements code & components  │          │ • Verifies Phase boundaries     │
│ • Runs tests & builds assets    │          │ • Approves QA handoffs          │
│ • Prepares concise handoffs     │          │ • Recommends optimizations      │
└─────────────────────────────────┘          └─────────────────────────────────┘
```

---

## 2. Standard Pre-Implementation Checklist
Before Antigravity writes any code:
1. **Read Core Overview**: Consult [[01-PROJECT-OVERVIEW]] and relevant [[modules/]].
2. **Inspect Existing Code**: View relevant controllers, policies, and React components.
3. **Check Knowledge Graph**: Verify component relationships and protected routes in [[graph/GRAPH_REPORT]].
4. **Confirm Scope**: Ensure work does not cross into unauthorized phases (e.g. Phase 6).

---

## 3. Standard Post-Implementation Protocol
After Antigravity completes code changes:
1. **Execute Feature Tests**:
   ```bash
   php artisan test --filter=WorkOs
   ```
2. **Execute TypeScript Static Analysis**:
   ```bash
   npm run types
   ```
3. **Execute Production Asset Build**:
   ```bash
   npm run build
   ```
4. **Inspect Git Working Tree**:
   Ensure only expected files are staged; verify no secrets, logs, or build artifacts are untracked.
5. **Prepare Structured QA Handoff**: Include changed files, commit hash, test results, and explicit notes on any trade-offs or known issues.

---

## 4. Shared Knowledge Synchronization
- Both agents consult the same approved Markdown vault (`docs/ai-knowledge/`).
- Only verified, durable decisions are recorded.
- Neither agent should flood project memory with ephemeral chat histories.
