<?php

namespace Tests\Feature;

use App\Models\BoardColumn;
use App\Models\BoardItemRelationship;
use App\Models\CrossDepartmentLink;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\KanbanTask;
use App\Models\User;
use App\Models\Workspace;
use App\Services\CrossBoardService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConnectedBoardsAndMirrorsTest extends TestCase
{
    use RefreshDatabase;

    protected User $superAdmin;
    protected User $manager;
    protected Workspace $workspaceA;
    protected Workspace $workspaceB;
    protected KanbanBoard $boardA;
    protected KanbanBoard $boardB;
    protected KanbanTask $taskA1;
    protected KanbanTask $taskB1;
    protected KanbanTask $taskB2;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);

        $this->superAdmin = User::where('role', 'super_admin')->first();
        $this->manager = User::factory()->create([
            'name' => 'Department Manager',
            'email' => 'manager@angora.work',
            'role' => 'admin_manager',
            'department' => 'Operations',
        ]);

        $this->workspaceA = Workspace::create([
            'name' => 'Operations Workspace',
            'owner_id' => $this->manager->id,
        ]);

        $this->workspaceB = Workspace::create([
            'name' => 'Production Workspace',
            'owner_id' => $this->manager->id,
        ]);

        $this->boardA = KanbanBoard::create([
            'workspace_id' => $this->workspaceA->id,
            'title' => 'Project Alpha Board',
            'department' => 'Operations',
            'created_by' => $this->manager->id,
        ]);

        $this->boardB = KanbanBoard::create([
            'workspace_id' => $this->workspaceB->id,
            'title' => 'Manufacturing Sprints',
            'department' => 'Production',
            'created_by' => $this->manager->id,
        ]);

        $colA = KanbanColumn::create(['board_id' => $this->boardA->id, 'title' => 'In Progress', 'color' => '#0085ff', 'position' => 0]);
        $colB1 = KanbanColumn::create(['board_id' => $this->boardB->id, 'title' => 'Quality Review', 'color' => '#a25ddc', 'position' => 0]);
        $colB2 = KanbanColumn::create(['board_id' => $this->boardB->id, 'title' => 'Completed', 'color' => '#00c875', 'position' => 1]);

        $this->taskA1 = KanbanTask::create([
            'board_id' => $this->boardA->id,
            'column_id' => $colA->id,
            'title' => 'Deliverable Milestone 1',
            'priority' => 'High',
            'created_by' => $this->manager->id,
            'position' => 0,
        ]);

        $this->taskB1 = KanbanTask::create([
            'board_id' => $this->boardB->id,
            'column_id' => $colB1->id,
            'title' => 'PCB Fabrication v1',
            'priority' => 'Urgent',
            'progress' => 80,
            'created_by' => $this->manager->id,
            'position' => 0,
        ]);

        $this->taskB2 = KanbanTask::create([
            'board_id' => $this->boardB->id,
            'column_id' => $colB2->id,
            'title' => 'Enclosure Assembly',
            'priority' => 'Medium',
            'progress' => 100,
            'completed_at' => now(),
            'created_by' => $this->manager->id,
            'position' => 1,
        ]);
    }

    public function test_can_link_items_across_boards_with_one_way_and_two_way_relations(): void
    {
        $this->actingAs($this->manager);

        // 1. One-way relationship from Task A1 to Task B1
        $response = $this->post(route('kanban.relationships.store'), [
            'source_task_id' => $this->taskA1->id,
            'target_task_ids' => [$this->taskB1->id],
            'column_key' => 'connected_boards',
            'relation_type' => 'one_way',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('board_item_relationships', [
            'source_task_id' => $this->taskA1->id,
            'target_task_id' => $this->taskB1->id,
            'relation_type' => 'one_way',
        ]);

        // Task B1 does NOT have reciprocal relation in one_way
        $this->assertDatabaseMissing('board_item_relationships', [
            'source_task_id' => $this->taskB1->id,
            'target_task_id' => $this->taskA1->id,
        ]);

        // 2. Two-way relationship from Task A1 to Task B2
        $respTwoWay = $this->post(route('kanban.relationships.store'), [
            'source_task_id' => $this->taskA1->id,
            'target_task_ids' => [$this->taskB2->id],
            'column_key' => 'connected_boards',
            'relation_type' => 'two_way',
        ]);

        $respTwoWay->assertRedirect();
        // Reciprocal relationship exists
        $this->assertDatabaseHas('board_item_relationships', [
            'source_task_id' => $this->taskB2->id,
            'target_task_id' => $this->taskA1->id,
            'relation_type' => 'two_way',
        ]);
    }

    public function test_can_remove_relationships_cleanly(): void
    {
        $this->actingAs($this->manager);

        $rel = BoardItemRelationship::create([
            'source_board_id' => $this->boardA->id,
            'source_task_id' => $this->taskA1->id,
            'target_board_id' => $this->boardB->id,
            'target_task_id' => $this->taskB1->id,
            'column_key' => 'connected_boards',
            'relation_type' => 'two_way',
            'created_by' => $this->manager->id,
        ]);

        $reciprocal = BoardItemRelationship::create([
            'source_board_id' => $this->boardB->id,
            'source_task_id' => $this->taskB1->id,
            'target_board_id' => $this->boardA->id,
            'target_task_id' => $this->taskA1->id,
            'column_key' => 'connected_boards',
            'relation_type' => 'two_way',
            'created_by' => $this->manager->id,
        ]);

        $delResponse = $this->delete(route('kanban.relationships.destroy', $rel->id));
        $delResponse->assertRedirect();

        $this->assertDatabaseMissing('board_item_relationships', ['id' => $rel->id]);
        $this->assertDatabaseMissing('board_item_relationships', ['id' => $reciprocal->id]);
    }

    public function test_mirror_column_service_resolves_and_aggregates_connected_values(): void
    {
        // Set up links from Task A1 to both B1 and B2
        BoardItemRelationship::create([
            'source_board_id' => $this->boardA->id,
            'source_task_id' => $this->taskA1->id,
            'target_board_id' => $this->boardB->id,
            'target_task_id' => $this->taskB1->id,
            'column_key' => 'connected_boards',
            'relation_type' => 'one_way',
            'created_by' => $this->manager->id,
        ]);

        BoardItemRelationship::create([
            'source_board_id' => $this->boardA->id,
            'source_task_id' => $this->taskA1->id,
            'target_board_id' => $this->boardB->id,
            'target_task_id' => $this->taskB2->id,
            'column_key' => 'connected_boards',
            'relation_type' => 'one_way',
            'created_by' => $this->manager->id,
        ]);

        // Add Mirror columns on Board A
        $mirrorStatusCol = BoardColumn::create([
            'board_id' => $this->boardA->id,
            'key' => 'col_mirror_status',
            'title' => 'Mirrored Status',
            'type' => 'mirror',
            'config' => [
                'connect_column_key' => 'connected_boards',
                'source_field' => 'status',
                'aggregation' => 'first',
            ],
            'position' => 1,
            'is_visible' => true,
        ]);

        $mirrorAvgProgressCol = BoardColumn::create([
            'board_id' => $this->boardA->id,
            'key' => 'col_mirror_avg_prog',
            'title' => 'Avg Connected Progress',
            'type' => 'mirror',
            'config' => [
                'connect_column_key' => 'connected_boards',
                'source_field' => 'progress',
                'aggregation' => 'average',
            ],
            'position' => 2,
            'is_visible' => true,
        ]);

        /** @var CrossBoardService $crossBoardService */
        $crossBoardService = app(CrossBoardService::class);
        $resolved = $crossBoardService->resolveMirrorsForBoard(
            $this->boardA,
            collect([$this->taskA1]),
            $this->manager
        );

        $this->assertArrayHasKey($this->taskA1->id, $resolved);
        $taskMirrors = $resolved[$this->taskA1->id];

        // Status of first item (B1) is Quality Review
        $this->assertEquals('Quality Review', $taskMirrors['col_mirror_status']);

        // Average progress between 80% (B1) and 100% (B2) = 90.0%
        $this->assertEquals(90.0, $taskMirrors['col_mirror_avg_prog']);
    }

    public function test_cross_board_automation_updates_target_connected_item(): void
    {
        BoardItemRelationship::create([
            'source_board_id' => $this->boardA->id,
            'source_task_id' => $this->taskA1->id,
            'target_board_id' => $this->boardB->id,
            'target_task_id' => $this->taskB1->id,
            'column_key' => 'connected_boards',
            'relation_type' => 'one_way',
            'created_by' => $this->manager->id,
        ]);

        $automationEngine = app(\App\Services\AutomationEngineService::class);

        // Create automation on Board A: when status changes, execute cross_board_update on connected tasks
        $auto = \App\Models\BoardAutomation::create([
            'board_id' => $this->boardA->id,
            'name' => 'Sync Priority to Connected Tasks',
            'trigger_type' => 'status_changed',
            'trigger_config' => [],
            'conditions' => [],
            'actions' => [
                [
                    'type' => 'cross_board_update',
                    'column_key' => 'connected_boards',
                    'target_field' => 'priority',
                    'target_value' => 'Urgent',
                ],
            ],
            'is_active' => true,
            'created_by' => $this->manager->id,
        ]);

        $result = $automationEngine->evaluateAndExecute($auto, $this->taskA1, [], $this->manager);
        $this->assertEquals('success', $result['status']);

        $this->taskB1->refresh();
        $this->assertEquals('Urgent', $this->taskB1->priority);
    }

    public function test_cross_department_entity_linking(): void
    {
        $this->actingAs($this->manager);

        $response = $this->post(route('cross-dept.links.store'), [
            'source_entity_type' => 'MarketingCampaign',
            'source_entity_id' => 42,
            'target_entity_type' => 'KanbanTask',
            'target_entity_id' => $this->taskA1->id,
            'relationship_name' => 'campaign_creative_asset',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('cross_department_links', [
            'source_entity_type' => 'MarketingCampaign',
            'source_entity_id' => 42,
            'target_entity_type' => 'KanbanTask',
            'target_entity_id' => $this->taskA1->id,
            'relationship_name' => 'campaign_creative_asset',
        ]);
    }
}
