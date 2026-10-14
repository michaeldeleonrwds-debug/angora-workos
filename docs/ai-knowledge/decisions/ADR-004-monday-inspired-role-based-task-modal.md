# ADR-004: Monday.com-Inspired Role-Based Task Details Modal

## Status
Accepted (Commit `f16315d`)

## Context
The task details drawer (`ItemDetailDrawer.tsx`) previously rendered the exact same administrative form layout for all users. For employees, this cluttered the interface with disabled controls and administrative configuration inputs.

## Decision
1. Split `ItemDetailDrawer.tsx` into two distinct left-panel experiences:
   - **Privileged Management View**: Full task management controls for Admin, PM, and authorized AM.
   - **Employee Production View (`EmployeeTaskPanel.tsx`)**: Monday.com-inspired structured two-column label/value layout for Designers.
2. The employee panel displays fields in a strict, ergonomic order:
   1. Task name (read-only heading)
   2. Project Manager (avatar & name, or "Not assigned")
   3. Account Manager (avatar & name, multi-AM support)
   4. Assigned Designers (avatars & names)
   5. Status (dropdown with permitted transitions if assigned)
   6. Service Type badge
   7. Deadline (12h format + exact countdown badge)
   8. Progress bar + quick percentage buttons
   9. Expandable description brief
   10. Subtasks checklist & priority
3. Sizing specifications:
   - Container max width: `max-w-[1080px]`
   - Left panel: ~42% (`lg:col-span-5`)
   - Right collaboration panel: ~58% (`lg:col-span-7`) with independent scrolling.

## Consequences
- Clean, focused interface for production execution.
- Completely prevents accidental exposure of management forms.
- Tested and verified in `WorkOsEmployeeTaskModalTest.php`.
