export interface User {
    id: number;
    name: string;
    email?: string;
    role: string;
    department?: string;
    avatar?: string | null;
    avatar_url?: string | null;
    weekly_capacity_hours?: number;
    daily_capacity_hours?: number;
}

export interface WorkspaceMember {
    id: number;
    workspace_id: number;
    user_id: number;
    role: string;
    user?: User;
}

export interface Workspace {
    id: number;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    owner_id: number;
    is_favorite: boolean;
    is_archived: boolean;
    boards?: KanbanBoard[];
    members?: WorkspaceMember[];
    owner?: User;
}

export interface BoardColumn {
    id: number;
    board_id: number;
    key: string;
    title: string;
    type: string;
    scope?: 'task' | 'subtask';
    config?: any;
    position: number;
    is_visible: boolean;
    width: number;
}

export interface TaskDependency {
    id: number;
    workspace_id?: number;
    task_id: number;
    depends_on_task_id: number;
    relationship_type?: 'blocks' | 'blocked_by' | 'related_to';
    dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
    lag_days: number;
    created_by?: number;
    task?: Task;
    dependency_task?: Task;
    dependencyTask?: Task;
}

export interface TaskRecurrenceRule {
    id: number;
    task_id: number;
    workspace_id: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom' | 'on_completion';
    interval: number;
    days_of_week?: number[] | null;
    time_of_day?: string | null;
    end_type: 'never' | 'after_occurrences' | 'on_date';
    max_occurrences?: number | null;
    occurrences_count: number;
    end_date?: string | null;
    next_run_at?: string | null;
    last_run_at?: string | null;
    is_active: boolean;
    copy_subtasks: boolean;
    copy_assignees: boolean;
    copy_custom_values: boolean;
    created_by?: number | null;
    created_at?: string;
    updated_at?: string;
    logs?: TaskRecurrenceLog[];
}

export interface TaskRecurrenceLog {
    id: number;
    recurrence_rule_id: number;
    source_task_id: number;
    generated_task_id?: number | null;
    executed_at: string;
    status: 'success' | 'skipped' | 'failed';
    notes?: string | null;
}

export interface BoardView {
    id: number;
    board_id: number;
    name: string;
    type: 'table' | 'kanban' | 'calendar' | 'timeline' | 'gantt' | 'workload' | 'chart' | 'files' | 'gallery';
    is_default: boolean;
    settings?: Record<string, any>;
    position: number;
}

export interface BoardGroup {
    id: number;
    board_id: number;
    title: string;
    color: string;
    position: number;
    tasks?: Task[];
}

export interface KanbanColumn {
    id: number;
    board_id: number;
    title: string;
    color: string;
    position: number;
    category?: string | null;
    semantic_category?: string | null;
    tasks?: Task[];
}

export interface TaskAttachment {
    id: number;
    task_id: number;
    user_id: number;
    file_name: string;
    file_path: string;
    file_size_bytes: number;
    mime_type: string;
    created_at: string;
    user?: User;
}

export interface TaskComment {
    id: number;
    task_id: number;
    parent_id?: number | null;
    user_id: number;
    message: string;
    reactions?: Record<string, number[]> | null;
    created_at: string;
    user?: User;
    replies?: TaskComment[];
}

export interface TaskActivity {
    id: number;
    task_id: number;
    board_id: number;
    user_id?: number | null;
    event_type: string;
    description: string;
    field_name?: string | null;
    old_value?: any;
    new_value?: any;
    metadata?: Record<string, any> | null;
    created_at: string;
    user?: User | null;
}

export interface MediaAsset {
    id: number;
    media_uuid: string;
    user_id?: number | null;
    workspace_id?: number | null;
    disk: string;
    file_path: string;
    original_filename: string;
    mime_type: string;
    file_size_bytes: number;
    width?: number | null;
    height?: number | null;
    title?: string | null;
    alt_text?: string | null;
    metadata?: Record<string, any>;
    url: string;
    created_at: string;
    user?: User;
    usages_count?: number;
}

export interface MediaUsage {
    id: number;
    media_asset_id: number;
    attachable_type: string;
    attachable_id: number;
    field_name: string;
    user_id?: number | null;
    media_asset?: MediaAsset;
    mediaAsset?: MediaAsset;
    created_at: string;
}

