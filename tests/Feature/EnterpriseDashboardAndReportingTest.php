<?php

namespace Tests\Feature;

use App\Models\AgencyProject;
use App\Models\AnalyticsReport;
use App\Models\Dashboard;
use App\Models\DashboardWidget;
use App\Models\FinanceBudget;
use App\Models\HrEmployee;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\ScheduledReport;
use App\Models\User;
use App\Models\Workspace;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EnterpriseDashboardAndReportingTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $projectManager;
    protected User $teamMember;
    protected User $externalClient;
    protected KanbanBoard $board;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->superAdmin = User::role('super_admin')->first();

        $this->projectManager = User::factory()->create([
            'role' => 'admin_manager',
            'department' => 'Operations',
            'email' => 'pm@angora.internal',
        ]);

        $this->teamMember = User::factory()->create([
            'role' => 'team_member',
            'department' => 'Operations',
            'email' => 'member@angora.internal',
        ]);

        $this->externalClient = User::factory()->create([
            'role' => 'external_user',
            'email' => 'client@external.com',
        ]);

        $workspace = Workspace::create([
            'name' => 'HQ Analytics Workspace',
            'owner_id' => $this->superAdmin->id,
        ]);

        $this->board = KanbanBoard::create([
            'title' => 'Core Development Board',
            'workspace_id' => $workspace->id,
            'created_by' => $this->superAdmin->id,
        ]);

        $col = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'In Progress',
            'color' => '#0085ff',
            'position' => 0,
        ]);

        // Seed some sample tasks
        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $col->id,
            'title' => 'High Priority Backend API',
            'priority' => 'High',
            'assigned_to' => $this->teamMember->id,
            'created_by' => $this->superAdmin->id,
            'due_date' => now()->addDays(2)->toDateString(),
        ]);

        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $col->id,
            'title' => 'Completed Feature Spec',
            'priority' => 'Medium',
            'assigned_to' => $this->teamMember->id,
            'created_by' => $this->superAdmin->id,
            'completed_at' => now()->subDay(),
            'due_date' => now()->subDay()->toDateString(),
        ]);
    }

    public function test_can_create_and_view_executive_dashboard_with_starter_widgets(): void
    {
        $response = $this->actingAs($this->superAdmin)->post('/dashboards', [
            'name' => 'Executive Q4 Overview',
            'description' => 'Real-time multi-board KPI telemetry',
            'type' => 'executive',
            'visibility' => 'team',
        ]);

        $response->assertRedirect();

        $dashboard = Dashboard::where('name', 'Executive Q4 Overview')->first();
        $this->assertNotNull($dashboard);
        $this->assertEquals('executive', $dashboard->type);

        // Verify starter widgets automatically seeded
        $this->assertGreaterThanOrEqual(4, $dashboard->widgets()->count());

        // Can render the dashboard page
        $viewResponse = $this->actingAs($this->superAdmin)->get("/dashboards/{$dashboard->id}");
        $viewResponse->assertOk();
    }

    public function test_can_manage_widgets_and_update_layout(): void
    {
        $dashboard = Dashboard::create([
            'name' => 'Custom PM Dashboard',
            'type' => 'custom',
            'owner_id' => $this->projectManager->id,
            'visibility' => 'team',
        ]);

        // Add Widget
        $addResponse = $this->actingAs($this->projectManager)->post("/dashboards/{$dashboard->id}/widgets", [
            'title' => 'Overdue Tasks Count',
            'type' => 'numbers',
            'config' => [
                'metric' => 'overdue_tasks',
            ],
            'layout' => ['w' => 4, 'h' => 2],
        ]);
        $addResponse->assertRedirect();

        $widget = DashboardWidget::where('dashboard_id', $dashboard->id)->first();
        $this->assertNotNull($widget);
        $this->assertEquals('Overdue Tasks Count', $widget->title);

        // Update layout via AJAX
        $layoutResponse = $this->actingAs($this->projectManager)->postJson("/dashboards/{$dashboard->id}/layout", [
            'widgets' => [
                [
                    'id' => $widget->id,
                    'position' => 5,
                    'layout' => ['w' => 6, 'h' => 3],
                ],
            ],
        ]);
        $layoutResponse->assertOk();
        $widget->refresh();
        $this->assertEquals(5, $widget->position);
        $this->assertEquals(6, $widget->layout['w']);

        // Delete widget
        $deleteResponse = $this->actingAs($this->projectManager)->delete("/dashboards/{$dashboard->id}/widgets/{$widget->id}");
        $deleteResponse->assertRedirect();
        $this->assertDatabaseMissing('dashboard_widgets', ['id' => $widget->id]);
    }

    public function test_rbac_and_permission_isolation_for_financial_and_client_users(): void
    {
        // 1. External client user must NOT access internal dashboards hub
        $clientResponse = $this->actingAs($this->externalClient)->get('/dashboards');
        $clientResponse->assertStatus(403);

        // 2. Dashboard with restricted financial metric
        $dashboard = Dashboard::create([
            'name' => 'Financial Overview',
            'type' => 'custom',
            'owner_id' => $this->superAdmin->id,
            'visibility' => 'team',
        ]);

        $widget = DashboardWidget::create([
            'dashboard_id' => $dashboard->id,
            'title' => 'Company Budget Pool',
            'type' => 'numbers',
            'config' => ['metric' => 'finance_budget_total'],
            'position' => 1,
        ]);

        FinanceBudget::create([
            'department' => 'Operations',
            'fiscal_year' => 'FY2026',
            'allocated_amount' => 500000.00,
            'spent_amount' => 120000.00,
        ]);

        // Standard team member without finance.view should receive restricted indicator in widget data
        $service = app(\App\Services\DashboardAnalyticsService::class);
        $restrictedData = $service->computeWidgetData($widget, $this->teamMember);
        $this->assertTrue($restrictedData['restricted'] ?? false);
        $this->assertEquals('Restricted', $restrictedData['label']);

        // Super admin should receive calculated financial amount
        $adminData = $service->computeWidgetData($widget, $this->superAdmin);
        $this->assertFalse($adminData['restricted'] ?? false);
        $this->assertStringContainsString('$', $adminData['value']);

    }

    public function test_report_builder_and_csv_export(): void
    {
        // Create an analytics report
        $createResponse = $this->actingAs($this->projectManager)->post('/reports', [
            'title' => 'Task Completion Audit',
            'description' => 'Export of all tasks across current boards',
            'report_type' => 'task_completion',
            'config' => ['board_ids' => [$this->board->id]],
        ]);
        $createResponse->assertRedirect();

        $report = AnalyticsReport::where('title', 'Task Completion Audit')->first();
        $this->assertNotNull($report);

        // Preview JSON data
        $previewResponse = $this->actingAs($this->projectManager)->getJson("/reports/{$report->id}/preview");
        $previewResponse->assertOk()
            ->assertJsonStructure(['headers', 'rows', 'summary']);

        // Download CSV
        $exportResponse = $this->actingAs($this->projectManager)->get("/reports/{$report->id}/export");
        $exportResponse->assertOk();
        $this->assertStringContainsString('text/csv', $exportResponse->headers->get('Content-Type'));
        $this->assertStringContainsString('High Priority Backend API', $exportResponse->getContent());
    }

    public function test_scheduled_reports_lifecycle_and_artisan_dispatch(): void
    {
        $report = AnalyticsReport::create([
            'title' => 'Automated Weekly Dispatch',
            'report_type' => 'task_completion',
            'created_by' => $this->superAdmin->id,
            'config' => [],
        ]);

        // Add a schedule
        $scheduleResponse = $this->actingAs($this->superAdmin)->post("/reports/{$report->id}/schedules", [
            'title' => 'Weekly Executive Digest',
            'frequency' => 'weekly',
            'format' => 'csv',
            'recipients' => ['executives@angora.internal'],
        ]);
        $scheduleResponse->assertRedirect();

        $schedule = ScheduledReport::where('title', 'Weekly Executive Digest')->first();
        $this->assertNotNull($schedule);
        $this->assertTrue($schedule->is_active);

        // Make schedule due
        $schedule->update(['next_run_at' => now()->subMinute()]);

        // Run artisan console command to process reports
        $this->artisan('reports:send-scheduled')
            ->assertSuccessful();

        $schedule->refresh();
        $this->assertNotNull($schedule->last_sent_at);
        $this->assertNotNull($schedule->next_run_at);
    }
}
