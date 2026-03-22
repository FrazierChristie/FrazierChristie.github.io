// js/pages/dashboard.js — Dashboard page logic
import { registerPage } from '../ui.js';
import { getWeeklyStats, getAllWorkouts } from '../services/workoutService.js';
import { loadFitnessScores, calculateFitnessScores } from '../engines/fitnessScores.js';
import { getTodaysWorkout, getActivePlan } from '../engines/coachEngine.js';
import { getCoachInsights } from '../engines/adaptiveEngine.js';
import { renderFitnessChart, renderWeeklyLoadChart } from '../components/charts.js';
import { formatDateISO, addDays, getMonday } from '../utils.js';

export function initDashboard() {
    registerPage('dashboard', loadDashboard);
}

async function loadDashboard() {
    await Promise.all([
        loadWeeklyStats(),
        loadCoachInsights(),
        loadTodaysWorkout(),
        loadFitnessCharts()
    ]);
}

async function loadWeeklyStats() {
    try {
        const stats = await getWeeklyStats();
        const sessionsEl = document.getElementById('stat-week-sessions');
        const volumeEl = document.getElementById('stat-week-volume');
        const distanceEl = document.getElementById('stat-week-distance');

        if (sessionsEl) sessionsEl.textContent = stats.sessions;
        if (volumeEl) volumeEl.textContent = stats.totalVolume.toLocaleString();
        if (distanceEl) distanceEl.textContent = stats.totalDistance.toFixed(1);
    } catch (e) {
        console.warn('Failed to load weekly stats:', e);
    }
}

async function loadCoachInsights() {
    try {
        const insights = await getCoachInsights();
        const container = document.getElementById('insights-list');
        if (!container) return;

        if (insights.length === 0) {
            container.innerHTML = '<p class="text-muted">Log a few workouts to unlock coaching insights.</p>';
            return;
        }

        container.innerHTML = insights.map(i =>
            `<div class="insight-item insight-${i.type}">
                <span class="insight-icon">${i.icon}</span>
                <span class="insight-text">${i.message}</span>
            </div>`
        ).join('');
    } catch (e) {
        console.warn('Failed to load insights:', e);
    }
}

async function loadTodaysWorkout() {
    try {
        const workout = await getTodaysWorkout();
        const container = document.getElementById('today-workout-content');
        if (!container) return;

        if (!workout) {
            container.innerHTML = '<p class="text-muted">No session planned for today</p>';
            return;
        }

        let html = `<div class="today-workout">
            <div class="workout-type-badge ${workout.type}">${workout.type === 'strength' ? 'Strength' : 'Cardio'}</div>
            <h4>${workout.description}</h4>`;

        if (workout.exercises) {
            html += '<ul class="exercise-preview">';
            workout.exercises.forEach(ex => {
                html += `<li>${ex.name} — ${ex.targetSets} x ${ex.targetReps} @ RPE ${ex.targetRPE}</li>`;
            });
            html += '</ul>';
        }

        if (workout.cardioTarget) {
            const ct = workout.cardioTarget;
            html += `<p>${ct.type}: ${ct.distance}km — ${ct.description}</p>`;
        }

        html += `<button class="btn btn-primary btn-sm" onclick="location.hash='log'">Start Session</button>`;
        html += '</div>';

        container.innerHTML = html;
    } catch (e) {
        console.warn('Failed to load today\'s workout:', e);
    }
}

async function loadFitnessCharts() {
    try {
        const workouts = await getAllWorkouts();
        if (workouts.length === 0) return;

        const endDate = new Date();
        const startDate = addDays(endDate, -90);
        const scores = await calculateFitnessScores(workouts, formatDateISO(startDate), formatDateISO(endDate));

        renderFitnessChart('chart-fitness', scores);

        // Build weekly load data
        const weeklyData = buildWeeklyLoadData(workouts);
        renderWeeklyLoadChart('chart-weekly-load', weeklyData);
    } catch (e) {
        console.warn('Failed to load fitness charts:', e);
    }
}

function buildWeeklyLoadData(workouts) {
    const weeks = {};
    const allLoads = [];

    workouts.forEach(w => {
        const monday = formatDateISO(getMonday(new Date(w.date)));
        if (!weeks[monday]) weeks[monday] = { label: monday.substring(5), load: 0 };
        weeks[monday].load += w.trainingLoad || 0;
    });

    const sorted = Object.values(weeks).sort((a, b) => a.label.localeCompare(b.label));
    const avgLoad = sorted.length > 0 ? sorted.reduce((sum, w) => sum + w.load, 0) / sorted.length : 0;
    sorted.forEach(w => w.avg = avgLoad);

    return sorted;
}