export interface Task {
    id: number;
    board_id: number;
    column_id: number;
    group_id?: number;
    parent_id?: number | null;
    title: string;
    description?: string;
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    due_date?: string | null;
    due_time?: string | null;
    start_date?: string | null;
    start_time?: string | null;
    is_milestone?: boolean;
    reminder_lead_minutes?: number | null;
    reminder_sent_at?: string | null;
    deadline_status?: 'overdue' | 'due_today' | 'due_soon' | 'upcoming' | 'completed_on_time' | 'completed_late' | 'no_deadline';
    time_remaining?: string | null;
    is_blocked?: boolean;
    estimated_hours?: number | null;
    actual_hours?: number | null;
    progress: number;
    assigned_to?: number | null;
    created_by: number;
    position: number;
    labels?: string[];
    custom_values?: Record<string, any>;
    is_personal?: boolean;
    completed_at?: string | null;
    created_at?: string;
    creator?: User | null;
    assignee?: User | null;
    column?: KanbanColumn;
    group?: BoardGroup;
    board?: KanbanBoard;
    parent?: Task;
    comments?: TaskComment[];
    attachments?: TaskAttachment[];
    subitems?: Task[];
    activities?: TaskActivity[];
    dependencies?: TaskDependency[];
    dependents?: TaskDependency[];
    media_usages?: MediaUsage[];
    mediaUsages?: MediaUsage[];
    outgoingRelationships?: BoardItemRelationship[];
    incomingRelationships?: BoardItemRelationship[];
    review_cycles?: TaskReviewCycle[];
    latest_review_cycle?: TaskReviewCycle;
    recurrence_rule_id?: number | null;
    recurrence_rule?: TaskRecurrenceRule | null;
    recurrenceRule?: TaskRecurrenceRule | null;
}

export interface TaskReviewDecision {
    id: number;
    review_cycle_id: number;
    reviewer_id: number;
    decision: 'approved' | 'revision_requested';
    feedback?: string | null;
    attachments?: any[] | null;
    decided_at?: string | null;
    created_at?: string;
    reviewer?: User;
}

export interface TaskReviewStage {
    id: number;
    review_cycle_id: number;
    stage_index: number;
    name: string;
    required_role?: string | null;
    status: 'pending' | 'in_progress' | 'approved' | 'revision_requested';
    reviewer_id?: number | null;
    reviewer?: User;
    feedback?: string | null;
    decided_at?: string | null;
    created_at?: string;
}

export interface TaskReviewCycle {
    id: number;
    task_id: number;
    round_number: number;
    submitted_by: number;
    state: 'pending' | 'approved' | 'revision_requested';
    total_stages?: number;
    current_stage_index?: number;
    notes?: string | null;
    submitted_at?: string | null;
    resolved_at?: string | null;
    created_at?: string;
    submitter?: User;
    stages?: TaskReviewStage[];
    current_stage?: TaskReviewStage;
    decisions?: TaskReviewDecision[];
    latest_decision?: TaskReviewDecision;
}

export interface BoardItemRelationship {
    id: number;
    source_board_id: number;
    source_task_id: number;
    target_board_id: number;
    target_task_id: number;
    column_key?: string;
    relation_type: 'one_way' | 'two_way';
    target_board?: KanbanBoard;
    target_task?: Task;
    source_board?: KanbanBoard;
    source_task?: Task;
}

export interface AutomationExecution {
    id: number;
    automation_id: number;
    board_id: number;
    task_id?: number | null;
    triggered_by_user_id?: number | null;
    trigger_event: string;
    status: 'success' | 'failed' | 'skipped' | 'partial';
    actions_attempted?: any[];
    actions_succeeded?: any[];
    actions_failed?: any[];
    error_message?: string | null;
    execution_duration_ms: number;
    created_at: string;
    task?: Task;
    triggered_by?: User;
}

export interface BoardAutomation {
    id: number;
    board_id: number;
    name: string;
    description?: string | null;
    trigger_type: string;
    trigger_config?: Record<string, any>;
    conditions?: {
        match_type: 'and' | 'or';
        rules: Array<{
            field: string;
            operator: string;
            value?: any;
        }>;
    };
    actions: Array<{
        type: string;
        [key: string]: any;
    }>;
    is_active: boolean;
    created_by: number;
    execution_count: number;
    last_executed_at?: string | null;
    created_at?: string;
    creator?: User;
    executions?: AutomationExecution[];
}

