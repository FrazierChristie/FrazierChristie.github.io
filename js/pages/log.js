// js/pages/log.js — Workout logging page logic
import { registerPage } from '../ui.js';
import { showToast } from '../ui.js';
import { saveStrengthWorkout, saveCardioWorkout, getRecentWorkoutTemplates } from '../services/workoutService.js';
import { searchExercises, EXERCISES } from '../../data/exercises.js';
import { formatDateISO, escapeHtml } from '../utils.js';
import { generateId } from '../db.js';

let currentExercises = [];
let restTimerInterval = null;
let restTimerSeconds = 0;

export function initLogPage() {
    registerPage('log', loadLogPage);
}

function loadLogPage() {
    setupExerciseSearch();
    setupRPESliders();
    setupDateDefaults();
    loadQuickLogTemplates();
}

function setupExerciseSearch() {
    const input = document.getElementById('exercise-search');
    const results = document.getElementById('exercise-results');
    if (!input || !results) return;

    input.addEventListener('input', () => {
        const query = input.value.trim();
        if (query.length < 2) {
            results.classList.add('hidden');
            return;
        }

        const matches = searchExercises(query).slice(0, 8);
        if (matches.length === 0) {
            results.classList.add('hidden');
            return;
        }

        results.innerHTML = matches.map(e =>
            `<button class="exercise-option" data-id="${e.id}">
                <span class="exercise-name">${escapeHtml(e.name)}</span>
                <span class="exercise-meta">${e.category} · ${e.muscleGroup}</span>
            </button>`
        ).join('');

        results.classList.remove('hidden');

        results.querySelectorAll('.exercise-option').forEach(btn => {
            btn.addEventListener('click', () => {
                addExercise(btn.dataset.id);
                input.value = '';
                results.classList.add('hidden');
            });
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#exercise-search') && !e.target.closest('#exercise-results')) {
            results.classList.add('hidden');
        }
    });
}

function addExercise(exerciseId) {
    const exercise = EXERCISES.find(e => e.id === exerciseId);
    if (!exercise) return;

    const entry = {
        exerciseId: exercise.id,
        name: exercise.name,
        sets: [{ weight: '', reps: '', rpe: '', isWarmup: false }]
    };
    currentExercises.push(entry);
    renderExercises();
}

function renderExercises() {
    const container = document.getElementById('workout-exercises');
    if (!container) return;

    container.innerHTML = currentExercises.map((ex, exIdx) => {
        let html = `<div class="card exercise-card" data-ex-idx="${exIdx}">
            <div class="exercise-header">
                <h4>${escapeHtml(ex.name)}</h4>
                <button class="btn-icon btn-danger-text" onclick="window.fitcoach.removeExercise(${exIdx})">&times;</button>
            </div>
            <table class="set-table">
                <thead><tr><th>Set</th><th>kg</th><th>Reps</th><th>RPE</th><th></th></tr></thead>
                <tbody>`;

        ex.sets.forEach((set, setIdx) => {
            html += `<tr class="${set.isWarmup ? 'warmup-row' : ''}">
                <td>${set.isWarmup ? 'W' : setIdx + 1 - ex.sets.filter((s, i) => i < setIdx && s.isWarmup).length}</td>
                <td><input type="number" class="input-sm" value="${set.weight}" onchange="window.fitcoach.updateSet(${exIdx},${setIdx},'weight',this.value)" placeholder="0"></td>
                <td><input type="number" class="input-sm" value="${set.reps}" onchange="window.fitcoach.updateSet(${exIdx},${setIdx},'reps',this.value)" placeholder="0"></td>
                <td><input type="number" class="input-sm" value="${set.rpe}" onchange="window.fitcoach.updateSet(${exIdx},${setIdx},'rpe',this.value)" min="1" max="10" placeholder="-"></td>
                <td><button class="btn-icon btn-xs" onclick="window.fitcoach.removeSet(${exIdx},${setIdx})">&times;</button></td>
            </tr>`;
        });

        html += `</tbody></table>
            <div class="exercise-actions">
                <button class="btn btn-sm btn-secondary" onclick="window.fitcoach.addSet(${exIdx})">+ Set</button>
                <button class="btn btn-sm btn-secondary" onclick="window.fitcoach.addWarmupSet(${exIdx})">+ Warmup</button>
                <button class="btn btn-sm btn-secondary" onclick="window.fitcoach.startRestTimer(${exIdx})">Rest Timer</button>
            </div>
        </div>`;
        return html;
    }).join('');
}

function setupRPESliders() {
    ['strength-rpe', 'cardio-rpe'].forEach(id => {
        const slider = document.getElementById(id);
        const display = document.getElementById(id + '-value');
        if (slider && display) {
            slider.addEventListener('input', () => { display.textContent = slider.value; });
        }
    });
}

function setupDateDefaults() {
    const cardioDate = document.getElementById('cardio-date');
    if (cardioDate && !cardioDate.value) {
        cardioDate.value = formatDateISO(new Date());
    }
}

async function loadQuickLogTemplates() {
    try {
        const templates = await getRecentWorkoutTemplates();
        const container = document.getElementById('quick-log-list');
        if (!container) return;

        if (templates.length === 0) {
            container.innerHTML = '<p class="text-muted">Your recent workouts will appear here for quick repeating.</p>';
            return;
        }

        container.innerHTML = templates.map(t => {
            const exerciseNames = [...new Set((t.sets || []).map(s => s.exerciseName))].join(', ');
            return `<div class="card quick-log-card" onclick="window.fitcoach.loadTemplate('${t.id}')">
                <h4>${t.date}</h4>
                <p class="text-muted">${escapeHtml(exerciseNames)}</p>
            </div>`;
        }).join('');
    } catch (e) {
        console.warn('Failed to load templates:', e);
    }
}

// --- Exported actions for window.fitcoach ---

export function switchLogTab(tab) {
    document.querySelectorAll('#page-log .tab').forEach(el => {
        el.classList.toggle('active', el.dataset.tab === tab);
    });
    document.querySelectorAll('#page-log .log-section').forEach(el => {
        el.classList.toggle('hidden', el.id !== `log-${tab}`);
    });
}

export function removeExercise(idx) {
    currentExercises.splice(idx, 1);
    renderExercises();
}

export function addSet(exIdx) {
    const ex = currentExercises[exIdx];
    if (!ex) return;
    const lastSet = ex.sets[ex.sets.length - 1];
    ex.sets.push({ weight: lastSet?.weight || '', reps: lastSet?.reps || '', rpe: '', isWarmup: false });
    renderExercises();
}

export function addWarmupSet(exIdx) {
    const ex = currentExercises[exIdx];
    if (!ex) return;
    ex.sets.unshift({ weight: '', reps: '', rpe: '', isWarmup: true });
    renderExercises();
}

export function removeSet(exIdx, setIdx) {
    const ex = currentExercises[exIdx];
    if (!ex) return;
    ex.sets.splice(setIdx, 1);
    if (ex.sets.length === 0) currentExercises.splice(exIdx, 1);
    renderExercises();
}

export function updateSet(exIdx, setIdx, field, value) {
    const ex = currentExercises[exIdx];
    if (!ex || !ex.sets[setIdx]) return;
    ex.sets[setIdx][field] = value;
}

export function startRestTimer() {
    restTimerSeconds = 0;
    const timerEl = document.getElementById('rest-timer');
    const valueEl = document.getElementById('rest-timer-value');
    if (!timerEl || !valueEl) return;

    timerEl.classList.remove('hidden');
    clearInterval(restTimerInterval);
    restTimerInterval = setInterval(() => {
        restTimerSeconds++;
        const m = Math.floor(restTimerSeconds / 60);
        const s = restTimerSeconds % 60;
        valueEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
}

export function dismissRestTimer() {
    clearInterval(restTimerInterval);
    const timerEl = document.getElementById('rest-timer');
    if (timerEl) timerEl.classList.add('hidden');
}

export async function saveStrength() {
    if (currentExercises.length === 0) {
        showToast('Add at least one exercise', 'warning');
        return;
    }

    const rpe = document.getElementById('strength-rpe')?.value || '7';
    const notes = document.getElementById('strength-notes')?.value || '';

    try {
        await saveStrengthWorkout({
            exercises: currentExercises,
            overallRPE: rpe,
            notes,
            date: formatDateISO(new Date())
        });
        showToast('Strength workout saved!', 'success');
        currentExercises = [];
        renderExercises();
        document.getElementById('strength-notes').value = '';
    } catch (e) {
        showToast('Failed to save workout: ' + e.message, 'error');
    }
}

export async function saveCardio() {
    const activityType = document.getElementById('cardio-type')?.value;
    const date = document.getElementById('cardio-date')?.value;
    const distance = document.getElementById('cardio-distance')?.value;
    const duration = document.getElementById('cardio-duration')?.value;
    const avgHR = document.getElementById('cardio-hr')?.value;
    const elevation = document.getElementById('cardio-elevation')?.value;
    const rpe = document.getElementById('cardio-rpe')?.value;
    const notes = document.getElementById('cardio-notes')?.value;

    if (!distance && !duration) {
        showToast('Enter at least distance or duration', 'warning');
        return;
    }

    try {
        await saveCardioWorkout({
            activityType,
            distance: parseFloat(distance) * 1000, // km to m
            duration,
            avgHR,
            elevation,
            rpe,
            notes,
            date
        });
        showToast('Cardio workout saved!', 'success');
        // Reset form
        ['cardio-distance', 'cardio-duration', 'cardio-hr', 'cardio-elevation', 'cardio-notes'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    } catch (e) {
        showToast('Failed to save workout: ' + e.message, 'error');
    }
}

export async function loadTemplate(workoutId) {
    const { dbGet } = await import('../db.js');
    const workout = await dbGet('completedWorkouts', workoutId);
    if (!workout || !workout.sets) return;

    // Reconstruct exercises from sets
    const exerciseMap = {};
    workout.sets.forEach(s => {
        if (!exerciseMap[s.exerciseId]) {
            exerciseMap[s.exerciseId] = { exerciseId: s.exerciseId, name: s.exerciseName, sets: [] };
        }
        exerciseMap[s.exerciseId].sets.push({ weight: s.weight, reps: s.reps, rpe: '', isWarmup: s.isWarmup });
    });

    currentExercises = Object.values(exerciseMap);
    renderExercises();
    switchLogTab('strength');
    showToast('Template loaded — adjust weights and go!', 'info');
}
