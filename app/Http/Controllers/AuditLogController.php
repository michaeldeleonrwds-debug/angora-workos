<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $query = AuditLog::with('user')->latest();

        if ($request->filled('department') && $request->department !== 'All') {
            $query->where('department', $request->department);
        }

        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('action', 'like', "%{$request->search}%")
                    ->orWhere('description', 'like', "%{$request->search}%");
            });
        }

        $logs = $query->paginate(30)->withQueryString();
        $departments = AuditLog::distinct()->pluck('department')->filter()->values();

        return Inertia::render('audit/index', [
            'logs' => $logs,
            'departments' => $departments,
            'filters' => $request->only(['department', 'search']),
        ]);
    }
}
