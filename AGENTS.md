# Angora Work OS — Agent Development Rules & Knowledge Graph Protocol

## Mandatory Architecture Discovery Workflow

To maximize development efficiency, preserve context, and prevent repetitive brute-force file scanning, **all agents operating in this repository must use the local Architecture Knowledge Graph as their initial architectural lookup.**

---

### Step-by-Step Task Initiation Protocol

Before implementing, refactoring, or debugging any feature in Angora:

1. **Context Orientation**:
   - If project context or system architecture is needed, read [`docs/ai-knowledge/00-START-HERE.md`](file:///c:/Users/REYMARK/Documents/Sites/angora/docs/ai-knowledge/00-START-HERE.md).
   - Check graph freshness if major changes were recently made:
     ```bash
     node tools/graphify/query-graph.mjs freshness
     ```

2. **Graph-First Component Discovery**:
   - Query the local knowledge graph to identify the relevant controllers, policies, services, React components, and models:
     ```bash
     node tools/graphify/query-graph.mjs search "<feature_or_concept>"
     ```
   - For a specific component or policy, inspect connected callers and dependencies:
     ```bash
     node tools/graphify/query-graph.mjs related <ComponentOrPolicyName>
     ```
   - For architectural blast radius and test coverage, run impact analysis:
     ```bash
     node tools/graphify/query-graph.mjs impact <ComponentOrPolicyName>
     ```
   - To inspect how two subsystems or layers connect:
     ```bash
     node tools/graphify/query-graph.mjs path <SourceComponent> <TargetComponent>
     ```
   - For machine-readable structured output in scripts, append `--json`.

3. **Domain Documentation Consultation**:
   - Read the corresponding Obsidian architecture notes in `docs/ai-knowledge/`:
     - RBAC & Security: [`docs/ai-knowledge/04-RBAC-AND-SECURITY.md`](file:///c:/Users/REYMARK/Documents/Sites/angora/docs/ai-knowledge/04-RBAC-AND-SECURITY.md)
     - Work OS Phases & Milestones: [`docs/ai-knowledge/05-WORK-OS-PHASES.md`](file:///c:/Users/REYMARK/Documents/Sites/angora/docs/ai-knowledge/05-WORK-OS-PHASES.md)
     - Kanban Canvas & Boards: [`docs/ai-knowledge/06-KANBAN-AND-TASKS.md`](file:///c:/Users/REYMARK/Documents/Sites/angora/docs/ai-knowledge/06-KANBAN-AND-TASKS.md)
     - Frontend UI Architecture: [`docs/ai-knowledge/07-FRONTEND-DESIGN.md`](file:///c:/Users/REYMARK/Documents/Sites/angora/docs/ai-knowledge/07-FRONTEND-DESIGN.md)
     - QA & Test Suites: [`docs/ai-knowledge/08-TESTING-AND-QA.md`](file:///c:/Users/REYMARK/Documents/Sites/angora/docs/ai-knowledge/08-TESTING-AND-QA.md)

4. **Targeted Source Inspection**:
   - Inspect **only** the specific source files identified by the graph and notes.
   - Do **NOT** perform unbounded recursive directory listings or read unrelated files.
   - Search outside the graph only when a new symbol or unexpected missing connection is discovered.

5. **Direct Source Verification (Never Blindly Trust Cache)**:
   - Always verify the actual live code before writing modifications.
   - For authorization and security changes, **always directly verify Laravel policies (`app/Policies/`), controller gates, and `WorkOsPermissionService`.**

6. **Graph Maintenance & Freshness**:
   - If meaningful architectural changes are introduced (e.g., new controllers, new services, policies, or major components), regenerate the graph:
     ```bash
     node tools/graphify/generate-architecture-graph.mjs
     ```

---

### Core Principles & Prohibitions

- **Strictly Deny-by-Default RBAC**: Designers and employees cannot modify unassigned tasks or privileged metadata.
- **UI Capability-Aware**: Unauthorized features must be completely hidden (never disabled buttons or 403 pages).
- **Scope Restriction**: Strictly complete Phase 0–5 refinements. **DO NOT START PHASE 6.**
