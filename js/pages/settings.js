// js/pages/settings.js — Settings & data management page logic
import { registerPage, showToast, showModal } from '../ui.js';
import { dbGet, dbPut, dbClear, exportAllData, importAllData } from '../db.js';
import { isStravaConnected, logout } from '../auth.js';
import { getApiKey, setApiKey } from '../services/llmService.js';

export function initSettingsPage() {
    registerPage('settings', loadSettingsPage);
}

async function loadSettingsPage() {
    await loadProfile();
    loadStravaStatus();
    loadApiKey();
}

function loadApiKey() {
    const el = document.getElementById('settings-api-key');
    const key = getApiKey();
    if (el && key) el.value = key;
}

export function saveApiKey() {
    const key = document.getElementById('settings-api-key')?.value || '';
    setApiKey(key);
    showToast(key ? 'API key saved' : 'API key removed', 'success');
}

async function loadProfile() {
    try {
        const profile = await dbGet('profile', 'user');
        if (!profile) return;

        const fields = { 'settings-name': 'name', 'settings-age': 'age', 'settings-weight': 'weight', 'settings-height': 'height', 'settings-level': 'experienceLevel' };
        for (const [elId, key] of Object.entries(fields)) {
            const el = document.getElementById(elId);
            if (el && profile[key]) el.value = profile[key];
        }
    } catch (e) {
        console.warn('Failed to load profile:', e);
    }
}

function loadStravaStatus() {
    const container = document.getElementById('strava-status');
    if (!container) return;

    if (isStravaConnected()) {
        const athleteRaw = localStorage.getItem('strava_athlete_data');
        const athlete = athleteRaw ? JSON.parse(athleteRaw) : null;
        const name = athlete ? `${athlete.firstname} ${athlete.lastname}` : 'Connected';

        container.innerHTML = `
            <p class="text-success">Connected: ${name}</p>
            <button class="btn btn-secondary btn-sm" onclick="window.fitcoach.disconnectStrava()">Disconnect</button>`;
    } else {
        container.innerHTML = '<p class="text-muted">Not connected</p>';
    }
}

export async function saveProfile() {
    try {
        const profile = {
            id: 'user',
            name: document.getElementById('settings-name')?.value || '',
            age: parseInt(document.getElementById('settings-age')?.value) || null,
            weight: parseFloat(document.getElementById('settings-weight')?.value) || null,
            height: parseInt(document.getElementById('settings-height')?.value) || null,
            experienceLevel: document.getElementById('settings-level')?.value || 'intermediate',
            updatedAt: new Date().toISOString()
        };
        await dbPut('profile', profile);
        showToast('Profile saved', 'success');
    } catch (e) {
        showToast('Failed to save profile: ' + e.message, 'error');
    }
}

export async function exportData() {
    try {
        const data = await exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fitcoach-backup-${new Date().toISOString().substring(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported', 'success');
    } catch (e) {
        showToast('Export failed: ' + e.message, 'error');
    }
}

export async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);
        await importAllData(data);
        showToast('Data imported successfully. Reload for full effect.', 'success');
    } catch (e) {
        showToast('Import failed: ' + e.message, 'error');
    }

    event.target.value = '';
}

export function clearAllData() {
    showModal('Clear All Data', '<p>This will permanently delete all your workouts, plans, and settings. This cannot be undone.</p>', [
        {
            label: 'Delete Everything',
            class: 'btn-danger',
            onClick: async () => {
                const stores = ['profile', 'goals', 'trainingPlans', 'plannedWorkouts', 'completedWorkouts', 'exerciseSets', 'exercises', 'gear', 'bodyMetrics', 'healthMetrics', 'fitnessScores', 'stravaActivities'];
                for (const store of stores) {
                    await dbClear(store);
                }
                localStorage.clear();
                showToast('All data cleared', 'info');
                window.location.reload();
            }
        },
        { label: 'Cancel', onClick: () => {} }
    ]);
}

export async function disconnectStrava() {
    showModal('Disconnect Strava', '<p>This will remove your Strava connection. Your synced workout data will remain.</p>', [
        {
            label: 'Disconnect',
            class: 'btn-danger',
            onClick: async () => {
                await logout();
            }
        },
        { label: 'Cancel', onClick: () => {} }
    ]);
}
