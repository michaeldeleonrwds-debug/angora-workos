<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\MarketingCampaign;
use App\Models\MarketingContent;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MarketingController extends Controller
{
    public function index(Request $request)
    {
        $campaigns = MarketingCampaign::with('contents')->latest()->get();
        $contents = MarketingContent::with(['campaign', 'author'])->latest()->get();
        $team = User::whereIn('role', ['super_admin', 'marketing_staff', 'admin_manager'])->get();

        return Inertia::render('marketing/index', [
            'campaigns' => $campaigns,
            'contents' => $contents,
            'team' => $team,
        ]);
    }

    public function storeCampaign(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'channel' => 'required|string',
            'budget' => 'required|numeric|min:0',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'target_audience' => 'nullable|string',
        ]);

        $campaign = MarketingCampaign::create([
            ...$validated,
            'spend' => 0,
            'status' => 'Planning',
        ]);

        AuditLog::log(
            action: 'MARKETING_CAMPAIGN_LAUNCHED',
            department: 'Marketing',
            entityType: 'MarketingCampaign',
            entityId: $campaign->id,
            description: "New Campaign created: {$campaign->name} (Budget: \${$campaign->budget})"
        );

        return back()->with('success', 'Campaign initialized');
    }

    public function storeContent(Request $request)
    {
        $validated = $request->validate([
            'campaign_id' => 'nullable|exists:marketing_campaigns,id',
            'title' => 'required|string',
            'format' => 'required|string',
            'platform' => 'required|string',
            'scheduled_date' => 'nullable|date',
            'copy_notes' => 'nullable|string',
        ]);

        $content = MarketingContent::create([
            ...$validated,
            'author_id' => auth()->id(),
            'status' => 'Idea',
        ]);

        return back()->with('success', 'Content item added to calendar');
    }
}
