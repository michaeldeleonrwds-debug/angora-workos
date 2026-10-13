<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\WorkOsTemplate;
use Illuminate\Database\Seeder;

class WorkOsTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'super_admin')->first() ?? User::first();
        if (!$admin) return;

        // 1. Website Development Project Template
        WorkOsTemplate::updateOrCreate(
            ['title' => 'Website Development & Launch'],
            [
                'description' => 'Complete agency website development lifecycle: discovery, wireframes, UI design, client review, frontend, backend, QA, and launch.',
                'type' => 'project',
                'category' => 'website_development',
                'created_by' => $admin->id,
                'is_system_template' => true,
                'icon' => 'Globe',
                'color' => '#0085ff',
                'content_schema' => [
                    'stages' => [
                        ['title' => 'Backlog', 'color' => '#64748b'],
                        ['title' => 'In Design', 'color' => '#a25ddc'],
                        ['title' => 'Client Review', 'color' => '#fdab3d'],
                        ['title' => 'In Development', 'color' => '#0085ff'],
                        ['title' => 'QA & Testing', 'color' => '#ff5ac4'],
                        ['title' => 'Live & Done', 'color' => '#00c875'],
                    ],
                    'groups' => [
                        ['title' => 'Phase 1 — Discovery & UX/UI', 'color' => '#579bfc'],
                        ['title' => 'Phase 2 — Engineering & API', 'color' => '#a25ddc'],
                        ['title' => 'Phase 3 — Quality Assurance & Launch', 'color' => '#00c875'],
                    ],
                    'tasks' => [
                        ['title' => 'Project Discovery & Technical Requirements', 'priority' => 'High', 'stage' => 'Backlog', 'group' => 'Phase 1 — Discovery & UX/UI', 'subtasks' => ['Sitemap Architecture', 'Tech Stack Selection', 'Hosting Setup']],
                        ['title' => 'Figma Wireframing & Design System', 'priority' => 'High', 'stage' => 'In Design', 'group' => 'Phase 1 — Discovery & UX/UI', 'subtasks' => ['Component Library', 'Mobile Responsive Layouts']],
                        ['title' => 'Frontend Integration & Responsive Polish', 'priority' => 'Medium', 'stage' => 'In Development', 'group' => 'Phase 2 — Engineering & API'],
                        ['title' => 'Backend Database Architecture & API Routes', 'priority' => 'High', 'stage' => 'In Development', 'group' => 'Phase 2 — Engineering & API'],
                        ['title' => 'Cross-Browser QA & Security Audit', 'priority' => 'Urgent', 'stage' => 'QA & Testing', 'group' => 'Phase 3 — Quality Assurance & Launch'],
                    ],
                    'deliverables' => [
                        ['title' => 'Figma High-Fidelity Prototype', 'type' => 'design'],
                        ['title' => 'Staging Deployment Preview', 'type' => 'code'],
                        ['title' => 'Final Production Handoff & Credentials', 'type' => 'document'],
                    ],
                ],
            ]
        );

        // 2. Graphic Design Request Board Template
        WorkOsTemplate::updateOrCreate(
            ['title' => 'Graphic Design Sprint Board'],
            [
                'description' => 'Agile creative board for logos, brand identity, social assets, packaging, and marketing collaterals.',
                'type' => 'board',
                'category' => 'graphic_design',
                'created_by' => $admin->id,
                'is_system_template' => true,
                'icon' => 'FolderKanban',
                'color' => '#ff5ac4',
                'content_schema' => [
                    'stages' => [
                        ['title' => 'Creative Brief', 'color' => '#64748b'],
                        ['title' => 'Concept Drafting', 'color' => '#a25ddc'],
                        ['title' => 'Internal Review', 'color' => '#579bfc'],
                        ['title' => 'Client Feedback', 'color' => '#fdab3d'],
                        ['title' => 'Final Export & Delivery', 'color' => '#00c875'],
                    ],
                    'groups' => [
                        ['title' => 'Brand Identity & Visuals', 'color' => '#ff5ac4'],
                        ['title' => 'Campaign Collateral', 'color' => '#579bfc'],
                    ],
                    'tasks' => [
                        ['title' => 'Primary Brand Identity & Color Palette', 'priority' => 'High', 'stage' => 'Concept Drafting', 'group' => 'Brand Identity & Visuals'],
                        ['title' => 'Vector Assets & Social Media Kit', 'priority' => 'Medium', 'stage' => 'Creative Brief', 'group' => 'Campaign Collateral'],
                    ],
                ],
            ]
        );

        // 3. Project Brief Workdoc Template
        WorkOsTemplate::updateOrCreate(
            ['title' => 'Master Project Brief & Scope'],
            [
                'description' => 'Comprehensive project charter covering goals, target audience, deliverables, tech specifications, and timeline milestones.',
                'type' => 'workdoc',
                'category' => 'general',
                'created_by' => $admin->id,
                'is_system_template' => true,
                'icon' => 'BookOpen',
                'color' => '#a25ddc',
                'content_schema' => [
                    'folder_name' => 'Project Charters',
                    'content' => '<h1>Project Scope & Discovery Charter</h1><p><strong>Client:</strong> [Client Name]<br><strong>Project Manager:</strong> [Manager Name]<br><strong>Target Delivery:</strong> [Date]</p><h2>1. Executive Summary & Goals</h2><p>Outline the primary objectives and key metrics for success here.</p><h2>2. Scope of Work & Deliverables</h2><ul><li>Design System & Component Library</li><li>Production Web Application</li><li>Security & QA Inspection</li></ul><h2>3. Milestones & Timeline</h2><p>Document critical delivery milestones and stakeholder review checkpoints.</p>',
                ],
            ]
        );
    }
}
