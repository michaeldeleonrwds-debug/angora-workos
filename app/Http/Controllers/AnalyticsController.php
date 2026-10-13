<?php

namespace App\Http\Controllers;

use App\Models\FinanceBudget;
use App\Models\HrEmployee;
use App\Models\KanbanTask;
use App\Models\MarketingCampaign;
use App\Models\ProductionQualityCheck;
use App\Models\ProductionWorkOrder;
use App\Models\SalesInvoice;
use App\Models\SalesLead;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AnalyticsController extends Controller
{
    public function index(Request $request)
    {
        $kpis = [
            'totalRevenue' => (float) SalesInvoice::where('status', 'Paid')->sum('total_amount'),
            'pipelineTotal' => (float) SalesLead::whereNotIn('stage', ['Closed Lost'])->sum('deal_value'),
            'productionVolume' => (int) ProductionWorkOrder::sum('completed_quantity'),
            'qaPassRate' => ProductionQualityCheck::count() > 0
                ? round((ProductionQualityCheck::where('status', 'Passed')->count() / ProductionQualityCheck::count()) * 100, 1)
                : 100,
            'totalHeadcount' => HrEmployee::where('status', 'Active')->count(),
            'totalCampaignReach' => (int) MarketingCampaign::sum('impressions'),
            'marketingSpend' => (float) MarketingCampaign::sum('spend'),
            'budgetUtilization' => FinanceBudget::sum('allocated_amount') > 0
                ? round((FinanceBudget::sum('spent_amount') / FinanceBudget::sum('allocated_amount')) * 100, 1)
                : 0,
            'taskCompletionRate' => KanbanTask::count() > 0
                ? round((KanbanTask::whereNotNull('completed_at')->count() / KanbanTask::count()) * 100, 1)
                : 0,
        ];

        $departmentHeadcounts = HrEmployee::selectRaw('department, count(*) as count')
            ->groupBy('department')
            ->get();

        $budgetDistribution = FinanceBudget::select('department', 'allocated_amount', 'spent_amount')->get();

        $monthlySales = [
            ['month' => 'May', 'sales' => 52000, 'target' => 45000],
            ['month' => 'Jun', 'sales' => 61000, 'target' => 50000],
            ['month' => 'Jul', 'sales' => 74000, 'target' => 60000],
            ['month' => 'Aug', 'sales' => 68000, 'target' => 65000],
            ['month' => 'Sep', 'sales' => 95040, 'target' => 80000],
            ['month' => 'Oct (MTD)', 'sales' => 88000, 'target' => 85000],
        ];

        return Inertia::render('analytics/index', [
            'kpis' => $kpis,
            'departmentHeadcounts' => $departmentHeadcounts,
            'budgetDistribution' => $budgetDistribution,
            'monthlySales' => $monthlySales,
        ]);
    }
}
