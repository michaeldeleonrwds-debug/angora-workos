<?php

namespace Database\Seeders;

use App\Models\AuditLog;
use App\Models\CompliancePolicy;
use App\Models\ComplianceRisk;
use App\Models\ComplianceIncident;
use App\Models\Document;
use App\Models\DocumentCategory;
use App\Models\FinanceBudget;
use App\Models\FinanceExpense;
use App\Models\FinanceTransaction;
use App\Models\HrAttendance;
use App\Models\HrEmployee;
use App\Models\HrLeaveRequest;
use App\Models\HrPerformanceReview;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\MarketingCampaign;
use App\Models\MarketingContent;
use App\Models\OperationsTicket;
use App\Models\OperationsWorkflow;
use App\Models\ProductionIncident;
use App\Models\ProductionQualityCheck;
use App\Models\ProductionWorkOrder;
use App\Models\SalesCustomer;
use App\Models\SalesInvoice;
use App\Models\SalesLead;
use App\Models\SalesTarget;
use App\Models\SystemNotification;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(RbacSeeder::class);

        // This is a demo-data seeder. Never duplicate or overwrite its existing personas.
        if (User::where('email', 'super_admin@angora.internal')->exists()) {
            return;
        }

        // 1. Create the 10 User Personas from the System Architecture Overview
        $password = Hash::make('password123');

        $users = [
            'super_admin' => User::create([
                'name' => 'Alexander Vance',
                'email' => 'super_admin@angora.internal',
                'password' => $password,
                'department' => 'Executive',
                'phone' => '+1 (555) 010-0001',
                'status' => 'active',
            ]),
            'admin_manager' => User::create([
                'name' => 'Elena Rostova',
                'email' => 'admin.manager@angora.internal',
                'password' => $password,
                'department' => 'Operations',
                'phone' => '+1 (555) 010-0002',
                'status' => 'active',
            ]),
            'dept_user' => User::create([
                'name' => 'David Chen',
                'email' => 'dept.user@angora.internal',
                'password' => $password,
                'department' => 'Engineering',
                'phone' => '+1 (555) 010-0003',
                'status' => 'active',
            ]),
            'hr_staff' => User::create([
                'name' => 'Sarah Jenkins',
                'email' => 'hr.staff@angora.internal',
                'password' => $password,
                'department' => 'Human Resources',
                'phone' => '+1 (555) 010-0004',
                'status' => 'active',
            ]),
            'production_staff' => User::create([
                'name' => 'Marcus Brody',
                'email' => 'production.staff@angora.internal',
                'password' => $password,
                'department' => 'Production & QC',
                'phone' => '+1 (555) 010-0005',
                'status' => 'active',
            ]),
            'sales_staff' => User::create([
                'name' => 'Rachel Sterling',
                'email' => 'sales.staff@angora.internal',
                'password' => $password,
                'department' => 'Sales',
                'phone' => '+1 (555) 010-0006',
                'status' => 'active',
            ]),
            'marketing_staff' => User::create([
                'name' => 'Liam Gallagher',
                'email' => 'marketing.staff@angora.internal',
                'password' => $password,
                'department' => 'Marketing',
                'phone' => '+1 (555) 010-0007',
                'status' => 'active',
            ]),
            'finance_staff' => User::create([
                'name' => 'Sophia Martinez',
                'email' => 'finance.staff@angora.internal',
                'password' => $password,
                'department' => 'Finance',
                'phone' => '+1 (555) 010-0008',
                'status' => 'active',
            ]),
            'team_member' => User::create([
                'name' => 'Julian Alvarez',
                'email' => 'team.member@angora.internal',
                'password' => $password,
                'department' => 'General Staff',
                'phone' => '+1 (555) 010-0009',
                'status' => 'active',
            ]),
            'external_user' => User::create([
                'name' => 'Aria Thorne',
                'email' => 'external.user@angora.internal',
                'password' => $password,
                'department' => 'Partner / Client',
                'phone' => '+1 (555) 010-0010',
                'status' => 'active',
            ]),
        ];

        foreach ($users as $role => $user) {
            $user->assignRole($role);
        }

        // 2. Notifications & Initial Audit Logs
        SystemNotification::create([
            'user_id' => $users['super_admin']->id,
            'title' => 'System Initialized',
            'message' => 'Multi-Tools Integrated Platform across all 10 departments has been successfully deployed.',
            'type' => 'success',
            'link' => '/dashboard',
        ]);
        SystemNotification::create([
            'user_id' => $users['super_admin']->id,
            'title' => 'Production Alert',
            'message' => 'Work order WO-2026-003 has entered Quality Control verification.',
            'type' => 'warning',
            'link' => '/production',
        ]);
        SystemNotification::create([
            'user_id' => $users['finance_staff']->id,
            'title' => 'Expense Approval Request',
            'message' => 'New expense claim for Cloud Infrastructure ($1,850.00) awaiting review.',
            'type' => 'info',
            'link' => '/finance',
        ]);

        AuditLog::create([
            'user_id' => $users['super_admin']->id,
            'department' => 'System',
            'action' => 'SYSTEM_DEPLOYMENT',
            'entity_type' => 'Platform',
            'entity_id' => 1,
            'description' => 'Multi-Tools Platform core architecture provisioned with 10 role personas.',
            'payload' => ['env' => 'production_ready', 'modules' => 10],
            'ip_address' => '127.0.0.1',
        ]);

        // 3. Module 1: Kanban & Productivity
        $board = KanbanBoard::create([
            'title' => 'Enterprise Engineering & Operations Sprint',
            'description' => 'Main operational backlog, active department sprints, and milestone deliveries.',
            'department' => 'Operations',
            'created_by' => $users['super_admin']->id,
        ]);

        $colBacklog = KanbanColumn::create(['board_id' => $board->id, 'title' => 'Backlog', 'color' => '#64748b', 'position' => 0]);
        $colInProgress = KanbanColumn::create(['board_id' => $board->id, 'title' => 'In Progress', 'color' => '#3b82f6', 'position' => 1]);
        $colReview = KanbanColumn::create(['board_id' => $board->id, 'title' => 'Quality Review', 'color' => '#f59e0b', 'position' => 2]);
        $colDone = KanbanColumn::create(['board_id' => $board->id, 'title' => 'Completed', 'color' => '#10b981', 'position' => 3]);

        KanbanTask::create([
            'board_id' => $board->id,
            'column_id' => $colBacklog->id,
            'title' => 'Review API Gateway Rate Limits & Token Expiry',
            'description' => 'Fine-tune throttling limits to 120 req/min per tenant token.',
            'priority' => 'High',
            'due_date' => now()->addDays(5),
            'assigned_to' => $users['dept_user']->id,
            'created_by' => $users['admin_manager']->id,
            'position' => 0,
            'labels' => ['Security', 'API'],
        ]);

        KanbanTask::create([
            'board_id' => $board->id,
            'column_id' => $colInProgress->id,
            'title' => 'Implement Automated Disaster Recovery Runbook',
            'description' => 'Set up automated snapshot verification for MariaDB & Redis failover.',
            'priority' => 'Urgent',
            'due_date' => now()->addDays(2),
            'assigned_to' => $users['production_staff']->id,
            'created_by' => $users['super_admin']->id,
            'position' => 0,
            'labels' => ['DevOps', 'Data'],
        ]);

        KanbanTask::create([
            'board_id' => $board->id,
            'column_id' => $colReview->id,
            'title' => 'Audit Q3 Financial Statements & Ledger Sync',
            'description' => 'Verify reconciliation reports between internal AP/AR and banking records.',
            'priority' => 'Medium',
            'due_date' => now()->addDays(1),
            'assigned_to' => $users['finance_staff']->id,
            'created_by' => $users['admin_manager']->id,
            'position' => 0,
            'labels' => ['Finance', 'Audit'],
        ]);

        KanbanTask::create([
            'board_id' => $board->id,
            'column_id' => $colDone->id,
            'title' => 'Deploy Multi-Tenant RBAC Security Module',
            'description' => 'Full RBAC role matrix completed with 10 role permissions.',
            'priority' => 'High',
            'due_date' => now()->subDay(),
            'assigned_to' => $users['super_admin']->id,
            'created_by' => $users['super_admin']->id,
            'position' => 0,
            'labels' => ['Security', 'Core'],
            'completed_at' => now(),
        ]);

        // 4. Module 2: HR Management
        $emp1 = HrEmployee::create([
            'user_id' => $users['hr_staff']->id,
            'emp_code' => 'EMP-1001',
            'first_name' => 'Sarah',
            'last_name' => 'Jenkins',
            'email' => 'sarah.j@angora.internal',
            'phone' => '+1 (555) 010-0004',
            'department' => 'Human Resources',
            'designation' => 'Lead People Operations',
            'employment_type' => 'Full-Time',
            'join_date' => now()->subMonths(18),
            'basic_salary' => 85000.00,
            'status' => 'Active',
        ]);

        $emp2 = HrEmployee::create([
            'user_id' => $users['dept_user']->id,
            'emp_code' => 'EMP-1002',
            'first_name' => 'David',
            'last_name' => 'Chen',
            'email' => 'david.c@angora.internal',
            'phone' => '+1 (555) 010-0003',
            'department' => 'Engineering',
            'designation' => 'Senior Systems Architect',
            'employment_type' => 'Full-Time',
            'join_date' => now()->subMonths(14),
            'basic_salary' => 115000.00,
            'status' => 'Active',
        ]);

        $emp3 = HrEmployee::create([
            'user_id' => $users['production_staff']->id,
            'emp_code' => 'EMP-1003',
            'first_name' => 'Marcus',
            'last_name' => 'Brody',
            'email' => 'marcus.b@angora.internal',
            'phone' => '+1 (555) 010-0005',
            'department' => 'Production & QC',
            'designation' => 'Plant Floor Supervisor',
            'employment_type' => 'Full-Time',
            'join_date' => now()->subMonths(8),
            'basic_salary' => 78000.00,
            'status' => 'Active',
        ]);

        HrAttendance::create([
            'employee_id' => $emp1->id,
            'date' => now()->toDateString(),
            'clock_in' => '08:58:00',
            'clock_out' => '17:30:00',
            'working_hours' => 8.5,
            'status' => 'Present',
        ]);
        HrAttendance::create([
            'employee_id' => $emp2->id,
            'date' => now()->toDateString(),
            'clock_in' => '09:05:00',
            'clock_out' => '18:00:00',
            'working_hours' => 8.9,
            'status' => 'Present',
        ]);

        HrLeaveRequest::create([
            'employee_id' => $emp2->id,
            'leave_type' => 'Annual',
            'start_date' => now()->addDays(14),
            'end_date' => now()->addDays(18),
            'total_days' => 5,
            'reason' => 'Family vacation leave',
            'status' => 'Approved',
            'approved_by' => $users['hr_staff']->id,
            'approver_comment' => 'Coverage arranged. Approved.',
        ]);

        HrPerformanceReview::create([
            'employee_id' => $emp2->id,
            'reviewer_id' => $users['super_admin']->id,
            'review_period' => 'Q3 2026',
            'rating' => 9,
            'feedback' => 'Exceptional technical execution on the platform integration and microservices layout.',
            'goals' => 'Lead database sharding and caching optimizations in Q4.',
            'status' => 'Finalized',
        ]);

        // 5. Module 3: Production Management
        $wo1 = ProductionWorkOrder::create([
            'order_no' => 'WO-2026-001',
            'product_title' => 'Industrial Optical Sensor Modules (Series X)',
            'batch_number' => 'BATCH-8891-A',
            'quantity' => 2500,
            'completed_quantity' => 2500,
            'status' => 'Completed',
            'priority' => 'Normal',
            'start_date' => now()->subDays(10),
            'target_date' => now()->subDays(2),
            'assigned_unit' => 'Assembly Line 1',
            'supervisor_id' => $users['production_staff']->id,
            'notes' => 'Batch completed on schedule with zero deviations.',
        ]);

        $wo2 = ProductionWorkOrder::create([
            'order_no' => 'WO-2026-002',
            'product_title' => 'High-Precision Stepper Controllers',
            'batch_number' => 'BATCH-8892-B',
            'quantity' => 1200,
            'completed_quantity' => 850,
            'status' => 'In Production',
            'priority' => 'High',
            'start_date' => now()->subDays(4),
            'target_date' => now()->addDays(3),
            'assigned_unit' => 'SMT Surface Mount Line 3',
            'supervisor_id' => $users['production_staff']->id,
            'notes' => 'Component soldering stage underway.',
        ]);

        $wo3 = ProductionWorkOrder::create([
            'order_no' => 'WO-2026-003',
            'product_title' => 'Embedded Telemetry Gateway Units',
            'batch_number' => 'BATCH-8893-C',
            'quantity' => 500,
            'completed_quantity' => 500,
            'status' => 'QA Review',
            'priority' => 'Urgent',
            'start_date' => now()->subDays(3),
            'target_date' => now()->addDays(1),
            'assigned_unit' => 'Cleanroom Inspection',
            'supervisor_id' => $users['production_staff']->id,
            'notes' => 'Awaiting firmware cryptographic signing verification.',
        ]);

        ProductionQualityCheck::create([
            'work_order_id' => $wo1->id,
            'inspector_id' => $users['production_staff']->id,
            'sample_size' => 150,
            'defect_count' => 1,
            'status' => 'Passed',
            'checklist_data' => ['voltage_test' => 'Pass', 'thermal_tolerance' => 'Pass', 'casing_integrity' => 'Pass'],
            'notes' => 'Defect rate 0.6%, well below 2.0% threshold. Passed.',
            'inspected_at' => now()->subDays(2),
        ]);

        ProductionIncident::create([
            'work_order_id' => $wo2->id,
            'title' => 'Thermal calibration drift on SMT Oven #2',
            'machine_line' => 'SMT Line 3',
            'severity' => 'Medium',
            'reported_by' => $users['production_staff']->id,
            'status' => 'Investigating',
            'description' => 'Temperature probe variance of 3.2°C detected during reflow stage.',
            'corrective_action' => 'Sensor recalibration in progress by maintenance technician.',
        ]);

        // 6. Module 4: Sales Management (CRM)
        $c1 = SalesCustomer::create([
            'name' => 'Apex Dynamics Ltd',
            'company' => 'Apex Global Industries',
            'email' => 'purchasing@apexdynamics.com',
            'phone' => '+1 (555) 492-1100',
            'city' => 'Chicago, IL',
            'status' => 'Customer',
            'total_spend' => 184500.00,
        ]);

        $c2 = SalesCustomer::create([
            'name' => 'Vanguard Robotics Inc',
            'company' => 'Vanguard Technologies',
            'email' => 'procurement@vanguardrobotics.io',
            'phone' => '+1 (555) 388-2991',
            'city' => 'San Jose, CA',
            'status' => 'Prospect',
            'total_spend' => 45000.00,
        ]);

        SalesLead::create([
            'customer_id' => $c2->id,
            'title' => 'Autonomous Navigation Core Supply Agreement (1,000 units)',
            'deal_value' => 125000.00,
            'stage' => 'Proposal',
            'probability' => 70,
            'expected_close_date' => now()->addDays(20),
            'assigned_to' => $users['sales_staff']->id,
            'notes' => 'RFP submission delivered. Technical review scheduled for Friday.',
        ]);

        SalesLead::create([
            'customer_id' => $c1->id,
            'title' => 'Annual Sensor Modules Refresh Contract',
            'deal_value' => 88000.00,
            'stage' => 'Closed Won',
            'probability' => 100,
            'expected_close_date' => now()->subDays(5),
            'assigned_to' => $users['sales_staff']->id,
            'notes' => 'PO received and validated.',
        ]);

        SalesInvoice::create([
            'invoice_code' => 'INV-2026-1042',
            'customer_id' => $c1->id,
            'type' => 'Invoice',
            'subtotal' => 88000.00,
            'tax_amount' => 7040.00,
            'total_amount' => 95040.00,
            'status' => 'Paid',
            'issue_date' => now()->subDays(10),
            'due_date' => now()->addDays(20),
            'items_json' => [
                ['name' => 'Optical Sensor Module Series X', 'qty' => 1000, 'price' => 88.00]
            ],
            'notes' => 'Settled via wire transfer.',
        ]);

        SalesTarget::create([
            'user_id' => $users['sales_staff']->id,
            'period' => 'Q4 2026',
            'target_amount' => 350000.00,
            'achieved_amount' => 213040.00,
        ]);

        // 7. Module 5: Marketing Management
        $camp1 = MarketingCampaign::create([
            'name' => 'NextGen Industrial Automation Summit 2026',
            'channel' => 'Events',
            'budget' => 45000.00,
            'spend' => 38200.00,
            'impressions' => 125000,
            'clicks' => 8400,
            'leads_generated' => 420,
            'conversions' => 64,
            'status' => 'Active',
            'start_date' => now()->subDays(15),
            'end_date' => now()->addDays(15),
            'target_audience' => 'VP of Engineering, Plant Directors, Automation Architects',
        ]);

        MarketingCampaign::create([
            'name' => 'Q4 Enterprise Search & B2B LinkedIn Campaign',
            'channel' => 'Social Media',
            'budget' => 20000.00,
            'spend' => 12400.00,
            'impressions' => 340000,
            'clicks' => 14200,
            'leads_generated' => 290,
            'conversions' => 38,
            'status' => 'Active',
            'start_date' => now()->subDays(20),
            'end_date' => now()->addDays(30),
            'target_audience' => 'OEM Manufacturers and Robotics System Integrators',
        ]);

        MarketingContent::create([
            'campaign_id' => $camp1->id,
            'title' => 'Scaling IoT Hardware with Zero Downtime: An Architecture Blueprint',
            'format' => 'Whitepaper',
            'platform' => 'LinkedIn',
            'status' => 'Published',
            'scheduled_date' => now()->subDays(3),
            'author_id' => $users['marketing_staff']->id,
            'copy_notes' => 'Promoted post with gated technical PDF download.',
        ]);

        // 8. Module 6: Finance Management
        FinanceBudget::create([
            'department' => 'Engineering',
            'fiscal_year' => 'FY2026',
            'allocated_amount' => 500000.00,
            'spent_amount' => 312500.00,
        ]);
        FinanceBudget::create([
            'department' => 'Production & QC',
            'fiscal_year' => 'FY2026',
            'allocated_amount' => 850000.00,
            'spent_amount' => 620000.00,
        ]);
        FinanceBudget::create([
            'department' => 'Marketing',
            'fiscal_year' => 'FY2026',
            'allocated_amount' => 220000.00,
            'spent_amount' => 145000.00,
        ]);
        FinanceBudget::create([
            'department' => 'Operations',
            'fiscal_year' => 'FY2026',
            'allocated_amount' => 180000.00,
            'spent_amount' => 102000.00,
        ]);

        FinanceExpense::create([
            'user_id' => $users['dept_user']->id,
            'department' => 'Engineering',
            'category' => 'Software',
            'title' => 'Annual Cloud Telemetry & Redis Cluster License',
            'amount' => 4850.00,
            'status' => 'Approved',
            'approved_by' => $users['finance_staff']->id,
            'approver_comment' => 'Essential cloud capacity upgrade approved.',
        ]);

        FinanceExpense::create([
            'user_id' => $users['production_staff']->id,
            'department' => 'Production & QC',
            'category' => 'Equipment',
            'title' => 'SMT Calibration Microscope & Test Probes',
            'amount' => 1850.00,
            'status' => 'Pending',
        ]);

        FinanceTransaction::create([
            'type' => 'Payable',
            'party_name' => 'Silicon Components Global GmbH',
            'invoice_ref' => 'BILL-88219',
            'amount' => 42500.00,
            'due_date' => now()->addDays(12),
            'status' => 'Pending',
        ]);
        FinanceTransaction::create([
            'type' => 'Receivable',
            'party_name' => 'Apex Dynamics Ltd',
            'invoice_ref' => 'INV-2026-1042',
            'amount' => 95040.00,
            'due_date' => now()->addDays(20),
            'status' => 'Settled',
            'paid_date' => now()->subDays(2),
        ]);

        // 9. Module 7: Operations Management
        OperationsWorkflow::create([
            'title' => 'Factory Line 2 Firmware Synchronization Protocol',
            'department' => 'Operations',
            'priority' => 'High',
            'status' => 'In Progress',
            'requested_by' => $users['admin_manager']->id,
            'assigned_to' => $users['dept_user']->id,
            'description' => 'Cross-department rollout of security patched firmware across 8 automated lines.',
            'due_date' => now()->addDays(4),
        ]);

        OperationsTicket::create([
            'ticket_number' => 'OPS-TCK-901',
            'service_type' => 'Facility Request',
            'requested_by' => $users['production_staff']->id,
            'department' => 'Operations',
            'priority' => 'High',
            'status' => 'In Progress',
            'sla_due_at' => now()->addHours(8),
            'details' => 'HVAC unit in cleanroom inspection room requires humidity regulation adjustment.',
        ]);

        // 10. Module 8: Compliance & Risk Management
        CompliancePolicy::create([
            'title' => 'ISO/IEC 27001 Information Security Management',
            'policy_code' => 'POL-SEC-01',
            'category' => 'Information Security',
            'version' => '3.2',
            'effective_date' => now()->subMonths(6),
            'status' => 'Active',
            'description' => 'Mandatory requirements for digital asset security, encryption at rest, and RBAC token rotation.',
        ]);

        CompliancePolicy::create([
            'title' => 'Workplace Safety & Heavy Machinery Standard Operating Procedure',
            'policy_code' => 'POL-OPS-04',
            'category' => 'Health & Safety',
            'version' => '2.0',
            'effective_date' => now()->subMonths(3),
            'status' => 'Active',
            'description' => 'Safety equipment guidelines, lockout/tagout procedures, and emergency stop protocols.',
        ]);

        ComplianceRisk::create([
            'title' => 'Single-Source Microcontroller Supply Chain Volatility',
            'category' => 'Operational',
            'likelihood' => 3,
            'impact' => 4,
            'risk_score' => 12,
            'mitigation_strategy' => 'Dual-source qualification initiated with alternative European fab.',
            'status' => 'Mitigating',
            'owner_id' => $users['admin_manager']->id,
        ]);

        ComplianceIncident::create([
            'incident_code' => 'INC-2026-08',
            'type' => 'Data Breach',
            'severity' => 'Low',
            'reported_by' => $users['dept_user']->id,
            'incident_date' => now()->subDays(6),
            'status' => 'Remediated',
            'summary' => 'Stale test API token detected in public sandbox staging environment. Revoked within 7 minutes.',
            'resolution_action' => 'Automatic secret scanning added to GitHub Actions CI/CD pipeline.',
        ]);

        // 11. Module 9: Document & File Management
        $cat1 = DocumentCategory::create(['name' => 'Enterprise Architecture & Tech Specs', 'slug' => 'tech-specs', 'color' => '#3b82f6', 'icon' => 'server']);
        $cat2 = DocumentCategory::create(['name' => 'HR Guidelines & Employee Handbooks', 'slug' => 'hr-policies', 'color' => '#10b981', 'icon' => 'users']);
        $cat3 = DocumentCategory::create(['name' => 'Financial Audits & Annual Reports', 'slug' => 'finance-reports', 'color' => '#f59e0b', 'icon' => 'dollar-sign']);
        $cat4 = DocumentCategory::create(['name' => 'Operations & Quality SOPs', 'slug' => 'operations-sop', 'color' => '#8b5cf6', 'icon' => 'shield']);

        Document::create([
            'category_id' => $cat1->id,
            'user_id' => $users['super_admin']->id,
            'title' => 'Angora Enterprise System Architecture Specification v2.4',
            'original_filename' => 'Angora_Enterprise_Architecture_Overview.pdf',
            'file_path' => 'documents/architecture-overview.pdf',
            'file_size_kb' => 3420,
            'mime_type' => 'application/pdf',
            'department_access' => 'All',
            'version' => '2.4',
        ]);

        Document::create([
            'category_id' => $cat2->id,
            'user_id' => $users['hr_staff']->id,
            'title' => '2026 Global Employee Handbook & Remote Policy',
            'original_filename' => 'Employee_Handbook_2026.pdf',
            'file_path' => 'documents/employee-handbook.pdf',
            'file_size_kb' => 1840,
            'mime_type' => 'application/pdf',
            'department_access' => 'All',
            'version' => '1.0',
        ]);

        Document::create([
            'category_id' => $cat3->id,
            'user_id' => $users['finance_staff']->id,
            'title' => 'Q3 2026 Consolidated Balance Sheet & P&L Statement',
            'original_filename' => 'Financial_Summary_Q3_2026.xlsx',
            'file_path' => 'documents/finance-q3.xlsx',
            'file_size_kb' => 950,
            'mime_type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'department_access' => 'Finance',
            'version' => '1.2',
        ]);

        Document::create([
            'category_id' => $cat4->id,
            'user_id' => $users['production_staff']->id,
            'title' => 'SMT Line Quality Assurance Inspection Manual (Rev C)',
            'original_filename' => 'QA_Inspection_Manual_RevC.pdf',
            'file_path' => 'documents/qa-inspection.pdf',
            'file_size_kb' => 4120,
            'mime_type' => 'application/pdf',
            'department_access' => 'Production & QC',
            'version' => '3.0',
        ]);

        $this->call(WorkOsExpansionSeeder::class);
        $this->call(WorkOsTemplateSeeder::class);
    }
}
