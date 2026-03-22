// js/engines/fitnessScores.js — CTL/ATL/TSB fitness-fatigue model
// Based on the Banister impulse-response model used by TrainingPeaks, WKO, etc.

import { dbGetAll, dbPut, dbGetByRange, generateId } from '../db.js';
import { getTrainingLoadFromRPE, getStrengthTrainingLoad, formatDateISO } from '../utils.js';

const CTL_DAYS = 42; // Chronic Training Load (fitness) time constant
const ATL_DAYS = 7;  // Acute Training Load (fatigue) time constant

// Calculate training stress for a single workout
export function calculateWorkoutTSS(workout) {
    if (workout.type === 'strength') {
        return getStrengthTrainingLoad(workout.sets || []);
    }

    // Cardio: use RPE-based if no power/HR data
    const durationMinutes = (workout.duration || 0) / 60;
    const rpe = workout.overallRPE || 5;

    if (workout.averageHeartrate && workout.maxHeartrate) {
        // HR-based TRIMP (Lucia's method)
        const hrReserve = (workout.averageHeartrate - 60) / (workout.maxHeartrate - 60);
        return Math.round(durationMinutes * hrReserve * hrReserve * 100) / 10;
    }

    return getTrainingLoadFromRPE(rpe, durationMinutes);
}

// Calculate CTL, ATL, TSB for a date range
export async function calculateFitnessScores(workouts, startDate, endDate) {
    // Sort workouts by date
    const sorted = [...workouts].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Build daily TSS map
    const dailyTSS = {};
    sorted.forEach(w => {
        const date = formatDateISO(w.date);
        if (!dailyTSS[date]) dailyTSS[date] = 0;
        dailyTSS[date] += calculateWorkoutTSS(w);
    });

    // Calculate rolling averages
    const scores = [];
    let ctl = 0;
    let atl = 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);

    while (current <= end) {
        const dateStr = formatDateISO(current);
        const tss = dailyTSS[dateStr] || 0;

        // Exponential weighted moving average
        ctl = ctl + (tss - ctl) * (1 / CTL_DAYS);
        atl = atl + (tss - atl) * (1 / ATL_DAYS);
        const tsb = ctl - atl;

        scores.push({
            id: generateId(),
            date: dateStr,
            ctl: Math.round(ctl * 10) / 10,
            atl: Math.round(atl * 10) / 10,
            tsb: Math.round(tsb * 10) / 10,
            trainingLoad: Math.round(tss * 10) / 10
        });

        current.setDate(current.getDate() + 1);
    }

    return scores;
}

// Get current fitness state
export function getCurrentFitnessState(scores) {
    if (scores.length === 0) return { ctl: 0, atl: 0, tsb: 0, status: 'No data' };

    const latest = scores[scores.length - 1];

    let status;
    if (latest.tsb > 15) status = 'Fresh - Ready to perform';
    else if (latest.tsb > 5) status = 'Fresh - Good for quality sessions';
    else if (latest.tsb > -10) status = 'Neutral - Normal training';
    else if (latest.tsb > -20) status = 'Fatigued - Consider easier sessions';
    else status = 'Very fatigued - Deload recommended';

    return { ...latest, status };
}

// Get fitness trend (improving/maintaining/declining)
export function getFitnessTrend(scores, days = 14) {
    if (scores.length < days) return 'insufficient_data';

    const recent = scores.slice(-days);
    const firstCTL = recent[0].ctl;
    const lastCTL = recent[recent.length - 1].ctl;
    const change = lastCTL - firstCTL;

    if (change > 3) return 'improving';
    if (change < -3) return 'declining';
    return 'maintaining';
}

// Save fitness scores to IndexedDB
export async function saveFitnessScores(scores) {
    for (const score of scores) {
        await dbPut('fitnessScores', score);
    }
}

// Load fitness scores from IndexedDB
export async function loadFitnessScores() {
    return await dbGetAll('fitnessScores');
}
