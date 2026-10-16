<?php

use App\Http\Controllers\MediaController;
use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SettingsCenterController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    // 1. Settings Center Landing / Overview
    Route::get('settings', [SettingsCenterController::class, 'index'])->name('settings.index');

    // 2. Personal Settings
    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('settings/profile/avatar', [ProfileController::class, 'updateAvatar'])->name('profile.avatar.update');
    Route::delete('settings/profile/avatar', [ProfileController::class, 'destroyAvatar'])->name('profile.avatar.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', [PasswordController::class, 'update'])->name('password.update');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');

    Route::get('settings/notifications', [SettingsCenterController::class, 'notifications'])->name('settings.notifications');
    Route::put('settings/notifications', [SettingsCenterController::class, 'updateNotifications'])->name('settings.notifications.update');

    // 3. Workspace Settings
    Route::get('settings/workspace', [SettingsCenterController::class, 'workspace'])->name('settings.workspace');
    Route::patch('settings/workspace', [SettingsCenterController::class, 'updateWorkspace'])->name('settings.workspace.update');
    Route::get('settings/branding', [SettingsCenterController::class, 'branding'])->name('settings.branding');
    Route::patch('settings/branding', [SettingsCenterController::class, 'updateBranding'])->name('settings.branding.update');

    // 4. System Settings (Protected by manage-system-settings gate)
    Route::middleware('can:manage-system-settings')->group(function () {
        Route::get('settings/system/smtp', [SettingsCenterController::class, 'smtp'])->name('settings.system.smtp');
        Route::post('settings/system/smtp', [SettingsCenterController::class, 'updateSmtp'])->name('settings.system.smtp.update');
        Route::post('settings/system/smtp/test', [SettingsCenterController::class, 'testSmtp'])->name('settings.system.smtp.test');

        Route::get('settings/system/storage', [SettingsCenterController::class, 'storage'])->name('settings.system.storage');
        Route::post('settings/system/storage', [SettingsCenterController::class, 'updateStorage'])->name('settings.system.storage.update');
        Route::post('settings/system/storage/test', [SettingsCenterController::class, 'testStorage'])->name('settings.system.storage.test');

        Route::get('settings/system/reverb', [SettingsCenterController::class, 'reverb'])->name('settings.system.reverb');
        Route::post('settings/system/reverb/test', [SettingsCenterController::class, 'testReverb'])->name('settings.system.reverb.test');

        Route::get('settings/system/optimization', [SettingsCenterController::class, 'optimization'])->name('settings.system.optimization');
        Route::post('settings/system/optimization', [SettingsCenterController::class, 'updateOptimization'])->name('settings.system.optimization.update');

        Route::get('settings/system/queues', [SettingsCenterController::class, 'queues'])->name('settings.system.queues');
        Route::post('settings/system/queues/retry-failed', [SettingsCenterController::class, 'retryFailedJobs'])->name('settings.system.queues.retry');
        Route::post('settings/system/queues/clear-failed', [SettingsCenterController::class, 'clearFailedJobs'])->name('settings.system.queues.clear');

        Route::get('settings/system/health', [SettingsCenterController::class, 'health'])->name('settings.system.health');
    });

    // 5. Data & Security Shortcuts / Policies
    Route::get('settings/data/security', [SettingsCenterController::class, 'security'])->name('settings.data.security');
    Route::patch('settings/data/security', [SettingsCenterController::class, 'updateSecurity'])->name('settings.data.security.update');
    Route::get('settings/data/files', [MediaController::class, 'index'])->name('settings.data.files');
    Route::get('settings/data/audit-logs', fn () => redirect()->route('audit-logs.index'))->name('settings.data.audit-logs');
    Route::get('settings/data/integrations', fn () => redirect()->route('integrations.index'))->name('settings.data.integrations');
});
