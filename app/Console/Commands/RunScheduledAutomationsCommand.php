<?php

namespace App\Console\Commands;

use App\Services\AutomationEngineService;
use Illuminate\Console\Command;

class RunScheduledAutomationsCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'automations:run-scheduled';

    /**
     * The console command description.
     */
    protected $description = 'Execute scheduled, recurring, and overdue board automations';

    /**
     * Execute the console command.
     */
    public function handle(AutomationEngineService $engine): int
    {
        $this->info('Starting scheduled automations check...');
        $count = $engine->runScheduledAutomations();
        $this->info("Successfully evaluated scheduled automations. Processed operations: {$count}");

        return Command::SUCCESS;
    }
}
