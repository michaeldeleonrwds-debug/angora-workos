<?php

namespace App\Console\Commands;

use App\Services\TaskRecurrenceService;
use Illuminate\Console\Command;

class ProcessRecurringTasksCommand extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'tasks:process-recurring {--force : Force generation regardless of scheduled timestamp}';

    /**
     * The console command description.
     */
    protected $description = 'Process due recurring task rules and spawn next task instances';

    /**
     * Execute the console command.
     */
    public function handle(TaskRecurrenceService $recurrenceService): int
    {
        $this->info('Checking for due recurring tasks...');

        $count = $recurrenceService->processDueRules();

        $this->info("Recurring tasks processed successfully. Spawned instances: {$count}");

        return Command::SUCCESS;
    }
}
