// js/engines/adaptiveEngine.js — Adaptive programming based on session feedback

import { dbGetAll, dbGetByIndex, dbPut, generateId } from '../db.js';
import { formatDateISO, addDays, getMonday } from '../utils.js';
import { getCurrentFitnessState } from './fitnessScores.js';
import { calculateReadinessScore, getBaselines } from './readinessEngine.js';

// Analyse recent session performance and adjust upcoming plan
export async function adaptPlan(planId) {
    const completedWorkouts = await dbGetAll('completedWorkouts');
    const plannedWorkouts = await dbGetByIndex('plannedWorkouts', 'planId', planId);
    const healthMetrics = await dbGetAll('healthMetrics');
    const fitnessScores = await dbGetAll('fitnessScores');

    const recentCompleted = completedWorkouts
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 14); // Last 14 sessions

    const upcomingWorkouts = plannedWorkouts
        .filter(w => w.status === 'upcoming' && new Date(w.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (recentCompleted.length < 3 || upcomingWorkouts.length === 0) {
        return { adjustments: [], reason: 'Not enough data to adapt' };
    }

    const adjustments = [];

    // 1. Check RPE trends
    const rpeAdjustment = analyseRPETrend(recentCompleted);
    if (rpeAdjustment) adjustments.push(rpeAdjustment);

    // 2. Check completion rate
    const completionAdjustment = analyseCompletionRate(recentCompleted, plannedWorkouts);
    if (completionAdjustment) adjustments.push(completionAdjustment);

    // 3. Check fatigue state (TSB)
    const fatigueAdjustment = analyseFatigueState(fitnessScores);
    if (fatigueAdjustment) adjustments.push(fatigueAdjustment);

    // 4. Check readiness
    const readinessAdjustment = await analyseReadiness(healthMetrics, fitnessScores);
    if (readinessAdjustment) adjustments.push(readinessAdjustment);

    // Apply adjustments to upcoming workouts
    if (adjustments.length > 0) {
        await applyAdjustments(upcomingWorkouts, adjustments);
    }

    return { adjustments, upcomingWorkouts };
}

function analyseRPETrend(recentWorkouts) {
    const rpeValues = recentWorkouts.filter(w => w.overallRPE).map(w => w.overallRPE);
    if (rpeValues.length < 3) return null;

    const avgRPE = rpeValues.reduce((a, b) => a + b) / rpeValues.length;
    const recentAvgRPE = rpeValues.slice(0, 5).reduce((a, b) => a + b) / Math.min(5, rpeValues.length);

    if (recentAvgRPE >= 9) {
        return {
            type: 'reduce_intensity',
            reason: `Average RPE of ${recentAvgRPE.toFixed(1)} — sessions are too hard`,
            action: 'Reducing intensity for upcoming sessions',
            factor: 0.85
        };
    }

    if (recentAvgRPE <= 5 && avgRPE <= 5.5) {
        return {
            type: 'increase_intensity',
            reason: `Average RPE of ${recentAvgRPE.toFixed(1)} — sessions are too easy`,
            action: 'Increasing intensity for upcoming sessions',
            factor: 1.1
        };
    }

    return null;
}

function analyseCompletionRate(completed, planned) {
    const lastTwoWeeks = new Date();
    lastTwoWeeks.setDate(lastTwoWeeks.getDate() - 14);

    const recentPlanned = planned.filter(w =>
        new Date(w.date) >= lastTwoWeeks && new Date(w.date) <= new Date()
    );

    const completedIds = new Set(completed.map(w => w.plannedWorkoutId).filter(Boolean));
    const completionRate = recentPlanned.length > 0
        ? recentPlanned.filter(w => w.status === 'completed' || completedIds.has(w.id)).length / recentPlanned.length
        : 1;

    if (completionRate < 0.5) {
        return {
            type: 'reduce_volume',
            reason: `Only ${Math.round(completionRate * 100)}% completion rate — too much volume`,
            action: 'Reducing number of sessions and volume',
            factor: 0.75
        };
    }

    return null;
}

function analyseFatigueState(fitnessScores) {
    if (fitnessScores.length === 0) return null;

    const state = getCurrentFitnessState(fitnessScores);

    if (state.tsb < -25) {
        return {
            type: 'force_deload',
            reason: `TSB at ${state.tsb.toFixed(1)} — significant fatigue accumulation`,
            action: 'Inserting deload week',
            factor: 0.5
        };
    }

    if (state.tsb < -15) {
        return {
            type: 'reduce_intensity',
            reason: `TSB at ${state.tsb.toFixed(1)} — moderate fatigue`,
            action: 'Reducing intensity this week',
            factor: 0.85
        };
    }

    return null;
}

async function analyseReadiness(healthMetrics, fitnessScores) {
    if (healthMetrics.length === 0) return null;

    const baselines = await getBaselines();
    const latestHealth = healthMetrics.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const latestFitness = fitnessScores.length > 0
        ? fitnessScores.sort((a, b) => new Date(b.date) - new Date(a.date))[0]
        : null;

    const readiness = calculateReadinessScore({
        hrv: latestHealth.hrv,
        restingHR: latestHealth.restingHR,
        sleepTotal: latestHealth.sleepTotal,
        sleepScore: latestHealth.sleepScore,
        tsb: latestFitness?.tsb,
        ...baselines
    });

    if (readiness.score < 35) {
        return {
            type: 'rest_day',
            reason: `Readiness score ${readiness.score}/100 — ${readiness.recommendation}`,
            action: 'Suggesting rest or very easy session today',
            factor: 0.3
        };
    }

    if (readiness.score < 55) {
        return {
            type: 'reduce_intensity',
            reason: `Readiness score ${readiness.score}/100 — ${readiness.recommendation}`,
            action: 'Reducing today\'s intensity',
            factor: 0.8
        };
    }

    return null;
}

async function applyAdjustments(upcomingWorkouts, adjustments) {
    const primaryAdjustment = adjustments.sort((a, b) => a.factor - b.factor)[0]; // Most conservative

    // Apply to next 7 days of workouts
    const nextWeek = upcomingWorkouts.slice(0, 7);

    for (const workout of nextWeek) {
        if (primaryAdjustment.type === 'force_deload') {
            workout.description = `[DELOAD] ${workout.description}`;
            workout.isDeload = true;
            if (workout.exercises) {
                workout.exercises.forEach(ex => {
                    ex.targetSets = Math.max(2, Math.round(ex.targetSets * 0.6));
                    ex.targetRPE = '5-6';
                });
            }
            if (workout.cardioTarget) {
                workout.cardioTarget.distance = Math.round(workout.cardioTarget.distance * 0.6 * 10) / 10;
                workout.cardioTarget.zone = 'easy';
            }
        } else if (primaryAdjustment.type === 'rest_day') {
            if (new Date(workout.date).toDateString() === new Date().toDateString()) {
                workout.description = `[REST SUGGESTED] ${workout.description}`;
                workout.restSuggested = true;
            }
        } else if (primaryAdjustment.type === 'reduce_intensity' || primaryAdjustment.type === 'reduce_volume') {
            const factor = primaryAdjustment.factor;
            if (workout.exercises) {
                workout.exercises.forEach(ex => {
                    if (factor < 0.85) {
                        ex.targetSets = Math.max(2, Math.round(ex.targetSets * factor));
                    }
                });
            }
            if (workout.cardioTarget) {
                workout.cardioTarget.distance = Math.round(workout.cardioTarget.distance * factor * 10) / 10;
            }
        }

        await dbPut('plannedWorkouts', workout);
    }
}

// Get coach insights/recommendations
export async function getCoachInsights() {
    const completed = await dbGetAll('completedWorkouts');
    const planned = await dbGetAll('plannedWorkouts');
    const health = await dbGetAll('healthMetrics');
    const fitness = await dbGetAll('fitnessScores');

    const insights = [];

    // Training streak
    const sorted = completed.sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 60; i++) {
        const checkDate = formatDateISO(addDays(today, -i));
        if (sorted.some(w => formatDateISO(w.date) === checkDate)) {
            streak++;
        } else if (i > 0) break;
    }
    if (streak >= 3) {
        insights.push({ type: 'streak', message: `${streak}-day training streak! Keep it up.`, icon: '🔥' });
    }

    // Weekly volume vs plan
    const thisWeekStart = formatDateISO(getMonday(new Date()));
    const thisWeekPlanned = planned.filter(w => w.date >= thisWeekStart && w.status !== 'rest');
    const thisWeekCompleted = completed.filter(w => w.date >= thisWeekStart);
    if (thisWeekPlanned.length > 0) {
        const compliance = Math.round((thisWeekCompleted.length / thisWeekPlanned.length) * 100);
        insights.push({
            type: 'compliance',
            message: `${thisWeekCompleted.length}/${thisWeekPlanned.length} sessions completed this week (${compliance}%)`,
            icon: '📊'
        });
    }

    // PR detection
    const strengthWorkouts = completed.filter(w => w.type === 'strength' && w.sets);
    if (strengthWorkouts.length > 0) {
        const exercisePRs = {};
        strengthWorkouts.forEach(w => {
            (w.sets || []).forEach(s => {
                const e1rm = Math.round(s.weight * (1 + s.reps / 30));
                if (!exercisePRs[s.exerciseId] || e1rm > exercisePRs[s.exerciseId].value) {
                    exercisePRs[s.exerciseId] = { value: e1rm, date: w.date, name: s.exerciseName };
                }
            });
        });

        const recentPRs = Object.values(exercisePRs).filter(pr => {
            const daysSince = (new Date() - new Date(pr.date)) / (1000 * 60 * 60 * 24);
            return daysSince < 7;
        });

        recentPRs.forEach(pr => {
            insights.push({
                type: 'pr',
                message: `New estimated 1RM: ${pr.name} — ${pr.value}kg`,
                icon: '🏆'
            });
        });
    }

    return insights;
}
