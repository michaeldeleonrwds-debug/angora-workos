<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class OpenApiDocumentationController extends Controller
{
    /**
     * Return OpenAPI 3.0 specification in JSON format
     */
    public function spec(): JsonResponse
    {
        $spec = [
            'openapi' => '3.0.0',
            'info' => [
                'title' => 'Angora Work OS REST API',
                'version' => '1.0.0',
                'description' => 'Official REST API for Angora Work OS. Provides programmatic access to workspaces, boards, tasks, agency projects, webhooks, and automations.',
                'contact' => [
                    'name' => 'Angora Enterprise Support',
                    'email' => 'api-support@angora.work',
                ],
            ],
            'servers' => [
                ['url' => url('/api/v1'), 'description' => 'Current Environment Server'],
            ],
            'components' => [
                'securitySchemes' => [
                    'BearerAuth' => [
                        'type' => 'http',
                        'scheme' => 'bearer',
                        'bearerFormat' => 'Angora Personal Access Token (angora_...)',
                    ],
                ],
            ],
            'security' => [
                ['BearerAuth' => []],
            ],
            'paths' => [
                '/workspaces' => [
                    'get' => [
                        'summary' => 'List workspaces',
                        'responses' => ['200' => ['description' => 'Successful workspace list']],
                    ],
                ],
                '/boards' => [
                    'get' => [
                        'summary' => 'List kanban boards',
                        'responses' => ['200' => ['description' => 'Successful boards list']],
                    ],
                ],
                '/tasks' => [
                    'get' => [
                        'summary' => 'List tasks with filtering and pagination',
                        'parameters' => [
                            ['name' => 'board_id', 'in' => 'query', 'schema' => ['type' => 'integer']],
                            ['name' => 'priority', 'in' => 'query', 'schema' => ['type' => 'string']],
                            ['name' => 'search', 'in' => 'query', 'schema' => ['type' => 'string']],
                            ['name' => 'page', 'in' => 'query', 'schema' => ['type' => 'integer']],
                        ],
                        'responses' => ['200' => ['description' => 'Paginated task list']],
                    ],
                    'post' => [
                        'summary' => 'Create a new task',
                        'requestBody' => [
                            'required' => true,
                            'content' => [
                                'application/json' => [
                                    'schema' => [
                                        'type' => 'object',
                                        'required' => ['board_id', 'title'],
                                        'properties' => [
                                            'board_id' => ['type' => 'integer'],
                                            'title' => ['type' => 'string'],
                                            'description' => ['type' => 'string'],
                                            'priority' => ['type' => 'string', 'enum' => ['low', 'medium', 'high', 'urgent']],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                        'responses' => ['201' => ['description' => 'Task created']],
                    ],
                ],
                '/tasks/{id}' => [
                    'get' => ['summary' => 'Get task details'],
                    'patch' => ['summary' => 'Update task attributes'],
                    'delete' => ['summary' => 'Delete task'],
                ],
                '/projects' => [
                    'get' => ['summary' => 'List agency projects and client status'],
                ],
                '/webhooks/incoming/{service}' => [
                    'post' => [
                        'summary' => 'Inbound webhook receiver',
                        'security' => [],
                    ],
                ],
            ],
        ];

        return response()->json($spec);
    }
}
