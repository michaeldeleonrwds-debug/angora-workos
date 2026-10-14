# ADR-001: Hybrid Table & Kanban Board Architecture

## Status
Accepted (Phases 0 & 1)

## Context
Agency workflows demand both a high-density tabular view (for rapid data entry, multi-assignee tracking, and custom columns) and a visual card canvas (for Kanban stage flow and status visualization). Developing two completely separated applications would duplicate state, validation, and authorization logic.

## Decision
We implemented a unified Board container in `resources/js/pages/kanban/index.tsx` that shares the same Inertia.js props (`board`, `tasks`, `columns`, `groups`, `permissions`) across multiple views:
- **Main Table View (`TableView.tsx`)**
- **Production Kanban View (`KanbanBoardView.tsx`)**
- **Timeline Overview (`TimelineGanttView.tsx`)**
- **Production Calendar View (`CalendarView.tsx`)**
- **Workload Capacity View (`WorkloadView.tsx`)**

A compact 4-row header hierarchy was established in `BoardUnifiedHeader.tsx`:
- Row 1: Global App Bar (~52px)
- Row 2: Board Identity Bar (~44px)
- Row 3: Board View Navigation Tabs (~38px)
- Row 4: View Canvas

## Consequences
- Single source of truth for all board state.
- View switching occurs client-side with zero network latency.
- Strict layout separation prevents view tabs from cluttering global app navigation.
