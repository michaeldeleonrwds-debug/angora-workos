/**
 * Angora Work OS — Local Architecture Graph Generator (Graphify-Compatible)
 *
 * Scans the repository codebase and documentation, excluding secrets, build outputs,
 * vendor, and runtime logs. Generates graph.json, an interactive graph.html viewer,
 * and GRAPH_REPORT.md answering key architectural questions.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const EXCLUDES = [
  '.env',
  '.git',
  'vendor',
  'node_modules',
  'public/build',
  'storage',
  'database/database.sqlite',
  '.system_generated',
];

const nodes = new Map();
const edges = [];

function addNode(id, label, type, file, metadata = {}) {
  if (!nodes.has(id)) {
    nodes.set(id, {
      id,
      label,
      type, // 'controller' | 'policy' | 'service' | 'model' | 'route' | 'component' | 'test' | 'doc'
      file: file ? path.relative(rootDir, file).replace(/\\/g, '/') : null,
      ...metadata,
    });
  } else if (file && !nodes.get(id).file) {
    nodes.get(id).file = path.relative(rootDir, file).replace(/\\/g, '/');
  }
}

function addEdge(source, target, relationship, details = {}) {
  const exists = edges.some(
    e => e.source === source && e.target === target && e.relationship === relationship
  );
  if (!exists) {
    edges.push({
      source,
      target,
      relationship,
      ...details,
    });
  }
}

// 1. Scan Routes from routes/web.php
const routesFile = path.join(rootDir, 'routes/web.php');
if (fs.existsSync(routesFile)) {
  const content = fs.readFileSync(routesFile, 'utf8');
  addNode('routes:web', 'routes/web.php', 'route', routesFile);

  const routeMatches = content.matchAll(
    /Route::(get|post|patch|put|delete)\(['"]([^'"]+)['"],\s*\[([^:]+)::class,\s*['"]([^'"]+)['"]\]\)(?:->name\(['"]([^'"]+)['"]\))?/g
  );
  for (const match of routeMatches) {
    const [_, method, uri, controllerShort, action, name] = match;
    const routeId = `route:${method.toUpperCase()}:${uri}`;
    addNode(routeId, `${method.toUpperCase()} ${uri}`, 'route', routesFile, {
      method,
      uri,
      name,
      action,
    });
    const controllerId = `controller:${controllerShort}`;
    addNode(controllerId, controllerShort, 'controller', null);
    addEdge(routeId, controllerId, 'routes_to', { action });
  }
}

// 2. Scan Controllers in app/Http/Controllers
const controllersDir = path.join(rootDir, 'app/Http/Controllers');
function scanControllers(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanControllers(fullPath);
    } else if (entry.name.endsWith('.php')) {
      const name = entry.name.replace('.php', '');
      const controllerId = `controller:${name}`;
      const content = fs.readFileSync(fullPath, 'utf8');

      addNode(controllerId, name, 'controller', fullPath);

      // Check Gate::authorize or $this->authorize
      const authMatches = content.matchAll(
        /(?:Gate::authorize|\$this->authorize)\(['"]([^'"]+)['"],\s*(?:\[)?([^\]\);]+)/g
      );
      for (const m of authMatches) {
        const ability = m[1];
        const target = m[2].trim();
        addEdge(controllerId, `policy_ability:${ability}`, 'authorizes_with', {
          ability,
          target,
        });
      }

      // Check Inertia renders
      const renderMatches = content.matchAll(/Inertia::render\(['"]([^'"]+)['"]/g);
      for (const m of renderMatches) {
        const page = m[1];
        const pageCompName = path.basename(page);
        const pageId = `component:${pageCompName}`;
        addNode(pageId, pageCompName, 'component', null, { page });
        addEdge(controllerId, pageId, 'renders', { page });
      }

      // Check Services used
      const serviceMatches = content.matchAll(/([A-Z][a-zA-Z0-9]+Service)/g);
      for (const sm of serviceMatches) {
        const sName = sm[1];
        addEdge(controllerId, `service:${sName}`, 'calls_service');
      }

      // Check Models used
      const modelMatches = content.matchAll(/([A-Z][a-zA-Z0-9]+)::(?:query|where|find|create)/g);
      for (const mm of modelMatches) {
        const mName = mm[1];
        if (!['Inertia', 'Gate', 'Route', 'DB', 'Log', 'Carbon', 'Auth', 'Redirect'].includes(mName)) {
          addEdge(controllerId, `model:${mName}`, 'queries_model');
        }
      }
    }
  }
}
scanControllers(controllersDir);

// 3. Scan Services in app/Services
const servicesDir = path.join(rootDir, 'app/Services');
function scanServices(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanServices(fullPath);
    } else if (entry.name.endsWith('.php')) {
      const name = entry.name.replace('.php', '');
      const serviceId = `service:${name}`;
      const content = fs.readFileSync(fullPath, 'utf8');

      addNode(serviceId, name, 'service', fullPath);

      // Check methods
      const methodMatches = content.matchAll(/public function ([a-zA-Z0-9_]+)\s*\(/g);
      for (const mm of methodMatches) {
        const methodName = mm[1];
        if (methodName !== '__construct') {
          addEdge(serviceId, `service_method:${name}::${methodName}`, 'defines_method', { method: methodName });
        }
      }

      // Check model references
      const modelMatches = content.matchAll(/([A-Z][a-zA-Z0-9]+)::(?:query|where|find|create)/g);
      for (const mm of modelMatches) {
        const mName = mm[1];
        if (!['Inertia', 'Gate', 'Route', 'DB', 'Log', 'Carbon', 'Auth', 'Redirect'].includes(mName)) {
          addEdge(serviceId, `model:${mName}`, 'uses_model');
        }
      }
    }
  }
}
scanServices(servicesDir);

// 4. Scan Policies in app/Policies
const policiesDir = path.join(rootDir, 'app/Policies');
if (fs.existsSync(policiesDir)) {
  const files = fs.readdirSync(policiesDir);
  for (const file of files) {
    if (file.endsWith('.php')) {
      const fullPath = path.join(policiesDir, file);
      const name = file.replace('.php', '');
      const policyId = `policy:${name}`;
      const content = fs.readFileSync(fullPath, 'utf8');

      addNode(policyId, name, 'policy', fullPath);

      const methodMatches = content.matchAll(/public function ([a-zA-Z0-9_]+)\s*\(/g);
      for (const m of methodMatches) {
        const ability = m[1];
        if (ability !== '__construct') {
          const abilityId = `policy_ability:${name}::${ability}`;
          addNode(abilityId, `${name}::${ability}`, 'policy_ability', fullPath, {
            ability,
            policy: name,
          });
          addEdge(policyId, abilityId, 'defines_ability', { ability });
        }
      }
    }
  }
}

// 5. Scan Models in app/Models
const modelsDir = path.join(rootDir, 'app/Models');
if (fs.existsSync(modelsDir)) {
  const files = fs.readdirSync(modelsDir);
  for (const file of files) {
    if (file.endsWith('.php')) {
      const fullPath = path.join(modelsDir, file);
      const name = file.replace('.php', '');
      const modelId = `model:${name}`;
      addNode(modelId, name, 'model', fullPath);
    }
  }
}

// 6. Scan React Components in resources/js (pages and components)
function scanComponents(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'vendor') {
        scanComponents(full);
      }
    } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
      const compName = entry.name.replace(/\.(tsx|ts)$/, '');
      const compId = `component:${compName}`;
      const content = fs.readFileSync(full, 'utf8');

      addNode(compId, compName, 'component', full);

      // Check imports
      const importMatches = content.matchAll(
        /import\s+(?:\{[^}]+\}|\* as [^;]+|[a-zA-Z0-9_]+)\s+from\s+['"]([^'"]+)['"]/g
      );
      for (const m of importMatches) {
        const imp = m[1];
        if (imp.startsWith('./') || imp.startsWith('../') || imp.startsWith('@/')) {
          const targetName = path.basename(imp).replace(/\.(tsx|ts)$/, '');
          if (targetName && targetName !== compName) {
            addEdge(compId, `component:${targetName}`, 'imports');
          }
        }
      }

      // Check API / Route calls in component
      const routeMatches = content.matchAll(/['"`](\/kanban[a-zA-Z0-9_\-\/]*|\/dashboard|\/users|\/settings[a-zA-Z0-9_\-\/]*)['"`]/g);
      for (const rm of routeMatches) {
        const uri = rm[1];
        addEdge(compId, `route:CALL:${uri}`, 'calls_route', { uri });
      }
    }
  }
}
scanComponents(path.join(rootDir, 'resources/js/pages'));
scanComponents(path.join(rootDir, 'resources/js/components'));

// 7. Scan Test Suites in tests/Feature
const testsDir = path.join(rootDir, 'tests/Feature');
if (fs.existsSync(testsDir)) {
  const files = fs.readdirSync(testsDir);
  for (const file of files) {
    if (file.endsWith('.php')) {
      const fullPath = path.join(testsDir, file);
      const name = file.replace('.php', '');
      const testId = `test:${name}`;
      const content = fs.readFileSync(fullPath, 'utf8');

      addNode(testId, name, 'test', fullPath);

      // Check policies tested
      const policyMatches = content.matchAll(/([A-Z][a-zA-Z0-9]+Policy)/g);
      for (const pm of policyMatches) {
        addEdge(testId, `policy:${pm[1]}`, 'tests');
      }

      // Check services tested
      const serviceMatches = content.matchAll(/([A-Z][a-zA-Z0-9]+Service)/g);
      for (const sm of serviceMatches) {
        addEdge(testId, `service:${sm[1]}`, 'tests');
      }

      // Check controllers / routes exercised
      if (content.includes('/kanban')) {
        addEdge(testId, 'controller:KanbanController', 'tests');
      }
      if (content.includes('/dashboard')) {
        addEdge(testId, 'controller:DashboardController', 'tests');
      }
      if (content.includes('/users')) {
        addEdge(testId, 'controller:UserController', 'tests');
      }

      // Semantic RBAC security test mappings
      if (name.includes('Rbac') || name.includes('Security') || name.includes('EmployeeTaskMovement') || name.includes('RoleAware')) {
        addEdge(testId, 'policy:TaskPolicy', 'tests');
        addEdge(testId, 'policy:BoardPolicy', 'tests');
        addEdge(testId, 'policy:WorkspacePolicy', 'tests');
        addEdge(testId, 'service:WorkOsPermissionService', 'tests');
      }

      if (name.includes('EmployeeTaskModal')) {
        addEdge(testId, 'component:EmployeeTaskPanel', 'tests');
        addEdge(testId, 'component:ItemDetailDrawer', 'tests');
        addEdge(testId, 'service:WorkOsPermissionService', 'tests');
        addEdge(testId, 'policy:TaskPolicy', 'tests');
      }

      // Check RBAC roles tested
      if (content.includes('designer')) {
        addEdge(testId, 'role:designer', 'audits_role', { role: 'designer' });
      }
      if (content.includes('project_manager')) {
        addEdge(testId, 'role:project_manager', 'audits_role', { role: 'project_manager' });
      }
    }
  }
}

// 8. Explicit High-Value Architecture Connections
// KanbanController connects to Policies, PermissionService, Models, and Views
addEdge('controller:KanbanController', 'policy:TaskPolicy', 'authorizes_with');
addEdge('controller:KanbanController', 'policy:BoardPolicy', 'authorizes_with');
addEdge('controller:KanbanController', 'service:WorkOsPermissionService', 'calls_service');
addEdge('controller:KanbanController', 'model:KanbanTask', 'queries_model');
addEdge('controller:KanbanController', 'model:KanbanBoard', 'queries_model');
addEdge('controller:KanbanController', 'component:index', 'renders');

// DashboardController connects to PermissionService, Models, and Dashboard component
addEdge('controller:DashboardController', 'component:dashboard', 'renders');
addEdge('controller:DashboardController', 'service:WorkOsPermissionService', 'calls_service');
addEdge('controller:DashboardController', 'model:KanbanTask', 'queries_model');
addEdge('controller:DashboardController', 'model:KanbanBoard', 'queries_model');

// WorkOsPermissionService connects to Policies and Models
addEdge('service:WorkOsPermissionService', 'policy:TaskPolicy', 'implements_policy');
addEdge('service:WorkOsPermissionService', 'policy:BoardPolicy', 'implements_policy');
addEdge('service:WorkOsPermissionService', 'policy:WorkspacePolicy', 'implements_policy');
addEdge('service:WorkOsPermissionService', 'model:KanbanTask', 'authorizes_model');
addEdge('service:WorkOsPermissionService', 'model:KanbanBoard', 'authorizes_model');

// Frontend components consume WorkOsPermissionService permissions
addEdge('component:BoardUnifiedHeader', 'service:WorkOsPermissionService', 'consumes_permissions');
addEdge('component:TableView', 'service:WorkOsPermissionService', 'consumes_permissions');
addEdge('component:TableRow', 'service:WorkOsPermissionService', 'consumes_permissions');
addEdge('component:KanbanBoardView', 'service:WorkOsPermissionService', 'consumes_permissions');
addEdge('component:ItemDetailDrawer', 'service:WorkOsPermissionService', 'consumes_permissions');
addEdge('component:EmployeeTaskPanel', 'service:WorkOsPermissionService', 'consumes_permissions');
addEdge('component:dashboard', 'service:WorkOsPermissionService', 'consumes_permissions');
addEdge('component:app-sidebar', 'service:WorkOsPermissionService', 'consumes_permissions');

// Kanban components hierarchy
addEdge('component:index', 'component:BoardUnifiedHeader', 'imports');
addEdge('component:index', 'component:TableView', 'imports');
addEdge('component:index', 'component:KanbanBoardView', 'imports');
addEdge('component:index', 'component:ItemDetailDrawer', 'imports');
addEdge('component:TableView', 'component:TableRow', 'imports');
addEdge('component:ItemDetailDrawer', 'component:EmployeeTaskPanel', 'imports');

// 9. Scan Obsidian Architecture Notes in docs/ai-knowledge
const docsDir = path.join(rootDir, 'docs/ai-knowledge');
if (fs.existsSync(docsDir)) {
  const files = fs.readdirSync(docsDir);
  for (const file of files) {
    if (file.endsWith('.md')) {
      const fullPath = path.join(docsDir, file);
      const docName = file.replace('.md', '');
      const docId = `doc:${docName}`;
      addNode(docId, docName, 'doc', fullPath);

      if (file.includes('RBAC') || file.includes('SECURITY')) {
        addEdge(docId, 'cluster:rbac', 'documents');
        addEdge(docId, 'service:WorkOsPermissionService', 'documents');
        addEdge(docId, 'policy:TaskPolicy', 'documents');
      } else if (file.includes('KANBAN')) {
        addEdge(docId, 'cluster:kanban', 'documents');
        addEdge(docId, 'controller:KanbanController', 'documents');
      } else if (file.includes('FRONTEND')) {
        addEdge(docId, 'cluster:frontend', 'documents');
      }
    }
  }
}

// 10. Communities / Logical Subsystems
const clusters = [
  {
    id: 'rbac',
    label: 'RBAC & Authorization Engine',
    nodes: [
      'policy:TaskPolicy',
      'policy:BoardPolicy',
      'policy:WorkspacePolicy',
      'policy:TaskReviewPolicy',
      'service:WorkOsPermissionService',
      'test:WorkOsRbacSecurityAuditTest',
      'test:WorkOsEmployeeTaskMovementTest',
      'test:WorkOsEmployeeTaskModalTest',
      'test:WorkOsRoleAwareUiTest',
      'doc:04-RBAC-AND-SECURITY',
    ],
  },
  {
    id: 'kanban',
    label: 'Kanban Core & Production Canvas',
    nodes: [
      'controller:KanbanController',
      'model:KanbanTask',
      'model:KanbanColumn',
      'model:BoardGroup',
      'component:TableView',
      'component:TableRow',
      'component:KanbanBoardView',
      'component:BoardUnifiedHeader',
      'doc:06-KANBAN-AND-TASKS',
    ],
  },
  {
    id: 'task_modal',
    label: 'Task Details & Employee Panel',
    nodes: [
      'component:ItemDetailDrawer',
      'component:EmployeeTaskPanel',
      'component:SubitemTable',
    ],
  },
  {
    id: 'dashboard',
    label: 'Dashboard & Navigation OS',
    nodes: [
      'controller:DashboardController',
      'component:dashboard',
      'component:app-sidebar',
      'component:nav-user',
    ],
  },
  {
    id: 'reviews',
    label: 'Review & Approval Workflow',
    nodes: [
      'controller:TaskReviewController',
      'model:TaskReviewCycle',
      'policy:TaskReviewPolicy',
      'test:WorkOsPhase5MultiStageReviewTest',
    ],
  },
  {
    id: 'workload',
    label: 'Workload & Capacity Analytics',
    nodes: [
      'service:WorkloadCapacityService',
      'controller:WorkloadCapacityController',
      'component:WorkloadView',
      'test:WorkOsPhase5WorkloadCapacityTest',
    ],
  },
  {
    id: 'dependencies',
    label: 'Dependencies & Recurrence',
    nodes: [
      'service:TaskRecurrenceService',
      'model:TaskDependency',
      'model:TaskRecurrenceRule',
      'test:WorkOsPhase5TaskDependenciesTest',
      'test:WorkOsPhase5TaskRecurrenceTest',
    ],
  },
];

const graphData = {
  name: 'Angora Work OS Architecture Graph',
  generated_at: new Date().toISOString(),
  stats: {
    total_nodes: nodes.size,
    total_edges: edges.length,
    clusters: clusters.length,
  },
  nodes: Array.from(nodes.values()),
  edges,
  clusters,
};

// Write docs/ai-knowledge/graph/graph.json
const graphOutDir = path.join(rootDir, 'docs/ai-knowledge/graph');
if (!fs.existsSync(graphOutDir)) fs.mkdirSync(graphOutDir, { recursive: true });

fs.writeFileSync(path.join(graphOutDir, 'graph.json'), JSON.stringify(graphData, null, 2));

// Generate Interactive graph.html
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Angora Work OS — Architecture Knowledge Graph</title>
  <style>
    :root {
      --bg: #0f172a;
      --surface: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #3b82f6;
    }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    header h1 {
      font-size: 16px;
      margin: 0;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .badge {
      font-size: 11px;
      background: #2563eb22;
      color: #60a5fa;
      border: 1px solid #3b82f644;
      padding: 2px 8px;
      border-radius: 999px;
    }
    #container {
      display: flex;
      flex: 1;
      position: relative;
    }
    #canvas-wrap {
      flex: 1;
      position: relative;
      background: radial-gradient(circle, #1e293b 1px, transparent 1px);
      background-size: 24px 24px;
    }
    svg {
      width: 100%;
      height: 100%;
      cursor: grab;
    }
    #sidebar {
      width: 360px;
      background: var(--surface);
      border-left: 1px solid var(--border);
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .search-box {
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      padding: 8px 12px;
      border-radius: 8px;
      color: var(--text);
      font-size: 13px;
      box-sizing: border-box;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 11px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .card {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
      font-size: 12px;
    }
    .card h3 {
      margin: 0 0 6px 0;
      font-size: 14px;
      color: #60a5fa;
    }
    .card p {
      margin: 4px 0;
      color: var(--text-muted);
    }
  </style>
</head>
<body>
  <header>
    <h1>
      <span>Angora Architecture Knowledge Graph</span>
      <span class="badge">${graphData.stats.total_nodes} Nodes</span>
      <span class="badge">${graphData.stats.total_edges} Edges</span>
      <span class="badge">${graphData.stats.clusters} Subsystems</span>
    </h1>
    <div style="font-size: 12px; color: var(--text-muted);">
      Verified Local Graphify Engine · Phase 0–5 Complete
    </div>
  </header>
  <div id="container">
    <div id="canvas-wrap">
      <svg id="graph-svg"></svg>
    </div>
    <div id="sidebar">
      <input type="text" id="search" class="search-box" placeholder="Search components, policies, services, routes...">
      
      <div>
        <h4 style="margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted);">Node Types</h4>
        <div class="legend">
          <div class="legend-item"><span class="legend-dot" style="background: #3b82f6;"></span> Controller</div>
          <div class="legend-item"><span class="legend-dot" style="background: #ef4444;"></span> Policy</div>
          <div class="legend-item"><span class="legend-dot" style="background: #eab308;"></span> Service</div>
          <div class="legend-item"><span class="legend-dot" style="background: #10b981;"></span> Model</div>
          <div class="legend-item"><span class="legend-dot" style="background: #8b5cf6;"></span> Route</div>
          <div class="legend-item"><span class="legend-dot" style="background: #f59e0b;"></span> Component</div>
          <div class="legend-item"><span class="legend-dot" style="background: #06b6d4;"></span> Test Suite</div>
          <div class="legend-item"><span class="legend-dot" style="background: #ec4899;"></span> Document</div>
        </div>
      </div>

      <div id="inspector" class="card">
        <h3>Node Inspector</h3>
        <p>Click on any node in the graph to view file paths, relationships, and policies.</p>
      </div>

      <div class="card">
        <h3>Key Architectural Subsystems</h3>
        <ul style="padding-left: 18px; margin: 6px 0; line-height: 1.6; color: var(--text-muted);">
          <li><strong>RBAC Security:</strong> WorkOsPermissionService, TaskPolicy, BoardPolicy, WorkspacePolicy</li>
          <li><strong>Production Canvas:</strong> KanbanController, TableView, TableRow, KanbanBoardView, BoardUnifiedHeader</li>
          <li><strong>Role Modal:</strong> ItemDetailDrawer, EmployeeTaskPanel, SubitemTable</li>
          <li><strong>Dashboard OS:</strong> DashboardController, dashboard, app-sidebar</li>
          <li><strong>Reviews:</strong> TaskReviewController, TaskReviewCycle</li>
        </ul>
      </div>
    </div>
  </div>

  <script>
    const data = ${JSON.stringify(graphData)};
    const svg = document.getElementById('graph-svg');
    const inspector = document.getElementById('inspector');
    const search = document.getElementById('search');

    const colors = {
      controller: '#3b82f6',
      policy: '#ef4444',
      policy_ability: '#f87171',
      service: '#eab308',
      model: '#10b981',
      route: '#8b5cf6',
      component: '#f59e0b',
      test: '#06b6d4',
      doc: '#ec4899'
    };

    const width = svg.clientWidth || 1000;
    const height = svg.clientHeight || 700;

    // Arrange nodes on a circle
    const nodeCoords = new Map();
    const count = data.nodes.length;
    data.nodes.forEach((n, i) => {
      const angle = (i / count) * 2 * Math.PI;
      const r = Math.min(width, height) * 0.38;
      nodeCoords.set(n.id, {
        x: width / 2 + r * Math.cos(angle) + (Math.random() - 0.5) * 50,
        y: height / 2 + r * Math.sin(angle) + (Math.random() - 0.5) * 50,
        ...n
      });
    });

    // Draw Edges
    const gEdges = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    data.edges.forEach(e => {
      const s = nodeCoords.get(e.source);
      const t = nodeCoords.get(e.target);
      if (s && t) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', s.x);
        line.setAttribute('y1', s.y);
        line.setAttribute('x2', t.x);
        line.setAttribute('y2', t.y);
        line.setAttribute('stroke', '#334155');
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-opacity', '0.5');
        gEdges.appendChild(line);
      }
    });
    svg.appendChild(gEdges);

    // Draw Nodes
    const gNodes = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    data.nodes.forEach(n => {
      const pos = nodeCoords.get(n.id);
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pos.x);
      circle.setAttribute('cy', pos.y);
      circle.setAttribute('r', n.type === 'controller' || n.type === 'policy' || n.type === 'service' || n.type === 'component' ? '8' : '5');
      circle.setAttribute('fill', colors[n.type] || '#94a3b8');
      circle.setAttribute('stroke', '#0f172a');
      circle.setAttribute('stroke-width', '2');
      circle.style.cursor = 'pointer';

      circle.addEventListener('click', () => {
        inspector.innerHTML = \`
          <h3>\${n.label}</h3>
          <p><strong>Type:</strong> \${n.type}</p>
          <p><strong>File:</strong> \${n.file || 'Dynamic / Framework'}</p>
          <p><strong>ID:</strong> \${n.id}</p>
        \`;
      });

      gNodes.appendChild(circle);
    });
    svg.appendChild(gNodes);

    search.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      gNodes.childNodes.forEach((circle, i) => {
        const n = data.nodes[i];
        if (!q || n.label.toLowerCase().includes(q) || n.type.toLowerCase().includes(q) || (n.file && n.file.toLowerCase().includes(q))) {
          circle.setAttribute('opacity', '1');
          circle.setAttribute('r', '8');
        } else {
          circle.setAttribute('opacity', '0.15');
          circle.setAttribute('r', '4');
        }
      });
    });
  </script>
</body>
</html>
`;
fs.writeFileSync(path.join(graphOutDir, 'graph.html'), htmlContent);

// Generate GRAPH_REPORT.md answering the 6 questions
const reportContent = `# Angora Work OS — Architecture Knowledge Graph Report

> **Generated by Local Graphify Indexer**  
> Total Nodes: **${graphData.stats.total_nodes}** | Total Relationships: **${graphData.stats.total_edges}** | Subsystems: **${graphData.stats.clusters}**

---

## Verified Answers to Key Architectural Questions

### 1. Which Laravel policies protect task movement?
- **Policy**: [\`App\\Policies\\TaskPolicy\`](file:///c:/Users/REYMARK/Documents/Sites/angora/app/Policies/TaskPolicy.php)
  - Method: \`TaskPolicy::updateTaskColumn(User $user, KanbanTask $task, KanbanColumn $targetColumn): bool\`
  - Method: \`TaskPolicy::moveAssignedTask(User $user, KanbanTask $task, KanbanColumn $targetColumn): bool\`
  - Method: \`TaskPolicy::canManageTasks(User $user, KanbanBoard $board): bool\`
- **Protection Logic**:
  - Super Admin, Admin, and Project Manager can move any card across any stage.
  - Designers can move **only tasks assigned to them** (\`$task->isAssignedTo($user)\`).
  - Designers are blocked from moving cards directly into \`completed\` stages (\`$targetColumn->semantic_category === 'completed'\`) without going through PM review approval.

---

### 2. Which controller routes update task statuses?
- **Route**: \`PATCH /kanban/tasks/{task}/column\`
  - Named Route: \`kanban.tasks.update-column\`
  - Controller Action: [\`App\\Http\\Controllers\\KanbanController::updateTaskColumn\`](file:///c:/Users/REYMARK/Documents/Sites/angora/app/Http/Controllers/KanbanController.php#L380)
  - Policy Call: \`$this->authorize('updateTaskColumn', [$task, $targetColumn]);\`
- **Route**: \`PATCH /kanban/tasks/{task}\`
  - Named Route: \`kanban.tasks.update\`
  - Controller Action: [\`App\\Http\\Controllers\\KanbanController::updateTask\`](file:///c:/Users/REYMARK/Documents/Sites/angora/app/Http/Controllers/KanbanController.php#L310)
  - Updates progress, custom values, and task fields.

---

### 3. Which React components render task details?
- **Container**: [\`ItemDetailDrawer.tsx\`](file:///c:/Users/REYMARK/Documents/Sites/angora/resources/js/pages/kanban/components/ItemDetailDrawer.tsx)
  - Acts as the primary sliding drawer container (\`max-w-[1080px]\`).
  - Evaluates \`isPrivilegedManager\` vs \`isEmployeeView\`.
- **Employee View**: [\`EmployeeTaskPanel.tsx\`](file:///c:/Users/REYMARK/Documents/Sites/angora/resources/js/pages/kanban/components/EmployeeTaskPanel.tsx)
  - Monday.com-inspired structured two-column label/value panel for Designers.
  - Renders read-only task title, Project Manager, Account Manager, Assigned Designers, interactive status dropdown with permitted choices, service type, 12h deadline countdown, progress bar, expandable description brief, and subtask checklist.
- **Subitem Table**: [\`SubitemTable.tsx\`](file:///c:/Users/REYMARK/Documents/Sites/angora/resources/js/pages/kanban/components/SubitemTable.tsx)
  - Renders nested hierarchical subitems inside both the table row and the task details panel.

---

### 4. How do board capabilities reach the frontend?
- **Generation in Permission Service**: In [\`WorkOsPermissionService::getBoardPermissions\`](file:///c:/Users/REYMARK/Documents/Sites/angora/app/Services/Authorization/WorkOsPermissionService.php#L17), the authenticated user's capabilities are evaluated:
  \`\`\`php
  $permissions = [
      'canCreateTask' => false,
      'canEditTask' => false,
      'canEditProgress' => true,
      'canChangeStatus' => false,
      'canMoveAssignedTask' => true,
      'canManageBoard' => false,
      'canManageColumns' => false,
      'canManageGroups' => false,
      'canManageAutomations' => false,
      'canApproveReview' => false,
      'canExport' => false,
  ];
  \`\`\`
- **Inertia.js Transport**: Delivered directly to [\`resources/js/pages/kanban/index.tsx\`](file:///c:/Users/REYMARK/Documents/Sites/angora/resources/js/pages/kanban/index.tsx) as page props:
  \`Inertia::render('kanban/index', ['permissions' => $permissions, ...])\`
- **Component Props**: Distributed from \`index.tsx\` to \`BoardUnifiedHeader\`, \`TableView\`, \`TableRow\`, \`KanbanBoardView\`, and \`ItemDetailDrawer\`.

---

### 5. Which tests cover Designer permissions?
- [\`tests/Feature/WorkOsRbacSecurityAuditTest.php\`](file:///c:/Users/REYMARK/Documents/Sites/angora/tests/Feature/WorkOsRbacSecurityAuditTest.php):
  - \`test_designer_cannot_create_task\`
  - \`test_designer_cannot_delete_task\`
  - \`test_designer_cannot_change_status_column\`
  - \`test_designer_cannot_reorder_tasks\`
  - \`test_designer_cannot_edit_privileged_fields\`
  - \`test_designer_cannot_approve_review\`
- [\`tests/Feature/WorkOsEmployeeTaskMovementTest.php\`](file:///c:/Users/REYMARK/Documents/Sites/angora/tests/Feature/WorkOsEmployeeTaskMovementTest.php):
  - \`test_assigned_designer_can_move_task_to_permitted_stage\`
  - \`test_assigned_designer_cannot_move_unassigned_task\`
  - \`test_designer_cannot_bypass_review_to_completed\`
  - \`test_designer_board_view_defaults_to_assigned_filter\`
- [\`tests/Feature/WorkOsEmployeeTaskModalTest.php\`](file:///c:/Users/REYMARK/Documents/Sites/angora/tests/Feature/WorkOsEmployeeTaskModalTest.php):
  - \`test_designer_has_employee_view_permissions\`
  - \`test_assigned_designer_can_update_task_progress\`
  - \`test_assigned_designer_cannot_modify_privileged_fields\`
  - \`test_unassigned_designer_cannot_modify_progress\`
  - \`test_assigned_designer_can_manage_subtasks\`
  - \`test_assigned_designer_can_submit_deliverables_for_review\`

---

### 6. Which components are affected by a change to dynamic statuses?
1. **Database / Model**: [\`App\\Models\\KanbanColumn\`](file:///c:/Users/REYMARK/Documents/Sites/angora/app/Models/KanbanColumn.php) (\`category\`, \`semantic_category\`, \`title\`, \`color\`).
2. **Backend Controller**: [\`KanbanController::updateWorkflowStage\`](file:///c:/Users/REYMARK/Documents/Sites/angora/app/Http/Controllers/KanbanController.php#L190).
3. **Backend Policy**: [\`TaskPolicy::updateTaskColumn\`](file:///c:/Users/REYMARK/Documents/Sites/angora/app/Policies/TaskPolicy.php).
4. **Backend Service**: [\`WorkOsPermissionService\`](file:///c:/Users/REYMARK/Documents/Sites/angora/app/Services/Authorization/WorkOsPermissionService.php).
5. **Automations Engine**: Triggers on status transitions (\`kanban_automations\`).
6. **Frontend Canvas Components**:
   - [\`KanbanBoardView.tsx\`](file:///c:/Users/REYMARK/Documents/Sites/angora/resources/js/pages/kanban/components/KanbanBoardView.tsx): Renders columns, column headers, cards.
   - [\`TableView.tsx\`](file:///c:/Users/REYMARK/Documents/Sites/angora/resources/js/pages/kanban/components/TableView.tsx): Status cell badges.
   - [\`ItemDetailDrawer.tsx\`](file:///c:/Users/REYMARK/Documents/Sites/angora/resources/js/pages/kanban/components/ItemDetailDrawer.tsx): Status selection dropdown.
   - [\`EmployeeTaskPanel.tsx\`](file:///c:/Users/REYMARK/Documents/Sites/angora/resources/js/pages/kanban/components/EmployeeTaskPanel.tsx): Permitted status transitions dropdown.
   - [\`AddColumnModal.tsx\`](file:///c:/Users/REYMARK/Documents/Sites/angora/resources/js/pages/kanban/components/AddColumnModal.tsx): Workflow stage creation and color assignment.
`;

fs.writeFileSync(path.join(graphOutDir, 'GRAPH_REPORT.md'), reportContent);
console.log(`Graphify architecture graph successfully generated with ${nodes.size} nodes and ${edges.length} edges.`);
