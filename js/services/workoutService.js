// js/services/workoutService.js — Workout CRUD and aggregation

import { dbPut, dbGet, dbGetAll, dbGetByIndex, dbGetByRange, dbDelete, generateId } from '../db.js';
import { formatDateISO, getMonday, addDays, estimate1RM, getStrengthTrainingLoad } from '../utils.js';
import { calculateWorkoutTSS } from '../engines/fitnessScores.js';

// Save a completed strength workout
export async function saveStrengthWorkout({ exercises, overallRPE, notes, date, plannedWorkoutId }) {
    const sets = [];
    exercises.forEach(ex => {
        ex.sets.forEach(s => {
            sets.push({
                id: generateId(),
                exerciseId: ex.exerciseId,
                exerciseName: ex.name,
                weight: parseFloat(s.weight) || 0,
                reps: parseInt(s.reps) || 0,
                rpe: parseFloat(s.rpe) || null,
                isWarmup: s.isWarmup || false
            });
        });
    });

    const workout = {
        id: generateId(),
        type: 'strength',
        date: date || formatDateISO(new Date()),
        sets,
        overallRPE: parseInt(overallRPE) || 5,
        notes: notes || '',
        plannedWorkoutId: plannedWorkoutId || null,
        trainingLoad: getStrengthTrainingLoad(sets),
        duration: null,
        createdAt: new Date().toISOString()
    };

    await dbPut('completedWorkouts', workout);

    // Mark planned workout as completed if linked
    if (plannedWorkoutId) {
        const planned = await dbGet('plannedWorkouts', plannedWorkoutId);
        if (planned) {
            planned.status = 'completed';
            await dbPut('plannedWorkouts', planned);
        }
    }

    // Save individual sets for exercise-level querying
    for (const set of sets) {
        set.workoutId = workout.id;
        set.date = workout.date;
        await dbPut('exerciseSets', set);
    }

    return workout;
}

// Save a completed cardio workout
export async function saveCardioWorkout({ activityType, distance, duration, avgHR, maxHR, elevation, rpe, notes, date, plannedWorkoutId }) {
    const durationSeconds = parseDuration(duration);

    const workout = {
        id: generateId(),
        type: 'cardio',
        activityType: activityType || 'Run',
        date: date || formatDateISO(new Date()),
        distance: parseFloat(distance) || 0,
        duration: durationSeconds,
        averageHeartrate: parseInt(avgHR) || null,
        maxHeartrate: parseInt(maxHR) || null,
        elevation: parseFloat(elevation) || 0,
        overallRPE: parseInt(rpe) || 5,
        notes: notes || '',
        plannedWorkoutId: plannedWorkoutId || null,
        createdAt: new Date().toISOString()
    };

    workout.trainingLoad = calculateWorkoutTSS(workout);

    // Calculate pace if distance and duration available
    if (workout.distance > 0 && durationSeconds > 0) {
        workout.pacePerKm = durationSeconds / (workout.distance / 1000);
    }

    await dbPut('completedWorkouts', workout);

    if (plannedWorkoutId) {
        const planned = await dbGet('plannedWorkouts', plannedWorkoutId);
        if (planned) {
            planned.status = 'completed';
            await dbPut('plannedWorkouts', planned);
        }
    }

    return workout;
}

function parseDuration(str) {
    if (!str) return 0;
    if (typeof str === 'number') return str;
    const parts = str.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return parseInt(str) || 0;
}

// Get all completed workouts
export async function getAllWorkouts() {
    return (await dbGetAll('completedWorkouts')).sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Get workouts for a date range
export async function getWorkoutsByDateRange(from, to) {
    return await dbGetByRange('completedWorkouts', 'date', from, to);
}

// Get this week's stats
export async function getWeeklyStats() {
    const monday = formatDateISO(getMonday(new Date()));
    const sunday = formatDateISO(addDays(getMonday(new Date()), 6));
    const workouts = await getWorkoutsByDateRange(monday, sunday);

    let sessions = workouts.length;
    let totalVolume = 0;
    let totalDistance = 0;
    let totalDuration = 0;

    workouts.forEach(w => {
        if (w.type === 'strength' && w.sets) {
            w.sets.forEach(s => { totalVolume += (s.weight || 0) * (s.reps || 0); });
        }
        if (w.type === 'cardio') {
            totalDistance += w.distance || 0;
        }
        totalDuration += w.duration || 0;
    });

    return {
        sessions,
        totalVolume: Math.round(totalVolume),
        totalDistance: Math.round(totalDistance / 100) / 10, // km with 1 decimal
        totalDuration
    };
}

// Get exercise history for analytics
export async function getExerciseHistory(exerciseId) {
    const sets = await dbGetByIndex('exerciseSets', 'exerciseId', exerciseId);
    return sets
        .filter(s => !s.isWarmup && s.weight > 0 && s.reps > 0)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Get PR board
export async function getPRBoard() {
    const sets = await dbGetAll('exerciseSets');
    const prs = {};

    sets.filter(s => !s.isWarmup && s.weight > 0 && s.reps > 0).forEach(s => {
        const e1rm = estimate1RM(s.weight, s.reps);
        if (!prs[s.exerciseId] || e1rm > prs[s.exerciseId].e1rm) {
            prs[s.exerciseId] = {
                exerciseId: s.exerciseId,
                exerciseName: s.exerciseName,
                e1rm,
                weight: s.weight,
                reps: s.reps,
                date: s.date
            };
        }
    });

    return Object.values(prs).sort((a, b) => b.e1rm - a.e1rm);
}

// Get recent workouts for quick-log
export async function getRecentWorkoutTemplates() {
    const workouts = await getAllWorkouts();
    const seen = new Set();
    const templates = [];

    for (const w of workouts) {
        if (w.type !== 'strength' || !w.sets) continue;
        const key = w.sets.map(s => s.exerciseId).join(',');
        if (seen.has(key)) continue;
        seen.add(key);
        templates.push(w);
        if (templates.length >= 5) break;
    }

    return templates;
}

// Get muscle group distribution from recent workouts
export async function getMuscleGroupVolume(days = 28) {
    const from = formatDateISO(addDays(new Date(), -days));
    const to = formatDateISO(new Date());
    const workouts = await getWorkoutsByDateRange(from, to);

    const volumeByMuscle = {};
    workouts.forEach(w => {
        if (w.type !== 'strength' || !w.sets) return;
        w.sets.filter(s => !s.isWarmup).forEach(s => {
            const name = s.exerciseName || s.exerciseId;
            if (!volumeByMuscle[name]) volumeByMuscle[name] = 0;
            volumeByMuscle[name] += (s.weight || 0) * (s.reps || 0);
        });
    });

    return volumeByMuscle;
}

// Delete a workout
export async function deleteWorkout(id) {
    await dbDelete('completedWorkouts', id);
    // Also delete associated sets
    const sets = await dbGetByIndex('exerciseSets', 'workoutId', id);
    for (const s of sets) {
        await dbDelete('exerciseSets', s.id);
    }
}
