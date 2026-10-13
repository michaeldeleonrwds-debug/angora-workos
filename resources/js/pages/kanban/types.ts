export interface User {
    id: number;
    name: string;
    email?: string;
    role: string;
    department?: string;
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
    config?: any;
    position: number;
    is_visible: boolean;
    width: number;
}

export interface TaskDependency {
    id: number;
    task_id: number;
    depends_on_task_id: number;
    dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
    lag_days: number;
    task?: Task;
    dependency_task?: Task;
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
    dependencies?: TaskDependency[];
    dependents?: TaskDependency[];
    outgoingRelationships?: BoardItemRelationship[];
    incomingRelationships?: BoardItemRelationship[];
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
    views?: BoardView[];
    tasks?: Task[];
    automations?: BoardAutomation[];
    automation_executions?: AutomationExecution[];
}

export interface KanbanPageProps {
    workspaces: Workspace[];
    activeWorkspace?: Workspace;
    boards: KanbanBoard[];
    activeBoard?: KanbanBoard;
    users: User[];
    selectedTask?: Task | null;
    mirroredValues?: Record<number, Record<string, any>>;
}