export interface KanbanBoard {
    id: number;
    workspace_id?: number;
    title: string;
    description?: string;
    department: string;
    folder_name?: string | null;
    visibility: 'public' | 'private' | 'shareable';
    is_favorite: boolean;
    is_template: boolean;
    settings?: any;
    created_by: number;
    columns: KanbanColumn[];
    groups: BoardGroup[];
    board_columns?: BoardColumn[];
    boardColumns?: BoardColumn[];
    subitem_columns?: BoardColumn[];
    subitemColumns?: BoardColumn[];
    views?: BoardView[];
    tasks?: Task[];
    automations?: BoardAutomation[];
    automation_executions?: AutomationExecution[];
    members?: any[];
}

export interface BoardPermissions {
    canView: boolean;
    canCreateTask: boolean;
    canEditTask: boolean;
    canEditProgress: boolean;
    canChangeStatus: boolean;
    canMoveAssignedTask?: boolean;
    canAssignUsers: boolean;
    canChangeDeadlines: boolean;
    canChangePriority: boolean;
    canDeleteTask: boolean;
    canManageBoard: boolean;
    canManageColumns: boolean;
    canManageGroups: boolean;
    canManageAutomations: boolean;
    canManageBlueprints: boolean;
    canManageDependencies: boolean;
    canManageRecurrence: boolean;
    canManageSubtasks?: boolean;
    canApproveReview: boolean;
    canExport: boolean;
}

export interface KanbanPageProps {
    workspaces: Workspace[];
    activeWorkspace?: Workspace;
    boards: KanbanBoard[];
    activeBoard?: KanbanBoard;
    users: User[];
    selectedTask?: Task | null;
    mirroredValues?: Record<number, Record<string, any>>;
    permissions?: BoardPermissions;
}

export const DEFAULT_TASK_TYPES = [
    'Email Automation',
    'Landing Page',
    'Logo',
    'Poster',
    'Promotional Kit',
    'Resolution & Image Quality',
    'Social Media Post',
    'Video',
];

export const DEFAULT_COLUMN_WIDTH = 140;

export const getColumnWidth = (col: BoardColumn): number => {
    if (col.type === 'date') {
        return Math.max(col.width || 0, 180);
    }
    if (col.width && col.width > 0) return col.width;
    switch (col.type) {
        case 'people':
            return 150;
        case 'status':
            return 140;
        case 'priority':
            return 130;
        case 'date':
            return 180;
        case 'timeline':
            return 170;
        case 'progress':
            return 140;
        case 'checkbox':
            return 100;
        case 'dropdown':
            return 160;
        case 'tags':
            return 130;
        case 'rating':
            return 130;
        case 'number':
            return 130;
        case 'connect_boards':
            return 170;
        case 'mirror':
            return 140;
        case 'long_text':
            return 170;
        case 'image':
            return 130;
        default:
            return DEFAULT_COLUMN_WIDTH;
    }
};

export const getTableGridTemplate = (visibleColumns: BoardColumn[]): string => {
    const dynamicTracks = visibleColumns.map((c) => `${getColumnWidth(c)}px`).join(' ');
    return `6px 44px 250px ${dynamicTracks} 40px`;
};

const extractIdsFromValue = (val: any): number[] => {
    if (!val) return [];
    if (Array.isArray(val)) {
        return val.flatMap(extractIdsFromValue);
    }
    if (typeof val === 'number') {
        return !isNaN(val) && val > 0 ? [val] : [];
    }
    if (typeof val === 'string') {
        const num = Number(val.trim());
        return !isNaN(num) && num > 0 ? [num] : [];
    }
    if (typeof val === 'object') {
        if ('id' in val) {
            return extractIdsFromValue((val as any).id);
        }
        if ('user_id' in val) {
            return extractIdsFromValue((val as any).user_id);
        }
    }
    return [];
};

/**
 * Check whether a specific user is assigned to a task either via the legacy
 * assigned_to column or via custom dynamic columns (e.g. Designer, AM) or child work categories.
 */
