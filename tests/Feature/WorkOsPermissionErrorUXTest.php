<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\KanbanBoard;
use App\Models\KanbanColumn;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * Global permission error UX: branded 403/422 pages for full-page navigation,
 * safe JSON payloads for async requests, and unchanged backend authorization.
 */
class WorkOsPermissionErrorUXTest extends TestCase
{
    use RefreshDatabase;

    private const DENIED_MESSAGE = "You don't have permission to perform this action.";

    private User $owner;
    private User $pm;
    private User $designer;
    private Workspace $workspace;
    private KanbanBoard $board;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create(['role' => 'admin', 'email' => 'perm-ux-owner@angora.test']);
        $this->pm = User::factory()->create(['role' => 'project_manager', 'email' => 'perm-ux-pm@angora.test']);
        $this->designer = User::factory()->create(['role' => 'dept_user', 'email' => 'perm-ux-designer@angora.test']);

        $this->workspace = Workspace::create([
            'name' => 'Permission UX Workspace',
            'slug' => 'permission-ux-workspace',
            'owner_id' => $this->owner->id,
            'status' => 'active',
        ]);
        $this->workspace->members()->create(['user_id' => $this->pm->id, 'role' => 'admin']);
        $this->workspace->members()->create(['user_id' => $this->designer->id, 'role' => 'member']);

        $this->board = KanbanBoard::create([
            'workspace_id' => $this->workspace->id,
            'title' => 'Permission UX Board',
            'created_by' => $this->owner->id,
        ]);
        foreach (['New Task', 'Processing', 'Done'] as $position => $title) {
            KanbanColumn::create([
                'board_id' => $this->board->id,
                'title' => $title,
                'position' => $position,
                'color' => '#888888',
            ]);
        }
    }

    private function inertiaVersion(): string
    {
        return app(HandleInertiaRequests::class)->version(Request::create('/rbac', 'GET'));
    }

    private function inertiaHeaders(): array
    {
        return [
            'X-Inertia' => 'true',
            'X-Inertia-Version' => $this->inertiaVersion(),
            'X-Requested-With' => 'XMLHttpRequest',
        ];
    }

    // ------------------------------------------------------------------
    // Full-page unauthorized navigation → branded Angora 403 page
    // ------------------------------------------------------------------

    public function test_full_page_browser_denial_renders_branded_403_page(): void
    {
        $response = $this->actingAs($this->designer)->get('/rbac');

        $response->assertStatus(403);
        $this->assertStringContainsString('errors\/403', $response->getContent());
        $this->assertStringContainsString('data-page=', $response->getContent());
    }

    public function test_policy_denial_full_page_renders_branded_403_page(): void
    {
        $response = $this->actingAs($this->designer)->get(route('kanban.boards.workflow.get', $this->board));

        $response->assertStatus(403);
        $this->assertStringContainsString('errors\/403', $response->getContent());
        $this->assertStringContainsString('data-page=', $response->getContent());
    }

    public function test_inertia_navigation_denial_returns_branded_inertia_response(): void
    {
        $response = $this->actingAs($this->designer)
            ->withHeaders($this->inertiaHeaders())
            ->get('/rbac');

        $response->assertStatus(403);
        $response->assertHeader('X-Inertia', 'true');
        $response->assertJsonPath('component', 'errors/403');
        $response->assertJsonPath('props.title', 'Action Not Permitted');
        $response->assertJsonPath('props.message', self::DENIED_MESSAGE);
        $response->assertJsonPath('props.status', 403);
    }

    // ------------------------------------------------------------------
    // Async denials → safe JSON, no Inertia page swap
    // ------------------------------------------------------------------

    public function test_json_denial_returns_standard_error_payload(): void
    {
        $this->actingAs($this->designer)
            ->getJson('/rbac')
            ->assertStatus(403)
            ->assertJson([
                'message' => self::DENIED_MESSAGE,
                'code' => 'permission_denied',
            ]);
    }

    public function test_inertia_mutation_denial_returns_json_without_page_response(): void
    {
        $response = $this->actingAs($this->designer)->withHeaders($this->inertiaHeaders())->patch(
            route('kanban.boards.workflow.transitions.update', $this->board),
            ['transitions' => []],
        );

        $response->assertStatus(403)->assertJson([
            'message' => self::DENIED_MESSAGE,
            'code' => 'permission_denied',
        ]);
        $this->assertFalse(
            $response->headers->has('X-Inertia'),
            'Denied Inertia mutations must not look like Inertia page responses.',
        );
    }

    public function test_inertia_partial_reload_denial_returns_json(): void
    {
        $response = $this->actingAs($this->designer)->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => $this->inertiaVersion(),
            'X-Requested-With' => 'XMLHttpRequest',
            'X-Inertia-Partial-Data' => 'sidebar',
        ])->get('/rbac');

        $response->assertStatus(403)->assertJson([
            'message' => self::DENIED_MESSAGE,
            'code' => 'permission_denied',
        ]);
        $this->assertFalse($response->headers->has('X-Inertia'));
    }

    public function test_policy_mutation_denial_returns_standard_json(): void
    {
        $this->actingAs($this->designer)
            ->patchJson(route('kanban.boards.workflow.transitions.update', $this->board), ['transitions' => []])
            ->assertStatus(403)
            ->assertJson([
                'message' => self::DENIED_MESSAGE,
                'code' => 'permission_denied',
            ]);
    }

    // ------------------------------------------------------------------
    // 422 workflow rejections → safe human-readable message
    // ------------------------------------------------------------------

    public function test_workflow_422_returns_safe_human_readable_message(): void
    {
        $done = KanbanColumn::where('board_id', $this->board->id)->where('title', 'Done')->firstOrFail();
        $processing = KanbanColumn::where('board_id', $this->board->id)->where('title', 'Processing')->firstOrFail();

        $this->actingAs($this->pm)
            ->patchJson(route('kanban.boards.workflow.transitions.update', $this->board), [
                'transitions' => [[
                    'from_column_id' => $processing->id,
                    'to_column_id' => $done->id,
                    'contributor_allowed' => true,
                ]],
            ])
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Contributors cannot be allowed into completed or cancelled stages.',
                'code' => 'action_not_allowed',
            ]);
    }

    // ------------------------------------------------------------------
    // Backend authorization intact
    // ------------------------------------------------------------------

    public function test_regular_validation_errors_keep_laravel_shape(): void
    {
        $this->actingAs($this->pm)
            ->patchJson(route('kanban.boards.workflow.transitions.update', $this->board), [
                'transitions' => 'invalid',
            ])
            ->assertStatus(422)
            ->assertJsonStructure(['message', 'errors'])
            ->assertJsonMissingPath('code');
    }

    public function test_allowed_pm_workflow_mutation_still_succeeds(): void
    {
        $this->actingAs($this->pm)
            ->patchJson(route('kanban.boards.workflow.transitions.update', $this->board), [
                'transitions' => [],
            ])
            ->assertOk()
            ->assertJson(['success' => true]);
    }
}
