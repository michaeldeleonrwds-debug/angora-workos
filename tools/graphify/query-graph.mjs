#!/usr/bin/env node
/**
 * Angora Architecture Knowledge Graph — Query CLI
 *
 * Fast, local architectural retrieval for development and pair programming.
 * Allows Antigravity to discover components, relationships, test suites, and
 * impact paths without brute-force filesystem scans.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const graphPath = path.join(rootDir, 'docs/ai-knowledge/graph/graph.json');

// Check graph existence
if (!fs.existsSync(graphPath)) {
  console.error(`[Error] Architecture graph not found at ${graphPath}`);
  console.error(`Run 'node tools/graphify/generate-architecture-graph.mjs' first.`);
  process.exit(1);
}

const graphData = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
const { nodes = [], edges = [], clusters = [], generated_at } = graphData;

// Index lookup maps
const nodeById = new Map();
const nodeByFile = new Map();
const nodesByLabel = new Map();

for (const node of nodes) {
  nodeById.set(node.id, node);
  if (node.file) {
    nodeByFile.set(node.file.toLowerCase(), node);
  }
  const labelKey = node.label.toLowerCase();
  if (!nodesByLabel.has(labelKey)) {
    nodesByLabel.set(labelKey, []);
  }
  nodesByLabel.get(labelKey).push(node);
}

// Build adjacency lists for fast traversal
const outboundEdges = new Map();
const inboundEdges = new Map();

for (const edge of edges) {
  if (!outboundEdges.has(edge.source)) outboundEdges.set(edge.source, []);
  outboundEdges.get(edge.source).push(edge);

  if (!inboundEdges.has(edge.target)) inboundEdges.set(edge.target, []);
  inboundEdges.get(edge.target).push(edge);
}

// Parse command line arguments
const args = process.argv.slice(2);
const isJson = args.includes('--json');
const cleanArgs = args.filter(a => a !== '--json');
const command = cleanArgs[0]?.toLowerCase() || 'help';
const queryTerm = cleanArgs[1] || '';
const secondaryTerm = cleanArgs[2] || '';

// Lightweight freshness check
function checkFreshness() {
  try {
    const graphStat = fs.statSync(graphPath);
    const keyPaths = [
      'app/Http/Controllers/KanbanController.php',
      'app/Http/Controllers/DashboardController.php',
      'app/Policies/TaskPolicy.php',
      'app/Services/Authorization/WorkOsPermissionService.php',
      'resources/js/pages/kanban/components/BoardUnifiedHeader.tsx',
    ];

    let newestSourceTime = 0;
    let newestSourceFile = '';
    for (const kp of keyPaths) {
      const full = path.join(rootDir, kp);
      if (fs.existsSync(full)) {
        const s = fs.statSync(full);
        if (s.mtimeMs > newestSourceTime) {
          newestSourceTime = s.mtimeMs;
          newestSourceFile = kp;
        }
      }
    }

    const isStale = newestSourceTime > graphStat.mtimeMs + 5000;
    return {
      generatedAt: generated_at,
      graphMtime: graphStat.mtime.toISOString(),
      isStale,
      newerFile: isStale ? newestSourceFile : null,
    };
  } catch (err) {
    return { generatedAt: generated_at, isStale: false };
  }
}

// Fuzzy find a single node by query
function findNode(identifier) {
  if (!identifier) return null;
  const term = identifier.trim().toLowerCase();

  // 1. Exact ID
  if (nodeById.has(identifier)) return nodeById.get(identifier);

  // 2. Exact file match
  const normalizedFile = identifier.replace(/\\/g, '/').toLowerCase();
  for (const [f, node] of nodeByFile.entries()) {
    if (f === normalizedFile || f.endsWith(normalizedFile)) {
      return node;
    }
  }

  // 3. Exact label match
  if (nodesByLabel.has(term)) {
    return nodesByLabel.get(term)[0];
  }

  // 4. StartsWith / EndsWith / Includes ID or Label
  for (const node of nodes) {
    const idLower = node.id.toLowerCase();
    const labelLower = node.label.toLowerCase();
    if (idLower === term || labelLower === term) return node;
    if (idLower.endsWith(`:${term}`) || labelLower === term) return node;
  }

  for (const node of nodes) {
    const idLower = node.id.toLowerCase();
    const labelLower = node.label.toLowerCase();
    if (idLower.includes(term) || labelLower.includes(term)) return node;
  }

  return null;
}

// Search across all nodes
function searchNodes(term) {
  const q = term.toLowerCase().trim();
  const results = [];

  for (const node of nodes) {
    let score = 0;
    const idLower = node.id.toLowerCase();
    const labelLower = node.label.toLowerCase();
    const fileLower = (node.file || '').toLowerCase();

    if (labelLower === q || idLower === q) score += 100;
    else if (labelLower.startsWith(q) || idLower.endsWith(`:${q}`)) score += 60;
    else if (labelLower.includes(q) || idLower.includes(q)) score += 40;
    else if (fileLower.includes(q)) score += 30;

    if (score > 0) {
      results.push({ node, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.map(r => r.node);
}

// Shortest path using BFS
function findShortestPath(startId, targetId) {
  const queue = [[startId]];
  const visited = new Set([startId]);

  while (queue.length > 0) {
    const currentPath = queue.shift();
    const currentNode = currentPath[currentPath.length - 1];

    if (currentNode === targetId) {
      return currentPath.map(id => nodeById.get(id) || { id, label: id });
    }

    // Neighbors via outbound edges
    const out = outboundEdges.get(currentNode) || [];
    for (const e of out) {
      if (!visited.has(e.target)) {
        visited.add(e.target);
        queue.push([...currentPath, e.target]);
      }
    }

    // Neighbors via inbound edges (undirected exploration for architecture relationships)
    const inEdges = inboundEdges.get(currentNode) || [];
    for (const e of inEdges) {
      if (!visited.has(e.source)) {
        visited.add(e.source);
        queue.push([...currentPath, e.source]);
      }
    }
  }

  return null;
}

// CLI Command handlers
switch (command) {
  case 'search': {
    if (!queryTerm) {
      console.log('Usage: node tools/graphify/query-graph.mjs search <query> [--json]');
      process.exit(0);
    }

    const matches = searchNodes(queryTerm);

    if (isJson) {
      console.log(JSON.stringify({ query: queryTerm, total: matches.length, results: matches }, null, 2));
      process.exit(0);
    }

    const freshness = checkFreshness();
    if (freshness.isStale) {
      console.log(`\x1b[33m[Notice: Graph may be stale relative to ${freshness.newerFile}. Run 'node tools/graphify/generate-architecture-graph.mjs' to refresh.]\x1b[0m\n`);
    }

    console.log(`\x1b[1m\x1b[36mAngora Knowledge Graph Search: "${queryTerm}"\x1b[0m (${matches.length} matches)\n`);

    if (matches.length === 0) {
      console.log(`No components or nodes found matching "${queryTerm}".`);
      process.exit(0);
    }

    // Group by node type
    const groups = {};
    for (const m of matches) {
      if (!groups[m.type]) groups[m.type] = [];
      groups[m.type].push(m);
    }

    for (const [type, items] of Object.entries(groups)) {
      console.log(`\x1b[1m[${type.toUpperCase()}]\x1b[0m (${items.length})`);
      for (const item of items.slice(0, 15)) {
        const fileStr = item.file ? `\x1b[90m-> ${item.file}\x1b[0m` : '';
        console.log(`  * \x1b[32m${item.label}\x1b[0m (${item.id}) ${fileStr}`);
      }
      if (items.length > 15) {
        console.log(`  \x1b[90m... and ${items.length - 15} more\x1b[0m`);
      }
      console.log();
    }
    break;
  }

  case 'related': {
    if (!queryTerm) {
      console.log('Usage: node tools/graphify/query-graph.mjs related <node_or_file> [--json]');
      process.exit(0);
    }

    const target = findNode(queryTerm);
    if (!target) {
      console.error(`[Error] Node or file matching "${queryTerm}" not found in graph.`);
      process.exit(1);
    }

    const out = (outboundEdges.get(target.id) || []).map(e => ({
      edge: e.relationship,
      target: nodeById.get(e.target) || { id: e.target, label: e.target },
      details: e,
    }));

    const inb = (inboundEdges.get(target.id) || []).map(e => ({
      edge: e.relationship,
      source: nodeById.get(e.source) || { id: e.source, label: e.source },
      details: e,
    }));

    if (isJson) {
      console.log(JSON.stringify({ node: target, outbound: out, inbound: inb }, null, 2));
      process.exit(0);
    }

    console.log(`\x1b[1m\x1b[36mConnected Architectural Relationships for:\x1b[0m \x1b[1m${target.label}\x1b[0m`);
    console.log(`Type: \x1b[33m${target.type}\x1b[0m | File: \x1b[90m${target.file || 'N/A'}\x1b[0m\n`);

    console.log(`\x1b[1mOutbound Relationships (Calls / Uses / Defines):\x1b[0m`);
    if (out.length === 0) {
      console.log(`  \x1b[90m(None)\x1b[0m`);
    } else {
      for (const e of out) {
        const tgt = e.target;
        console.log(`  --[\x1b[35m${e.edge}\x1b[0m]--> \x1b[32m${tgt.label}\x1b[0m (${tgt.type}) \x1b[90m${tgt.file || ''}\x1b[0m`);
      }
    }
    console.log();

    console.log(`\x1b[1mInbound Relationships (Called by / Tested by / Rendered by):\x1b[0m`);
    if (inb.length === 0) {
      console.log(`  \x1b[90m(None)\x1b[0m`);
    } else {
      for (const e of inb) {
        const src = e.source;
        console.log(`  <--[\x1b[35m${e.edge}\x1b[0m]-- \x1b[32m${src.label}\x1b[0m (${src.type}) \x1b[90m${src.file || ''}\x1b[0m`);
      }
    }
    break;
  }

  case 'impact': {
    if (!queryTerm) {
      console.log('Usage: node tools/graphify/query-graph.mjs impact <node_or_file> [--json]');
      process.exit(0);
    }

    const target = findNode(queryTerm);
    if (!target) {
      console.error(`[Error] Node or file matching "${queryTerm}" not found in graph.`);
      process.exit(1);
    }

    // Direct dependents
    const dependents = (inboundEdges.get(target.id) || []).map(e => ({
      relationship: e.relationship,
      node: nodeById.get(e.source) || { id: e.source, label: e.source, type: 'unknown' }
    }));

    // Direct dependencies
    const dependencies = (outboundEdges.get(target.id) || []).map(e => ({
      relationship: e.relationship,
      node: nodeById.get(e.target) || { id: e.target, label: e.target, type: 'unknown' }
    }));

    // Find tests covering this node directly or indirectly
    const tests = [];
    for (const dep of dependents) {
      if (dep.node.type === 'test') {
        tests.push(dep.node);
      }
    }

    // Also look for test nodes mentioning this node's name
    for (const n of nodes) {
      if (n.type === 'test' && !tests.some(t => t.id === n.id)) {
        const tEdges = outboundEdges.get(n.id) || [];
        if (tEdges.some(te => te.target === target.id)) {
          tests.push(n);
        }
      }
    }

    if (isJson) {
      console.log(JSON.stringify({ node: target, dependents, dependencies, tests }, null, 2));
      process.exit(0);
    }

    console.log(`\x1b[1m\x1b[36mArchitectural Blast Radius & Impact Analysis:\x1b[0m \x1b[1m${target.label}\x1b[0m`);
    console.log(`Target: \x1b[32m${target.label}\x1b[0m (${target.type}) -> \x1b[90m${target.file || 'N/A'}\x1b[0m\n`);

    console.log(`\x1b[1m1. Upstream Callers & Dependents (Risk surface if modified):\x1b[0m`);
    if (dependents.length === 0) {
      console.log(`  \x1b[90mNo direct upstream callers indexed.\x1b[0m`);
    } else {
      for (const d of dependents) {
        console.log(`  * \x1b[33m${d.node.label}\x1b[0m [${d.node.type}] via \x1b[35m${d.relationship}\x1b[0m \x1b[90m(${d.node.file || 'Dynamic'})\x1b[0m`);
      }
    }
    console.log();

    console.log(`\x1b[1m2. Downstream Dependencies (Components/Policies relied upon):\x1b[0m`);
    if (dependencies.length === 0) {
      console.log(`  \x1b[90mNo downstream dependencies indexed.\x1b[0m`);
    } else {
      for (const d of dependencies) {
        console.log(`  * \x1b[32m${d.node.label}\x1b[0m [${d.node.type}] via \x1b[35m${d.relationship}\x1b[0m \x1b[90m(${d.node.file || 'Dynamic'})\x1b[0m`);
      }
    }
    console.log();

    console.log(`\x1b[1m3. Test Coverage Suites (Run these after changes):\x1b[0m`);
    if (tests.length === 0) {
      console.log(`  \x1b[90mNo directly linked Feature tests found.\x1b[0m`);
    } else {
      for (const t of tests) {
        console.log(`  * \x1b[36m${t.label}\x1b[0m -> \x1b[90m${t.file || ''}\x1b[0m`);
      }
    }
    break;
  }

  case 'path': {
    if (!queryTerm || !secondaryTerm) {
      console.log('Usage: node tools/graphify/query-graph.mjs path <source> <target> [--json]');
      process.exit(0);
    }

    const src = findNode(queryTerm);
    const tgt = findNode(secondaryTerm);

    if (!src) {
      console.error(`[Error] Source component "${queryTerm}" not found.`);
      process.exit(1);
    }
    if (!tgt) {
      console.error(`[Error] Target component "${secondaryTerm}" not found.`);
      process.exit(1);
    }

    const shortestPath = findShortestPath(src.id, tgt.id);

    if (isJson) {
      console.log(JSON.stringify({ source: src, target: tgt, path: shortestPath }, null, 2));
      process.exit(0);
    }

    console.log(`\x1b[1m\x1b[36mArchitecture Path:\x1b[0m \x1b[1m${src.label}\x1b[0m -> \x1b[1m${tgt.label}\x1b[0m\n`);

    if (!shortestPath) {
      console.log(`No direct or indirect connection path found between ${src.label} and ${tgt.label}.`);
      process.exit(0);
    }

    console.log(`Path Length: ${shortestPath.length - 1} hops\n`);
    for (let i = 0; i < shortestPath.length; i++) {
      const step = shortestPath[i];
      const isLast = i === shortestPath.length - 1;
      const arrow = isLast ? '' : ' \x1b[35m--->\x1b[0m';
      console.log(`  [${i + 1}] \x1b[32m${step.label}\x1b[0m (\x1b[33m${step.type || 'node'}\x1b[0m) \x1b[90m${step.file || ''}\x1b[0m${arrow}`);
    }
    break;
  }

  case 'tests': {
    if (!queryTerm) {
      console.log('Usage: node tools/graphify/query-graph.mjs tests <component_or_policy> [--json]');
      process.exit(0);
    }

    const node = findNode(queryTerm);
    if (!node) {
      console.error(`[Error] Node matching "${queryTerm}" not found.`);
      process.exit(1);
    }

    // Direct inbound test edges
    const directTests = (inboundEdges.get(node.id) || [])
      .filter(e => e.relationship === 'tests' || (nodeById.get(e.source) && nodeById.get(e.source).type === 'test'))
      .map(e => nodeById.get(e.source));

    // Also look for test files referencing this node's name in their ID or labels
    const allTests = [...directTests];
    const nodeName = node.label.toLowerCase();
    for (const n of nodes) {
      if (n.type === 'test' && !allTests.some(t => t.id === n.id)) {
        if (n.id.toLowerCase().includes(nodeName) || n.label.toLowerCase().includes(nodeName)) {
          allTests.push(n);
        }
      }
    }

    if (isJson) {
      console.log(JSON.stringify({ component: node, tests: allTests }, null, 2));
      process.exit(0);
    }

    console.log(`\x1b[1m\x1b[36mRelevant Feature Tests for:\x1b[0m \x1b[1m${node.label}\x1b[0m (${allTests.length} tests)\n`);
    if (allTests.length === 0) {
      console.log(`No specific tests directly mapped to ${node.label}.`);
    } else {
      for (const t of allTests) {
        console.log(`  * \x1b[32m${t.label}\x1b[0m -> \x1b[90m${t.file || ''}\x1b[0m`);
      }
    }
    break;
  }

  case 'clusters':
  case 'subsystems': {
    if (isJson) {
      console.log(JSON.stringify({ clusters }, null, 2));
      process.exit(0);
    }

    console.log(`\x1b[1m\x1b[36mAngora Work OS Architecture Subsystems (${clusters.length} Subsystems)\x1b[0m\n`);
    for (const c of clusters) {
      console.log(`\x1b[1m* ${c.label}\x1b[0m (ID: \x1b[33m${c.id}\x1b[0m)`);
      for (const nid of c.nodes) {
        const n = nodeById.get(nid);
        if (n) {
          console.log(`    - \x1b[32m${n.label}\x1b[0m (${n.type}) \x1b[90m${n.file || ''}\x1b[0m`);
        } else {
          console.log(`    - ${nid}`);
        }
      }
      console.log();
    }
    break;
  }

  case 'status':
  case 'freshness': {
    const freshness = checkFreshness();
    const stats = {
      total_nodes: nodes.length,
      total_edges: edges.length,
      clusters: clusters.length,
      ...freshness,
    };

    if (isJson) {
      console.log(JSON.stringify(stats, null, 2));
      process.exit(0);
    }

    console.log(`\x1b[1m\x1b[36mAngora Knowledge Graph Status:\x1b[0m`);
    console.log(`  Total Nodes: \x1b[32m${nodes.length}\x1b[0m`);
    console.log(`  Total Edges: \x1b[32m${edges.length}\x1b[0m`);
    console.log(`  Subsystems:  \x1b[32m${clusters.length}\x1b[0m`);
    console.log(`  Generated:   \x1b[90m${generated_at}\x1b[0m`);
    console.log(`  Freshness:   ${freshness.isStale ? `\x1b[33mSTALE (Source ${freshness.newerFile} was modified after graph)\x1b[0m` : `\x1b[32mFRESH\x1b[0m`}`);
    break;
  }

  case 'help':
  default: {
    console.log(`\x1b[1m\x1b[36mAngora Work OS — Architecture Knowledge Graph Query CLI\x1b[0m

Usage:
  node tools/graphify/query-graph.mjs search <query> [--json]
  node tools/graphify/query-graph.mjs related <node_or_file> [--json]
  node tools/graphify/query-graph.mjs impact <node_or_file> [--json]
  node tools/graphify/query-graph.mjs path <source> <target> [--json]
  node tools/graphify/query-graph.mjs tests <node_or_file> [--json]
  node tools/graphify/query-graph.mjs subsystems [--json]
  node tools/graphify/query-graph.mjs freshness [--json]

Examples:
  node tools/graphify/query-graph.mjs search permissions
  node tools/graphify/query-graph.mjs related TaskPolicy
  node tools/graphify/query-graph.mjs impact WorkOsPermissionService
  node tools/graphify/query-graph.mjs path KanbanController TaskPolicy
  node tools/graphify/query-graph.mjs tests TaskPolicy
`);
    break;
  }
}
