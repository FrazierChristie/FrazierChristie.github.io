// js/app.js — Application entry point
// Thin orchestrator: initialises DB, auth, pages, and binds global actions

import { openDB } from './db.js';
import { handleAuth, redirectToStrava, isStravaConnected } from './auth.js';
import { initNavigation, showLoading, hideLoading, showToast } from './ui.js';
import { syncStravaActivities } from './services/syncService.js';

// Page modules
import { initDashboard } from './pages/dashboard.js';
import { initLogPage, switchLogTab, removeExercise, addSet, addWarmupSet, removeSet, updateSet, startRestTimer, dismissRestTimer, saveStrength, saveCardio, loadTemplate } from './pages/log.js';
import { initPlanPage, generatePlan } from './pages/plan.js';
import { initAnalyticsPage, switchAnalyticsTab } from './pages/analytics.js';
import { initHistoryPage, filterHistory, deleteWorkoutConfirm } from './pages/history.js';
import { initHealthPage, saveHealthData, importHealthData } from './pages/health.js';
import { initSettingsPage, saveProfile, exportData, importData, clearAllData, disconnectStrava, saveApiKey } from './pages/settings.js';
import { initGearPage, addGear, deleteGear } from './pages/gear.js';

// --- Global API exposed on window.fitcoach for onclick handlers ---
window.fitcoach = {
    // Log page
    switchLogTab,
    removeExercise,
    addSet,
    addWarmupSet,
    removeSet,
    updateSet,
    startRestTimer,
    dismissRestTimer,
    saveStrengthWorkout: saveStrength,
    saveCardioWorkout: saveCardio,
    loadTemplate,
    // Plan page
    generatePlan,
    // Analytics page
    switchAnalyticsTab,
    // History page
    filterHistory,
    deleteWorkoutConfirm,
    // Health page
    saveHealthData,
    importHealthData,
    // Settings page
    saveProfile,
    exportData,
    importData,
    clearAllData,
    disconnectStrava,
    saveApiKey,
    // Gear page
    addGear,
    deleteGear
};

// --- Initialisation ---
async function init() {
    try {
        // Open IndexedDB
        await openDB();

        // Check auth state
        const isAuthenticated = await handleAuth();

        if (isAuthenticated || localStorage.getItem('fitcoach_skipped_login')) {
            showApp();
        } else {
            showLogin();
        }
    } catch (e) {
        console.error('Init failed:', e);
        showToast('Failed to initialise app: ' + e.message, 'error');
    }
}

function showLogin() {
    document.getElementById('login-section')?.classList.remove('hidden');
    document.getElementById('app-section')?.classList.add('hidden');

    document.getElementById('btn-strava-connect')?.addEventListener('click', () => {
        redirectToStrava();
    });

    document.getElementById('btn-skip-login')?.addEventListener('click', () => {
        localStorage.setItem('fitcoach_skipped_login', 'true');
        showApp();
    });
}

function showApp() {
    document.getElementById('login-section')?.classList.add('hidden');
    document.getElementById('app-section')?.classList.remove('hidden');

    // Register all page modules
    initDashboard();
    initLogPage();
    initPlanPage();
    initAnalyticsPage();
    initHistoryPage();
    initHealthPage();
    initSettingsPage();
    initGearPage();

    // Start navigation (reads hash, triggers first page load)
    initNavigation();

    // Sync button
    document.getElementById('btn-sync')?.addEventListener('click', handleSync);

    // Auto-sync if Strava connected
    if (isStravaConnected()) {
        syncStravaActivities().catch(e => console.warn('Background sync failed:', e));
    }
}

async function handleSync() {
    if (!isStravaConnected()) {
        showToast('Connect Strava first in Settings', 'info');
        return;
    }

    showLoading('Syncing with Strava...');
    try {
        const result = await syncStravaActivities(true);
        hideLoading();
        showToast(result.message, 'success');
    } catch (e) {
        hideLoading();
        showToast('Sync failed: ' + e.message, 'error');
    }
}

// Boot
init();
