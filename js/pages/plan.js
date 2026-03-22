// js/pages/plan.js — Training plan page logic
import { registerPage, showToast, showLoading, hideLoading } from '../ui.js';
import { generateTrainingPlan, savePlan, getActivePlan, getPlanWorkouts } from '../engines/coachEngine.js';
import { dbPut, dbGet, generateId } from '../db.js';
import { formatDateISO, formatDate, addDays, getMonday } from '../utils.js';

let currentPlanWeek = 0;
let planWorkouts = [];

export function initPlanPage() {
    registerPage('plan', loadPlanPage);
    registerPage('plan-setup', () => {
        const dateInput = document.getElementById('goal-date');
        if (dateInput && !dateInput.value) {
            const defaultDate = addDays(new Date(), 84); // 12 weeks
            dateInput.value = formatDateISO(defaultDate);
        }
    });
}

async function loadPlanPage() {
    try {
        const plan = await getActivePlan();
        const noPlan = document.getElementById('no-plan');
        const calendar = document.getElementById('plan-calendar');

        if (!plan) {
            if (noPlan) noPlan.classList.remove('hidden');
            if (calendar) calendar.classList.add('hidden');
            return;
        }

        if (noPlan) noPlan.classList.add('hidden');
        if (calendar) calendar.classList.remove('hidden');

        planWorkouts = await getPlanWorkouts(plan.id);
        planWorkouts.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Find current week
        const today = formatDateISO(new Date());
        const todayWeek = planWorkouts.findIndex(w => w.date >= today);
        if (todayWeek >= 0) {
            currentPlanWeek = planWorkouts[todayWeek].week - 1;
        }

        renderPlanWeek();
        setupWeekNav();
    } catch (e) {
        console.warn('Failed to load plan:', e);
    }
}

function setupWeekNav() {
    document.getElementById('plan-prev-week')?.addEventListener('click', () => {
        if (currentPlanWeek > 0) { currentPlanWeek--; renderPlanWeek(); }
    });
    document.getElementById('plan-next-week')?.addEventListener('click', () => {
        const maxWeek = Math.max(...planWorkouts.map(w => w.week));
        if (currentPlanWeek < maxWeek - 1) { currentPlanWeek++; renderPlanWeek(); }
    });
}

function renderPlanWeek() {
    const weekLabel = document.getElementById('plan-week-label');
    const daysContainer = document.getElementById('plan-days');
    if (!daysContainer) return;

    const weekNum = currentPlanWeek + 1;
    if (weekLabel) weekLabel.textContent = `Week ${weekNum}`;

    const weekWorkouts = planWorkouts.filter(w => w.week === weekNum);
    const today = formatDateISO(new Date());

    daysContainer.innerHTML = weekWorkouts.map(w => {
        const isToday = w.date === today;
        const statusClass = w.status === 'completed' ? 'completed' : (isToday ? 'today' : '');

        let content = `<div class="plan-day ${statusClass}">
            <div class="plan-day-header">
                <span class="plan-day-date">${formatDate(w.date)}</span>
                <span class="plan-day-status ${w.status}">${w.status}</span>
            </div>
            <h4>${w.description}</h4>`;

        if (w.exercises) {
            content += '<ul class="plan-exercises">';
            w.exercises.forEach(ex => {
                content += `<li>${ex.name}: ${ex.targetSets} x ${ex.targetReps} @ RPE ${ex.targetRPE}</li>`;
            });
            content += '</ul>';
        }

        if (w.cardioTarget) {
            content += `<p class="plan-cardio">${w.cardioTarget.type}: ${w.cardioTarget.distance}km<br><small>${w.cardioTarget.description}</small></p>`;
        }

        if (w.status === 'upcoming' && isToday) {
            content += `<button class="btn btn-primary btn-sm" onclick="location.hash='log'">Start</button>`;
        }

        content += '</div>';
        return content;
    }).join('');

    if (weekWorkouts.length === 0) {
        daysContainer.innerHTML = '<p class="text-muted">No workouts scheduled for this week</p>';
    }
}

export async function generatePlan() {
    const goalType = document.getElementById('goal-type')?.value;
    const goalDesc = document.getElementById('goal-description')?.value;
    const goalDate = document.getElementById('goal-date')?.value;
    const goalDays = document.getElementById('goal-days')?.value;
    const goalLevel = document.getElementById('goal-level')?.value;
    const weeklyKm = document.getElementById('goal-weekly-km')?.value;

    if (!goalDate) {
        showToast('Please set a target date', 'warning');
        return;
    }

    showLoading('Generating training plan...');

    try {
        const goal = {
            id: generateId(),
            type: goalType,
            description: goalDesc || '',
            targetDate: goalDate,
            createdAt: new Date().toISOString()
        };
        await dbPut('goals', goal);

        const profile = {
            experienceLevel: goalLevel || 'intermediate',
            trainingDays: parseInt(goalDays) || 4,
            currentWeeklyDistance: parseFloat(weeklyKm) || 20
        };

        const { plan, workouts } = generateTrainingPlan(goal, profile);
        await savePlan(plan, workouts);

        hideLoading();
        showToast(`Plan created: ${workouts.length} sessions over ${Math.ceil(workouts.length / parseInt(goalDays))} weeks`, 'success');
        location.hash = 'plan';
    } catch (e) {
        hideLoading();
        showToast('Failed to generate plan: ' + e.message, 'error');
    }
}
