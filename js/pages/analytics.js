// js/pages/analytics.js — Analytics page logic
import { registerPage } from '../ui.js';
import { getExerciseHistory, getMuscleGroupVolume, getPRBoard, getWorkoutsByDateRange } from '../services/workoutService.js';
import { renderE1RMChart, renderVolumeChart, renderMuscleBalanceChart, renderPaceChart, renderDistanceChart, renderWeightChart, renderHealthTrendsChart, renderReadinessChart } from '../components/charts.js';
import { dbGetAll } from '../db.js';
import { estimate1RM, formatDateISO, addDays, getMonday, formatDate } from '../utils.js';
import { EXERCISES } from '../../data/exercises.js';

export function initAnalyticsPage() {
    registerPage('analytics', loadAnalyticsPage);
}

async function loadAnalyticsPage() {
    populateExerciseSelect();
    await Promise.all([
        loadStrengthAnalytics(),
        loadCardioAnalytics(),
        loadBodyAnalytics()
    ]);
}

function populateExerciseSelect() {
    const select = document.getElementById('e1rm-exercise-select');
    if (!select) return;

    // Keep existing options if already populated
    if (select.options.length > 1) return;

    const compounds = ['squat', 'bench-press', 'deadlift', 'ohp', 'barbell-row', 'rdl'];
    const compoundExercises = compounds.map(id => EXERCISES.find(e => e.id === id)).filter(Boolean);
    const others = EXERCISES.filter(e => !compounds.includes(e.id));

    let html = '<option value="">Select exercise...</option>';
    html += '<optgroup label="Main Compounds">';
    compoundExercises.forEach(e => { html += `<option value="${e.id}">${e.name}</option>`; });
    html += '</optgroup><optgroup label="All Exercises">';
    others.forEach(e => { html += `<option value="${e.id}">${e.name}</option>`; });
    html += '</optgroup>';

    select.innerHTML = html;
    select.addEventListener('change', () => loadE1RMChart(select.value));
}

async function loadE1RMChart(exerciseId) {
    if (!exerciseId) return;
    try {
        const history = await getExerciseHistory(exerciseId);
        const e1rmData = history.map(s => ({
            date: s.date,
            e1rm: estimate1RM(s.weight, s.reps)
        }));
        renderE1RMChart('chart-e1rm', e1rmData);
    } catch (e) {
        console.warn('Failed to load e1rm chart:', e);
    }
}

async function loadStrengthAnalytics() {
    try {
        // Volume chart — weekly totals over last 12 weeks
        const from = formatDateISO(addDays(new Date(), -84));
        const to = formatDateISO(new Date());
        const workouts = await getWorkoutsByDateRange(from, to);

        const weeklyVolume = {};
        workouts.filter(w => w.type === 'strength' && w.sets).forEach(w => {
            const monday = formatDateISO(getMonday(new Date(w.date)));
            if (!weeklyVolume[monday]) weeklyVolume[monday] = { label: monday.substring(5), volume: 0 };
            w.sets.forEach(s => { weeklyVolume[monday].volume += (s.weight || 0) * (s.reps || 0); });
        });

        renderVolumeChart('chart-volume', Object.values(weeklyVolume).sort((a, b) => a.label.localeCompare(b.label)));

        // Muscle group balance
        const muscleVolume = await getMuscleGroupVolume(28);
        renderMuscleBalanceChart('chart-muscle-balance', muscleVolume);

        // PR board
        const prs = await getPRBoard();
        const prBoard = document.getElementById('pr-board');
        if (prBoard) {
            if (prs.length === 0) {
                prBoard.innerHTML = '<p class="text-muted">No PRs recorded yet. Log strength workouts to track.</p>';
            } else {
                prBoard.innerHTML = prs.slice(0, 10).map(pr =>
                    `<div class="pr-item">
                        <span class="pr-exercise">${pr.exerciseName}</span>
                        <span class="pr-value">${pr.e1rm}kg <small>(${pr.weight}kg x ${pr.reps})</small></span>
                        <span class="pr-date">${formatDate(pr.date)}</span>
                    </div>`
                ).join('');
            }
        }
    } catch (e) {
        console.warn('Failed to load strength analytics:', e);
    }
}

async function loadCardioAnalytics() {
    try {
        const workouts = await dbGetAll('completedWorkouts');
        const cardio = workouts.filter(w => w.type === 'cardio' && w.distance > 0).sort((a, b) => new Date(a.date) - new Date(b.date));

        // Pace progression
        const paceData = cardio.filter(w => w.pacePerKm).map(w => ({
            date: w.date,
            paceMinutes: w.pacePerKm / 60 // Convert sec/km to min/km
        }));
        renderPaceChart('chart-pace', paceData);

        // Weekly distance
        const weeklyDistance = {};
        cardio.forEach(w => {
            const monday = formatDateISO(getMonday(new Date(w.date)));
            if (!weeklyDistance[monday]) weeklyDistance[monday] = { label: monday.substring(5), distance: 0 };
            weeklyDistance[monday].distance += (w.distance || 0) / 1000;
        });
        renderDistanceChart('chart-distance', Object.values(weeklyDistance).sort((a, b) => a.label.localeCompare(b.label)).slice(-12));

        // Elevation chart placeholder — uses same distance chart shape
        const elevData = {};
        cardio.filter(w => w.elevation > 0).forEach(w => {
            const monday = formatDateISO(getMonday(new Date(w.date)));
            if (!elevData[monday]) elevData[monday] = { label: monday.substring(5), distance: 0 };
            elevData[monday].distance += w.elevation;
        });
        renderDistanceChart('chart-elevation', Object.values(elevData).sort((a, b) => a.label.localeCompare(b.label)).slice(-12));
    } catch (e) {
        console.warn('Failed to load cardio analytics:', e);
    }
}

async function loadBodyAnalytics() {
    try {
        const bodyMetrics = await dbGetAll('bodyMetrics');
        const healthMetrics = await dbGetAll('healthMetrics');

        // Weight chart
        const weightData = bodyMetrics.filter(m => m.weight).sort((a, b) => new Date(a.date) - new Date(b.date)).map(m => ({
            date: m.date,
            weight: m.weight
        }));
        renderWeightChart('chart-weight', weightData);

        // Health trends
        const healthData = healthMetrics.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-60);
        renderHealthTrendsChart('chart-health-trends', healthData);

        // Readiness history
        const readinessData = healthMetrics.filter(m => m.readinessScore).sort((a, b) => new Date(a.date) - new Date(b.date)).map(m => ({
            date: m.date,
            score: m.readinessScore
        }));
        renderReadinessChart('chart-readiness', readinessData);
    } catch (e) {
        console.warn('Failed to load body analytics:', e);
    }
}

export function switchAnalyticsTab(tab) {
    document.querySelectorAll('#page-analytics .tab').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tab);
    });
    ['strength-analytics', 'cardio-analytics', 'body-analytics'].forEach(id => {
        const el = document.getElementById(`analytics-${id}`);
        if (el) el.classList.toggle('hidden', id !== tab);
    });
}
