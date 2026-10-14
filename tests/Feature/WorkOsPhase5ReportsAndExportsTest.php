<?php

namespace Tests\Feature;

use App\Models\AnalyticsReport;
use App\Models\BoardGroup;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\Workspace;
use App\Services\ReportExportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorkOsPhase5ReportsAndExportsTest extends TestCase
{
    use RefreshDatabase;

    protected Workspace $workspace;
    protected Workspace $otherWorkspace;
    protected KanbanBoard $board;
    protected KanbanColumn $colTodo;
    protected KanbanColumn $colDone;
    protected BoardGroup $group;
    protected User $admin;
    protected User $member;
    protected User $externalUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
            'name' => 'Admin User',
            'email' => 'admin@angora.test',
        ]);

        $this->member = User::factory()->create([
            'role' => 'dept_user',
            'name' => 'Team Member',
            'email' => 'member@angora.test',
            'weekly_capacity_hours' => 40,
            'daily_capacity_hours' => 8,
        ]);

        $this->externalUser = User::factory()->create([
            'role' => 'dept_user',
            'name' => 'Outside User',
            'email' => 'outside@angora.test',
        ]);

        $this->workspace = Workspace::create([
            'name' => 'Acme Creative Studio',
            'slug' => 'acme-creative',
            'owner_id' => $this->admin->id,
            'status' => 'active',
        ]);

        $this->otherWorkspace = Workspace::create([
            'name' => 'Outside Studio',
            'slug' => 'outside-studio',
            'owner_id' => $this->externalUser->id,
            'status' => 'active',
        ]);

        $this->workspace->members()->create(['user_id' => $this->admin->id, 'role' => 'admin']);
        $this->workspace->members()->create(['user_id' => $this->member->id, 'role' => 'member']);
        $this->otherWorkspace->members()->create(['user_id' => $this->externalUser->id, 'role' => 'member']);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Social Media Campaign Q4',
            'created_by' => $this->admin->id,
        ]);

        $this->colTodo = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'To Do',
            'position' => 0,
            'semantic_category' => 'not_started',
        ]);

        $this->colDone = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Done',
            'position' => 1,
            'semantic_category' => 'completed',
        ]);

        $this->group = BoardGroup::create([
            'board_id' => $this->board->id,
            'title' => 'Sprint 1',
            'position' => 0,
        ]);
    }

    public function test_csv_formula_injection_sanitization_helper(): void
    {
        // Formula injection prefixes (=, +, -, @, \t, \r) must be prepended with a single quote
        $this->assertEquals("'=cmd|' /C calc'!A0", ReportExportService::sanitizeCsvCell("=cmd|' /C calc'!A0"));
        $this->assertEquals("'+12345", ReportExportService::sanitizeCsvCell("+12345"));
        $this->assertEquals("'-100", ReportExportService::sanitizeCsvCell("-100"));
        $this->assertEquals("'@SUM(A1:A10)", ReportExportService::sanitizeCsvCell("@SUM(A1:A10)"));
        $this->assertEquals("'\tTabDelimited", ReportExportService::sanitizeCsvCell("\tTabDelimited"));
        $this->assertEquals("'\rCarriageReturn", ReportExportService::sanitizeCsvCell("\rCarriageReturn"));
        $this->assertEquals("'   =SUM(1,2)", ReportExportService::sanitizeCsvCell("   =SUM(1,2)"));

        // Safe benign text and numbers are unchanged
        $this->assertEquals("Brand Guidelines V2", ReportExportService::sanitizeCsvCell("Brand Guidelines V2"));
        $this->assertEquals("42", ReportExportService::sanitizeCsvCell("42"));
        $this->assertEquals("", ReportExportService::sanitizeCsvCell(null));
    }

    public function test_user_can_export_board_tasks_as_csv_with_sanitized_cells(): void
    {
        KanbanTask::create([
            'board_id' => $this->board->id,
            'group_id' => $this->group->id,
            'column_id' => $this->colTodo->id,
            'title' => '=2+5',
            'created_by' => $this->admin->id,
            'assigned_to' => $this->member->id,
            'priority' => 'high',
            'progress' => 30,
            'estimated_hours' => 6,
        ]);

        KanbanTask::create([
            'board_id' => $this->board->id,
            'group_id' => $this->group->id,
            'column_id' => $this->colDone->id,
            'title' => '@SUM(B1:B20)',
            'created_by' => $this->admin->id,
            'assigned_to' => $this->member->id,
            'priority' => 'medium',
            'progress' => 100,
            'completed_at' => now(),
            'estimated_hours' => 4,
        ]);

        $response = $this->actingAs($this->member)->get(route('kanban.boards.export', [
            'board' => $this->board->id,
            'format' => 'csv',
        ]));

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('attachment; filename="board-social-media-campaign-q4-tasks-', $response->headers->get('Content-Disposition'));

        $content = $response->getContent();

        // Ensure headers are present
        $this->assertStringContainsString('Task Title', $content);
        $this->assertStringContainsString('Progress (%)', $content);

        // Verify formula injection protection: formula cells must be single-quote prefixed
        $this->assertStringContainsString("'=2+5", $content);
        $this->assertStringContainsString("'@SUM(B1:B20)", $content);
        $this->assertStringNotContainsString("\n=2+5", $content);
    }

    public function test_user_can_export_board_tasks_as_json_with_filters(): void
    {
        $task1 = KanbanTask::create([
            'board_id' => $this->board->id,
            'group_id' => $this->group->id,
            'column_id' => $this->colTodo->id,
            'title' => 'Target Group Task',
            'created_by' => $this->admin->id,
            'assigned_to' => $this->member->id,
            'priority' => 'high',
            'progress' => 20,
        ]);

        $otherGroup = BoardGroup::create([
            'board_id' => $this->board->id,
            'title' => 'Sprint 2',
            'position' => 1,
        ]);

        KanbanTask::create([
            'board_id' => $this->board->id,
            'group_id' => $otherGroup->id,
            'column_id' => $this->colTodo->id,
            'title' => 'Other Group Task',
            'created_by' => $this->admin->id,
            'assigned_to' => $this->member->id,
        ]);

        $response = $this->actingAs($this->member)->getJson(route('kanban.boards.export', [
            'board' => $this->board->id,
            'format' => 'json',
            'group_id' => $this->group->id,
        ]));

        $response->assertOk();
        $data = $response->json();

        $this->assertEquals($this->board->id, $data['board']['id']);
        $this->assertEquals(1, $data['total_tasks']);
        $this->assertEquals($task1->id, $data['tasks'][0]['id']);
        $this->assertEquals('Target Group Task', $data['tasks'][0]['title']);
    }

    public function test_user_can_export_board_workload_analytics(): void
    {
        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colTodo->id,
            'title' => 'Heavy Modeling Task',
            'created_by' => $this->admin->id,
            'assigned_to' => $this->member->id,
            'estimated_hours' => 16,
        ]);

        // CSV Export
        $csvResponse = $this->actingAs($this->member)->get(route('kanban.boards.workload-analytics.export', [
            'board' => $this->board->id,
            'format' => 'csv',
        ]));

        $csvResponse->assertOk();
        $csvResponse->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('board-social-media-campaign-q4-workload-', $csvResponse->headers->get('Content-Disposition'));
        $this->assertStringContainsString('Capacity (Hours)', $csvResponse->getContent());
        $this->assertStringContainsString('Team Member', $csvResponse->getContent());

        // JSON Export
        $jsonResponse = $this->actingAs($this->member)->getJson(route('kanban.boards.workload-analytics.export', [
            'board' => $this->board->id,
            'format' => 'json',
        ]));

        $jsonResponse->assertOk();
        $jsonData = $jsonResponse->json();
        $this->assertArrayHasKey('members', $jsonData);
        $this->assertArrayHasKey('summary', $jsonData);
    }

    public function test_user_can_export_board_delivery_metrics(): void
    {
        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colDone->id,
            'title' => 'On-Time Delivery Deliverable',
            'created_by' => $this->admin->id,
            'assigned_to' => $this->member->id,
            'due_date' => now()->addDays(2)->toDateString(),
            'completed_at' => now(),
            'progress' => 100,
        ]);

        // CSV Export
        $csvRes = $this->actingAs($this->member)->get(route('kanban.boards.delivery-metrics.export', [
            'board' => $this->board->id,
            'format' => 'csv',
        ]));

        $csvRes->assertOk();
        $csvRes->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('board-social-media-campaign-q4-delivery-metrics-', $csvRes->headers->get('Content-Disposition'));
        $this->assertStringContainsString('On-Time Delivery Rate', $csvRes->getContent());

        // JSON Export
        $jsonRes = $this->actingAs($this->member)->getJson(route('kanban.boards.delivery-metrics.export', [
            'board' => $this->board->id,
            'format' => 'json',
        ]));

        $jsonRes->assertOk();
        $jsonData = $jsonRes->json();
        $this->assertArrayHasKey('on_time_delivery', $jsonData);
        $this->assertArrayHasKey('throughput', $jsonData);
    }

    public function test_unauthorized_user_cannot_export_board_outside_workspace(): void
    {
        $response = $this->actingAs($this->externalUser)->get(route('kanban.boards.export', [
            'board' => $this->board->id,
            'format' => 'csv',
        ]));

        $response->assertStatus(403);
    }

    public function test_report_builder_export_sanitizes_csv(): void
    {
        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colTodo->id,
            'title' => '=HYPERLINK("http://attacker.test","Malicious Link")',
            'created_by' => $this->admin->id,
            'assigned_to' => $this->member->id,
        ]);

        $report = AnalyticsReport::create([
            'title' => 'Task Completion Audit',
            'report_type' => 'task_completion',
            'config' => ['board_ids' => [$this->board->id]],
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->get(route('reports.export', [
            'report' => $report->id,
            'format' => 'csv',
        ]));

        $response->assertOk();
        $content = $response->getContent();

        // Formula injection protection verified
        $this->assertStringNotContainsString("\n=HYPERLINK", $content);
        $this->assertStringContainsString("'=HYPERLINK", $content);
    }
}