export const isUserAssignedToTask = (task: Task, userId: string | number, currentUserId?: number): boolean => {
    let targetId = Number(userId);
    if ((userId === 'me' || isNaN(targetId)) && currentUserId) {
        targetId = currentUserId;
    }
    if (!targetId || isNaN(targetId)) return false;

    // 1. Direct legacy assigned_to
    if (Number(task.assigned_to) === targetId) return true;

    // 2. Custom values (e.g. people columns like Designer, Person, etc.)
    if (task.custom_values && typeof task.custom_values === 'object') {
        for (const [key, val] of Object.entries(task.custom_values)) {
            if (['account_manager', 'am', 'client', 'client_id'].includes(key.toLowerCase())) {
                continue;
            }
            const ids = extractIdsFromValue(val);
            if (ids.includes(targetId)) return true;
        }
    }

    // 3. Child work categories / subtasks if present
    if (task.subitems && Array.isArray(task.subitems)) {
        for (const sub of task.subitems) {
            if (Number(sub.assigned_to) === targetId) return true;
            if (sub.custom_values && typeof sub.custom_values === 'object') {
                for (const [key, val] of Object.entries(sub.custom_values)) {
                    if (['account_manager', 'am', 'client', 'client_id'].includes(key.toLowerCase())) {
                        continue;
                    }
                    const ids = extractIdsFromValue(val);
                    if (ids.includes(targetId)) return true;
                }
            }
        }
    }

    // 4. If this is a child task, check parent task assignment
    if (task.parent) {
        if (Number(task.parent.assigned_to) === targetId) return true;
        if (task.parent.custom_values && typeof task.parent.custom_values === 'object') {
            for (const [key, val] of Object.entries(task.parent.custom_values)) {
                if (['account_manager', 'am', 'client', 'client_id'].includes(key.toLowerCase())) {
                    continue;
                }
                const ids = extractIdsFromValue(val);
                if (ids.includes(targetId)) return true;
            }
        }
    }

    return false;
};

/**
 * Extract all unique assigned user IDs across assigned_to, people columns, and child categories.
 */
export const getTaskAssignedUserIds = (task: Task): number[] => {
    const ids = new Set<number>();
    if (task.assigned_to) {
        const num = Number(task.assigned_to);
        if (!isNaN(num) && num > 0) ids.add(num);
    }
    if (task.custom_values && typeof task.custom_values === 'object') {
        for (const [key, val] of Object.entries(task.custom_values)) {
            if (['account_manager', 'am', 'client', 'client_id'].includes(key.toLowerCase())) {
                continue;
            }
            extractIdsFromValue(val).forEach((id) => ids.add(id));
        }
    }
    if (task.subitems && Array.isArray(task.subitems)) {
        for (const sub of task.subitems) {
            if (sub.assigned_to) {
                const num = Number(sub.assigned_to);
                if (!isNaN(num) && num > 0) ids.add(num);
            }
            if (sub.custom_values && typeof sub.custom_values === 'object') {
                for (const [key, val] of Object.entries(sub.custom_values)) {
                    if (['account_manager', 'am', 'client', 'client_id'].includes(key.toLowerCase())) {
                        continue;
                    }
                    extractIdsFromValue(val).forEach((id) => ids.add(id));
                }
            }
        }
    }
    return Array.from(ids);
};

/**
 * Resolve User objects for all users assigned to a task (including child work categories).
 */
export const getTaskAssignedUsers = (task: Task, allUsers: User[] = []): User[] => {
    const assignedIds = new Set(getTaskAssignedUserIds(task));
    const userMap = new Map<number, User>();

    allUsers.forEach((u) => {
        if (assignedIds.has(u.id)) {
            userMap.set(u.id, u);
        }
    });

    if (task.assignee && assignedIds.has(task.assignee.id)) {
        userMap.set(task.assignee.id, task.assignee);
    }

    if (task.subitems && Array.isArray(task.subitems)) {
        task.subitems.forEach((sub) => {
            if (sub.assignee && assignedIds.has(sub.assignee.id)) {
                userMap.set(sub.assignee.id, sub.assignee);
            }
        });
    }

    return Array.from(userMap.values());
};



