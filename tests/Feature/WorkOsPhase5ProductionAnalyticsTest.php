<?php

namespace Tests\Feature;

use App\Models\BoardGroup;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\TaskReviewCycle;
use App\Models\User;
use App\Models\Workspace;
use App\Services\ProductionAnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class WorkOsPhase5ProductionAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $member;
    protected User $externalUser;
    protected Workspace $workspace;
    protected KanbanBoard $board;
    protected KanbanColumn $colProgress;
    protected KanbanColumn $colDone;
    protected BoardGroup $group;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'super_admin',
            'status' => 'active',
            'name' => 'Analytics Admin',
        ]);

        $this->member = User::factory()->create([
            'role' => 'dept_user',
            'status' => 'active',
            'name' => 'Team Member',
        ]);

        $this->externalUser = User::factory()->create([
            'role' => 'external_user',
            'status' => 'active',
            'name' => 'External Viewer',
        ]);

        $this->workspace = Workspace::create([
            'name' => 'Analytics Workspace',
            'slug' => 'analytics-workspace',
            'owner_id' => $this->admin->id,
        ]);
        $this->workspace->users()->attach($this->admin->id, ['role' => 'admin']);
        $this->workspace->users()->attach($this->member->id, ['role' => 'member']);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Production Analytics Board',
            'created_by' => $this->admin->id,
        ]);

        $this->colProgress = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'In Production',
            'position' => 0,
            'color' => '#3b82f6',
        ]);

        $this->colDone = KanbanColumn::create([
            'board_id' => $this->board->id,
            'title' => 'Delivered',
            'position' => 1,
            'color' => '#10b981',
        ]);

        $this->group = BoardGroup::create([
            'board_id' => $this->board->id,
            'title' => 'Batch Alpha',
            'color' => '#6366f1',
            'position' => 0,
        ]);
    }

    public function test_can_get_delivery_metrics_endpoint()
    {
        // 1 on-time task
        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colDone->id,
            'group_id' => $this->group->id,
            'title' => 'Feature Completed On Time',
            'priority' => 'High',
            'created_at' => Carbon::now()->subDays(5),
            'start_date' => Carbon::now()->subDays(4)->toDateString(),
            'due_date' => Carbon::now()->addDays(1)->toDateString(),
            'completed_at' => Carbon::now(),
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->member)
            ->getJson("/kanban/boards/{$this->board->id}/delivery-metrics");

        $response->assertOk();
        $response->assertJsonStructure([
            'window_days',
            'summary' => [
                'total_tasks',
                'completed_tasks',
                'active_tasks',
                'completion_rate',
                'health_score',
            ],
            'lead_time' => [
                'avg_days',
                'median_days',
                'min_days',
                'max_days',
            ],
            'cycle_time' => [
                'avg_days',
                'median_days',
                'min_days',
                'max_days',
            ],
            'on_time_delivery' => [
                'rate_percentage',
                'on_time_count',
                'late_count',
                'no_due_date_count',
                'total_measured',
            ],
            'throughput' => [
                'avg_weekly',
                'total_recent',
                'weekly_breakdown',
            ],
            'review_turnaround' => [
                'avg_hours',
                'total_cycles',
                'first_time_approval_rate',
            ],
        ]);
    }

    public function test_on_time_delivery_rate_calculation()
    {
        // 2 on-time tasks, 1 late task
        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colDone->id,
            'group_id' => $this->group->id,
            'title' => 'Early Task',
            'priority' => 'Medium',
            'due_date' => Carbon::parse('2026-10-10'),
            'completed_at' => Carbon::parse('2026-10-09 14:00:00'),
            'created_by' => $this->admin->id,
        ]);

        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colDone->id,
            'group_id' => $this->group->id,
            'title' => 'Deadline Day Task',
            'priority' => 'Medium',
            'due_date' => Carbon::parse('2026-10-10'),
            'completed_at' => Carbon::parse('2026-10-10 18:00:00'),
            'created_by' => $this->admin->id,
        ]);

        KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colDone->id,
            'group_id' => $this->group->id,
            'title' => 'Late Task',
            'priority' => 'High',
            'due_date' => Carbon::parse('2026-10-10'),
            'completed_at' => Carbon::parse('2026-10-12 10:00:00'), // 2 days late
            'created_by' => $this->admin->id,
        ]);

        $service = app(ProductionAnalyticsService::class);
        $metrics = $service->calculateDeliveryMetrics($this->board);

        // 2 on-time out of 3 measured = 66.7%
        $this->assertEquals(2, $metrics['on_time_delivery']['on_time_count']);
        $this->assertEquals(1, $metrics['on_time_delivery']['late_count']);
        $this->assertEquals(66.7, $metrics['on_time_delivery']['rate_percentage']);
    }

    public function test_lead_time_and_cycle_time_calculation()
    {
        // Created Oct 1 10:00, started Oct 3 10:00, completed Oct 7 10:00
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colDone->id,
            'group_id' => $this->group->id,
            'title' => 'Tracked Duration Task',
            'priority' => 'High',
            'start_date' => '2026-10-03',
            'start_time' => '10:00',
            'completed_at' => Carbon::parse('2026-10-07 10:00:00'),
            'created_by' => $this->admin->id,
        ]);

        KanbanTask::where('id', $task->id)->update([
            'created_at' => Carbon::parse('2026-10-01 10:00:00'),
        ]);

        $service = app(ProductionAnalyticsService::class);
        $metrics = $service->calculateDeliveryMetrics($this->board);

        // Lead time ~ 6 days, Cycle time ~ 4 days
        $this->assertEquals(6.0, $metrics['lead_time']['avg_days']);
        $this->assertEquals(4.0, $metrics['cycle_time']['avg_days']);
    }

    public function test_review_turnaround_time_calculation()
    {
        $task = KanbanTask::create([
            'board_id' => $this->board->id,
            'column_id' => $this->colDone->id,
            'group_id' => $this->group->id,
            'title' => 'Reviewed Deliverable',
            'priority' => 'High',
            'created_by' => $this->admin->id,
            'completed_at' => Carbon::now(),
        ]);

        // Review cycle: submitted 8 hours ago, resolved 2 hours ago => 6 hours turnaround
        TaskReviewCycle::create([
            'task_id' => $task->id,
            'round_number' => 1,
            'submitted_by' => $this->member->id,
            'state' => 'approved',
            'submitted_at' => Carbon::now()->subHours(8),
            'resolved_at' => Carbon::now()->subHours(2),
        ]);

        $service = app(ProductionAnalyticsService::class);
        $metrics = $service->calculateDeliveryMetrics($this->board);

        $this->assertEquals(6.0, $metrics['review_turnaround']['avg_hours']);
        $this->assertEquals(100.0, $metrics['review_turnaround']['first_time_approval_rate']);
    }

    public function test_unauthorized_user_cannot_access_delivery_metrics()
    {
        $response = $this->actingAs($this->externalUser)
            ->getJson("/kanban/boards/{$this->board->id}/delivery-metrics");

        $response->assertForbidden();
    }
}
