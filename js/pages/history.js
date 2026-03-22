// js/pages/history.js — Workout history page logic
import { registerPage, showModal, showToast } from '../ui.js';
import { getAllWorkouts, getWorkoutsByDateRange, deleteWorkout } from '../services/workoutService.js';
import { formatDate, formatDuration, formatDateISO } from '../utils.js';

let allWorkouts = [];

export function initHistoryPage() {
    registerPage('history', loadHistoryPage);
}

async function loadHistoryPage() {
    allWorkouts = await getAllWorkouts();
    renderHistory(allWorkouts);
}

function renderHistory(workouts) {
    const container = document.getElementById('history-list');
    if (!container) return;

    if (workouts.length === 0) {
        container.innerHTML = '<p class="text-muted">No workouts recorded yet.</p>';
        return;
    }

    container.innerHTML = workouts.map(w => {
        let detail = '';
        if (w.type === 'strength' && w.sets) {
            const exercises = [...new Set(w.sets.map(s => s.exerciseName))];
            const totalVolume = w.sets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);
            detail = `<p class="history-detail">${exercises.join(', ')}</p>
                <p class="history-stats">${w.sets.length} sets · ${Math.round(totalVolume).toLocaleString()}kg volume</p>`;
        } else if (w.type === 'cardio') {
            const dist = w.distance ? (w.distance / 1000).toFixed(2) + 'km' : '';
            const dur = w.duration ? formatDuration(w.duration) : '';
            detail = `<p class="history-detail">${w.activityType || 'Cardio'}</p>
                <p class="history-stats">${[dist, dur].filter(Boolean).join(' · ')}</p>`;
        }

        return `<div class="card history-card" data-id="${w.id}">
            <div class="history-header">
                <div>
                    <span class="workout-type-badge ${w.type}">${w.type}</span>
                    <span class="history-date">${formatDate(w.date)}</span>
                </div>
                <div class="history-actions">
                    <span class="rpe-badge">RPE ${w.overallRPE || '-'}</span>
                    <button class="btn-icon btn-danger-text" onclick="window.fitcoach.deleteWorkoutConfirm('${w.id}')" title="Delete">&times;</button>
                </div>
            </div>
            ${detail}
            ${w.notes ? `<p class="history-notes">${w.notes}</p>` : ''}
            ${w.source === 'strava' ? '<span class="source-badge strava">Strava</span>' : ''}
        </div>`;
    }).join('');
}

export function filterHistory() {
    const typeFilter = document.getElementById('history-type-filter')?.value || 'all';
    const dateFrom = document.getElementById('history-date-from')?.value || '';
    const dateTo = document.getElementById('history-date-to')?.value || '';

    let filtered = allWorkouts;

    if (typeFilter !== 'all') {
        filtered = filtered.filter(w => w.type === typeFilter);
    }
    if (dateFrom) {
        filtered = filtered.filter(w => w.date >= dateFrom);
    }
    if (dateTo) {
        filtered = filtered.filter(w => w.date <= dateTo);
    }

    renderHistory(filtered);
}

export function deleteWorkoutConfirm(id) {
    showModal('Delete Workout', '<p>Are you sure you want to delete this workout? This cannot be undone.</p>', [
        {
            label: 'Delete',
            class: 'btn-danger',
            onClick: async () => {
                await deleteWorkout(id);
                showToast('Workout deleted', 'info');
                allWorkouts = allWorkouts.filter(w => w.id !== id);
                renderHistory(allWorkouts);
            }
        },
        { label: 'Cancel', onClick: () => {} }
    ]);
}
