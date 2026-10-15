<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\WorkOsTemplate;
use Illuminate\Database\Seeder;

class WorkOsTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::role('super_admin')->first() ?? User::first();
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

        // 4. Video Production Task Blueprint
        WorkOsTemplate::updateOrCreate(
            ['title' => 'Video Production & Motion Graphics'],
            [
                'description' => 'End-to-end video commercial delivery: creative angle, storyboarding, filming, assembly cut, motion graphics, and audio/color mastering.',
                'type' => 'task',
                'category' => 'video_production',
                'created_by' => $admin->id,
                'is_system_template' => true,
                'icon' => 'Film',
                'color' => '#E2445C',
                'content_schema' => [
                    'group_name' => 'Video Production',
                    'total_duration_days' => 14,
                    'tasks' => [
                        [
                            'key' => 'vid_script',
                            'title' => 'Creative Treatment & Scriptwriting',
                            'stage' => 'To Do',
                            'offset_days' => 0,
                            'duration_days' => 3,
                            'priority' => 'High',
                            'estimated_hours' => 16,
                            'subtasks' => ['Concept Pitch & Angle', 'Script Draft v1', 'Client Creative Sign-off'],
                            'depends_on' => [],
                        ],
                        [
                            'key' => 'vid_storyboard',
                            'title' => 'Storyboarding & Styleframes',
                            'stage' => 'To Do',
                            'offset_days' => 3,
                            'duration_days' => 3,
                            'priority' => 'High',
                            'estimated_hours' => 18,
                            'subtasks' => ['Rough Visual Storyboard', 'Color & Style Moodboard', 'Director Review'],
                            'depends_on' => ['vid_script'],
                        ],
                        [
                            'key' => 'vid_shoot',
                            'title' => 'Principal Filming & Live Shoot',
                            'stage' => 'To Do',
                            'offset_days' => 6,
                            'duration_days' => 3,
                            'priority' => 'Urgent',
                            'estimated_hours' => 24,
                            'subtasks' => ['Call Sheet & Talent Prep', 'Live Production Shoot', 'DIT Dual Backup & Log'],
                            'depends_on' => ['vid_storyboard'],
                        ],
                        [
                            'key' => 'vid_assembly',
                            'title' => 'Rough Assembly Cut & Motion Graphics',
                            'stage' => 'To Do',
                            'offset_days' => 9,
                            'duration_days' => 3,
                            'priority' => 'High',
                            'estimated_hours' => 20,
                            'subtasks' => ['Assembly Timeline Edit', 'Lower Thirds & Motion Titles', 'Internal Review'],
                            'depends_on' => ['vid_shoot'],
                        ],
                        [
                            'key' => 'vid_master',
                            'title' => 'Color Grading, Audio Mix & Final Master',
                            'stage' => 'To Do',
                            'offset_days' => 12,
                            'duration_days' => 2,
                            'priority' => 'Urgent',
                            'estimated_hours' => 12,
                            'subtasks' => ['DaVinci Resolve Grade', 'Sound Design & 5.1 Mix', 'Multi-Format Exports (16:9, 9:16)'],
                            'depends_on' => ['vid_assembly'],
                        ],
                    ],
                ],
            ]
        );

        // 5. Brand Identity & Design Blueprint
        WorkOsTemplate::updateOrCreate(
            ['title' => 'Brand Identity & Design System'],
            [
                'description' => 'Complete brand design sprint: strategic discovery, moodboards, logo suite, typography, brand guidelines, and collateral packaging.',
                'type' => 'task',
                'category' => 'graphic_design',
                'created_by' => $admin->id,
                'is_system_template' => true,
                'icon' => 'Palette',
                'color' => '#A25DDC',
                'content_schema' => [
                    'group_name' => 'Brand Identity & Visuals',
                    'total_duration_days' => 12,
                    'tasks' => [
                        [
                            'key' => 'brand_strategy',
                            'title' => 'Brand Strategy & Competitor Audit',
                            'stage' => 'To Do',
                            'offset_days' => 0,
                            'duration_days' => 2,
                            'priority' => 'High',
                            'estimated_hours' => 12,
                            'subtasks' => ['Stakeholder Interview', 'Competitive Visual Audit', 'Brand Persona Canvas'],
                            'depends_on' => [],
                        ],
                        [
                            'key' => 'brand_concepts',
                            'title' => 'Logo Concepts & Typographic Suite',
                            'stage' => 'To Do',
                            'offset_days' => 2,
                            'duration_days' => 4,
                            'priority' => 'High',
                            'estimated_hours' => 20,
                            'subtasks' => ['3 Distinct Logo Directions', 'Type Hierarchy System', 'Color Palette & Contrast Ratio'],
                            'depends_on' => ['brand_strategy'],
                        ],
                        [
                            'key' => 'brand_collateral',
                            'title' => 'Marketing Collaterals & Mockups',
                            'stage' => 'To Do',
                            'offset_days' => 6,
                            'duration_days' => 3,
                            'priority' => 'Medium',
                            'estimated_hours' => 16,
                            'subtasks' => ['Business Card & Stationery', 'Social Media Templates', '3D Packaging Mockups'],
                            'depends_on' => ['brand_concepts'],
                        ],
                        [
                            'key' => 'brand_guidelines',
                            'title' => 'Master Brand Guidelines & Vector Kit',
                            'stage' => 'To Do',
                            'offset_days' => 9,
                            'duration_days' => 3,
                            'priority' => 'Urgent',
                            'estimated_hours' => 14,
                            'subtasks' => ['Brand Book PDF (40+ pages)', 'Scalable SVG/EPS Asset Suite', 'Client Handoff Meeting'],
                            'depends_on' => ['brand_collateral'],
                        ],
                    ],
                ],
            ]
        );

        // 6. Social Media Campaign Blueprint
        WorkOsTemplate::updateOrCreate(
            ['title' => 'Social Media Campaign Launch'],
            [
                'description' => 'Multi-channel social campaign workflow: content pillar mapping, copywriting, creative graphics, video reels, and scheduling QA.',
                'type' => 'task',
                'category' => 'marketing_campaign',
                'created_by' => $admin->id,
                'is_system_template' => true,
                'icon' => 'Megaphone',
                'color' => '#00C875',
                'content_schema' => [
                    'group_name' => 'Social Campaign',
                    'total_duration_days' => 10,
                    'tasks' => [
                        [
                            'key' => 'social_calendar',
                            'title' => 'Content Pillars & 30-Day Calendar',
                            'stage' => 'To Do',
                            'offset_days' => 0,
                            'duration_days' => 3,
                            'priority' => 'High',
                            'estimated_hours' => 10,
                            'subtasks' => ['Pillar Formulation', 'Theme Calendar Grid', 'Hashtag & Audience Research'],
                            'depends_on' => [],
                        ],
                        [
                            'key' => 'social_copy',
                            'title' => 'Copywriting & Call-to-Actions',
                            'stage' => 'To Do',
                            'offset_days' => 3,
                            'duration_days' => 3,
                            'priority' => 'High',
                            'estimated_hours' => 12,
                            'subtasks' => ['Post Captions (15 items)', 'Story Hooks & Polls', 'Influencer Briefs'],
                            'depends_on' => ['social_calendar'],
                        ],
                        [
                            'key' => 'social_assets',
                            'title' => 'Static Graphics & Motion Reels',
                            'stage' => 'To Do',
                            'offset_days' => 6,
                            'duration_days' => 3,
                            'priority' => 'High',
                            'estimated_hours' => 18,
                            'subtasks' => ['Feed Carousel Graphics', 'Reels / Shorts Cuts (5x)', 'Thumbnail Covers'],
                            'depends_on' => ['social_copy'],
                        ],
                        [
                            'key' => 'social_schedule',
                            'title' => 'Buffer Scheduling & Tracking QA',
                            'stage' => 'To Do',
                            'offset_days' => 9,
                            'duration_days' => 1,
                            'priority' => 'Urgent',
                            'estimated_hours' => 6,
                            'subtasks' => ['UTM Parameter Tracking', 'Auto-Publish Queue Verification', 'Client Pre-flight Sign-off'],
                            'depends_on' => ['social_assets'],
                        ],
                    ],
                ],
            ]
        );

        // 7. Web Development Sprint Blueprint
        WorkOsTemplate::updateOrCreate(
            ['title' => 'Web Development & QA Sprint'],
            [
                'description' => 'Agile dev delivery cycle: architecture, frontend component build, backend API & schema, QA regression testing, and production deployment.',
                'type' => 'task',
                'category' => 'website_development',
                'created_by' => $admin->id,
                'is_system_template' => true,
                'icon' => 'Code2',
                'color' => '#0085FF',
                'content_schema' => [
                    'group_name' => 'Web Development Sprint',
                    'total_duration_days' => 14,
                    'tasks' => [
                        [
                            'key' => 'web_specs',
                            'title' => 'Architecture & Component Specifications',
                            'stage' => 'To Do',
                            'offset_days' => 0,
                            'duration_days' => 2,
                            'priority' => 'High',
                            'estimated_hours' => 12,
                            'subtasks' => ['Data Schema Modeling', 'Design Token Extraction', 'API Contract Definitions'],
                            'depends_on' => [],
                        ],
                        [
                            'key' => 'web_frontend',
                            'title' => 'Frontend UI & Responsive Views',
                            'stage' => 'To Do',
                            'offset_days' => 2,
                            'duration_days' => 5,
                            'priority' => 'High',
                            'estimated_hours' => 32,
                            'subtasks' => ['Layouts & Navigation', 'Dynamic Table & Form Components', 'Accessibility & Dark Mode'],
                            'depends_on' => ['web_specs'],
                        ],
                        [
                            'key' => 'web_backend',
                            'title' => 'Backend Controllers & Business Logic',
                            'stage' => 'To Do',
                            'offset_days' => 2,
                            'duration_days' => 5,
                            'priority' => 'High',
                            'estimated_hours' => 28,
                            'subtasks' => ['Eloquent Models & Migrations', 'Auth Policies & IDOR Auditing', 'Automated Unit Tests'],
                            'depends_on' => ['web_specs'],
                        ],
                        [
                            'key' => 'web_integration',
                            'title' => 'Full-Stack Integration & QA Testing',
                            'stage' => 'To Do',
                            'offset_days' => 7,
                            'duration_days' => 4,
                            'priority' => 'Urgent',
                            'estimated_hours' => 20,
                            'subtasks' => ['End-to-End User Flow Tests', 'Browser Matrix Testing', 'Security & Penetration Check'],
                            'depends_on' => ['web_frontend', 'web_backend'],
                        ],
                        [
                            'key' => 'web_deploy',
                            'title' => 'Staging Sign-off & Production Release',
                            'stage' => 'To Do',
                            'offset_days' => 11,
                            'duration_days' => 3,
                            'priority' => 'Urgent',
                            'estimated_hours' => 10,
                            'subtasks' => ['Client Demo on Staging', 'SSL & DNS Cutover', 'Smoke Testing in Production'],
                            'depends_on' => ['web_integration'],
                        ],
                    ],
                ],
            ]
        );
    }
}
