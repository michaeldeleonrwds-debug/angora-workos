---
name: angora-architecture-graph
description: >-
  Use this skill to query and inspect the local Angora Work OS Architecture Knowledge Graph.
  Enables fast component discovery, impact analysis, dependency tracing, and test suite mapping
  using the local Node.js graph engine without brute-force directory scans.
---

# Angora Architecture Knowledge Graph Skill

This skill provides fast, deterministic architectural retrieval for Angora Work OS using the local Graphify knowledge graph located at `docs/ai-knowledge/graph/graph.json`.

## When to Use This Skill

- Before starting a new task, refactor, or bug fix on Angora Work OS.
- To discover which controllers, policies, services, components, and models handle a feature.
- To assess the impact/blast radius of changing a policy, service, or component.
- To find test suites covering specific controllers, policies, or frontend components.
- To trace the architectural path between two distant components.

## Available Query Commands

Run queries using the Node.js CLI tool:

### 1. Search for Components, Services, Routes, or Policies
```bash
node tools/graphify/query-graph.mjs search "<term>"
# Add --json for machine-readable JSON:
node tools/graphify/query-graph.mjs search "<term>" --json
```

### 2. Inspect Direct Relationships
Find inbound callers, importers, tests, and outbound dependencies:
```bash
node tools/graphify/query-graph.mjs related <ComponentNameOrPolicy>
```

### 3. Impact & Blast Radius Analysis
Discover upstream dependents, downstream dependencies, and covering test suites:
```bash
node tools/graphify/query-graph.mjs impact <ComponentNameOrPolicy>
```

### 4. Trace Architectural Path Between Two Nodes
Find the shortest connection path between two components across layers:
```bash
node tools/graphify/query-graph.mjs path <SourceComponent> <TargetComponent>
```

### 5. Find Relevant Tests
List test suites that exercise or audit a specific component:
```bash
node tools/graphify/query-graph.mjs tests <ComponentNameOrPolicy>
```

### 6. Check Graph Freshness & Subsystems
```bash
node tools/graphify/query-graph.mjs freshness
node tools/graphify/query-graph.mjs subsystems
```

## Graph Regeneration

If new files or major architectural components have been added:
```bash
node tools/graphify/generate-architecture-graph.mjs
```
