<?php

/*
|--------------------------------------------------------------------------
| Angora Workflow Templates
|--------------------------------------------------------------------------
|
| Stage keys are stable semantic identifiers. Titles and colors are only the
| initial presentation and may be renamed/recolored per board afterwards.
| Transitions reference stage keys and are materialized into board-scoped
| rows (stable column IDs) when a template is applied.
|
| "contributor" transitions are the only moves Employees, Designers and
| Developers may perform on their assigned tasks. Managers (move.any) may
| move between any active stages; listed manager transitions document the
| intended production path for Workflow Settings.
|
*/

return [
    'templates' => [
        'production' => [
            'label' => 'Angora Production',
            'stages' => [
                ['key' => 'resources', 'title' => 'Resources', 'color' => '#A25DDC', 'semantic' => 'not_started', 'role' => 'reference', 'exclude_from_metrics' => true],
                ['key' => 'hold', 'title' => 'Hold', 'color' => '#C4C4C4', 'semantic' => 'blocked'],
                ['key' => 'new_task', 'title' => 'New Task', 'color' => '#7E8BA3', 'semantic' => 'not_started', 'default' => true],
                ['key' => 'to_do', 'title' => 'To Do', 'color' => '#66CCFF', 'semantic' => 'not_started'],
                ['key' => 'processing', 'title' => 'Processing', 'color' => '#FDAB3D', 'semantic' => 'in_progress'],
                ['key' => 'progress_report', 'title' => 'Progress Report', 'color' => '#FF5AC4', 'semantic' => 'in_progress'],
                ['key' => 'for_review', 'title' => 'For Review', 'color' => '#579BFC', 'semantic' => 'in_review'],
                ['key' => 'ready_to_report', 'title' => 'Ready to Report', 'color' => '#FFCB00', 'semantic' => 'in_review'],
                ['key' => 'client_under_review', 'title' => 'Client Under Review', 'color' => '#FF7575', 'semantic' => 'in_review'],
                ['key' => 'complete', 'title' => 'Complete', 'color' => '#00C875', 'semantic' => 'completed'],
            ],
            'transitions' => [
                // Contributor-permitted moves (assigned work only)
                ['new_task', 'to_do', true],
                ['to_do', 'processing', true],
                ['processing', 'progress_report', true],
                ['progress_report', 'processing', true],
                ['processing', 'for_review', true],
                ['progress_report', 'for_review', true],
                ['for_revision', 'processing', true],
                ['for_revision', 'for_review', true],
                // Manager production path
                ['resources', 'new_task', false],
                ['new_task', 'hold', false],
                ['to_do', 'hold', false],
                ['processing', 'hold', false],
                ['hold', 'new_task', false],
                ['hold', 'to_do', false],
                ['hold', 'processing', false],
                ['for_review', 'processing', false],
                ['for_review', 'for_revision', false],
                ['for_review', 'ready_to_report', false],
                ['ready_to_report', 'client_under_review', false],
                ['client_under_review', 'for_revision', false],
                ['client_under_review', 'processing', false],
                ['client_under_review', 'complete', false],
            ],
        ],
    ],

    // Stage keys contributors may never enter, regardless of board configuration.
    'contributor_forbidden_targets' => ['ready_to_report', 'client_under_review', 'complete'],

    // Review-controlled stage keys contributors may never leave (decisions belong to reviewers).
    'contributor_locked_sources' => ['for_review', 'ready_to_report', 'client_under_review', 'complete'],
];
