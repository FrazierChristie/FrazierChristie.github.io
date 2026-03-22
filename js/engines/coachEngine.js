// js/engines/coachEngine.js — AI Training Plan Generator
// Implements periodisation models, progressive overload, and Daniels' running formula

import { dbPut, dbGetAll, dbGetByIndex, generateId } from '../db.js';
import { addDays, formatDateISO, getMonday, estimate1RM } from '../utils.js';
import { EXERCISES } from '../../data/exercises.js';

// --- RUNNING ZONES (Daniels' Running Formula) ---

export function calculateVDOT(raceDistance, raceTimeSeconds) {
    // Simplified VDOT estimation from race performance
    // raceDistance in meters, raceTimeSeconds in seconds
    const velocity = raceDistance / raceTimeSeconds; // m/s
    const percentVO2max = 0.8 + 0.1894393 * Math.exp(-0.012778 * raceTimeSeconds / 60) +
        0.2989558 * Math.exp(-0.1932605 * raceTimeSeconds / 60);
    const vo2 = -4.60 + 0.182258 * velocity * 60 + 0.000104 * (velocity * 60) * (velocity * 60);
    return vo2 / percentVO2max;
}

export function getRunningZones(vdot) {
    // Daniels' pace zones based on VDOT
    // Returns pace in seconds per km
    const basePace = 29.54 + 5.000663 * (60 - vdot); // Rough easy pace formula

    return {
        easy: { name: 'Easy (Zone 1-2)', min: basePace * 1.0, max: basePace * 1.1, description: 'Conversational pace. 65-78% max HR.' },
        marathon: { name: 'Marathon Pace', min: basePace * 0.92, max: basePace * 0.96, description: 'Goal marathon pace. 80-85% max HR.' },
        tempo: { name: 'Tempo (Zone 3)', min: basePace * 0.85, max: basePace * 0.9, description: 'Comfortably hard. 85-88% max HR.' },
        interval: { name: 'Interval (Zone 4)', min: basePace * 0.75, max: basePace * 0.82, description: 'Hard effort. 95-100% VO2max.' },
        repetition: { name: 'Repetition (Zone 5)', min: basePace * 0.65, max: basePace * 0.73, description: 'Near sprint. Speed work.' }
    };
}

// --- STRENGTH PROGRAMMING ---

const STRENGTH_TEMPLATES = {
    upper_push: ['bench-press', 'ohp', 'db-incline-bench', 'tricep-pushdown', 'lateral-raise'],
    upper_pull: ['barbell-row', 'pull-up', 'face-pull', 'barbell-curl', 'hammer-curl'],
    lower_quad: ['squat', 'leg-press', 'bulgarian-split-squat', 'leg-extension', 'standing-calf-raise'],
    lower_hinge: ['deadlift', 'rdl', 'leg-curl', 'hip-thrust', 'hanging-leg-raise'],
    full_upper: ['bench-press', 'barbell-row', 'ohp', 'lat-pulldown', 'db-curl', 'tricep-pushdown', 'lateral-raise'],
    full_lower: ['squat', 'rdl', 'leg-press', 'leg-curl', 'standing-calf-raise', 'plank'],
    full_body: ['squat', 'bench-press', 'barbell-row', 'ohp', 'rdl', 'plank']
};

// Periodisation scheme parameters
const PERIODISATION = {
    linear: {
        name: 'Linear Periodisation',
        phases: [
            { name: 'Hypertrophy', weeks: 4, sets: 4, reps: [10, 12], rpe: [6, 7], rest: 90 },
            { name: 'Strength', weeks: 4, sets: 4, reps: [5, 6], rpe: [7, 8], rest: 180 },
            { name: 'Power', weeks: 3, sets: 5, reps: [2, 3], rpe: [8, 9], rest: 240 },
            { name: 'Deload', weeks: 1, sets: 3, reps: [8, 10], rpe: [5, 6], rest: 90 }
        ]
    },
    undulating: {
        name: 'Daily Undulating Periodisation',
        weekPattern: [
            { name: 'Heavy', sets: 5, reps: [3, 5], rpe: [8, 9], rest: 180 },
            { name: 'Moderate', sets: 4, reps: [8, 10], rpe: [7, 8], rest: 120 },
            { name: 'Light', sets: 3, reps: [12, 15], rpe: [6, 7], rest: 60 }
        ],
        deloadEvery: 4 // Deload every 4 weeks
    },
    block: {
        name: 'Block Periodisation',
        phases: [
            { name: 'Accumulation', weeks: 3, sets: 4, reps: [8, 12], rpe: [6, 7], rest: 90, focus: 'Volume' },
            { name: 'Transmutation', weeks: 3, sets: 4, reps: [4, 6], rpe: [8, 9], rest: 180, focus: 'Intensity' },
            { name: 'Realisation', weeks: 2, sets: 3, reps: [1, 3], rpe: [9, 10], rest: 300, focus: 'Peaking' },
            { name: 'Deload', weeks: 1, sets: 2, reps: [8, 10], rpe: [5, 6], rest: 90, focus: 'Recovery' }
        ]
    }
};

// Running plan templates (weekly structure)
const RUNNING_TEMPLATES = {
    beginner_5k: { daysPerWeek: 3, longRunPct: 0.4, tempoRunPct: 0.15, intervalPct: 0, easyPct: 0.45 },
    intermediate_10k: { daysPerWeek: 4, longRunPct: 0.35, tempoRunPct: 0.15, intervalPct: 0.1, easyPct: 0.4 },
    half_marathon: { daysPerWeek: 4, longRunPct: 0.35, tempoRunPct: 0.15, intervalPct: 0.1, easyPct: 0.4 },
    marathon: { daysPerWeek: 5, longRunPct: 0.3, tempoRunPct: 0.15, intervalPct: 0.1, easyPct: 0.45 },
    general_fitness: { daysPerWeek: 3, longRunPct: 0.3, tempoRunPct: 0.1, intervalPct: 0.05, easyPct: 0.55 }
};

// --- PLAN GENERATION ---

export function generateTrainingPlan(goal, profile) {
    const plan = {
        id: generateId(),
        goalId: goal.id,
        periodisationType: selectPeriodisation(goal, profile),
        startDate: formatDateISO(new Date()),
        endDate: goal.targetDate,
        currentPhase: 0,
        currentWeek: 1,
        status: 'active',
        createdAt: new Date().toISOString()
    };

    const totalWeeks = Math.max(4, Math.ceil(
        (new Date(goal.targetDate) - new Date()) / (7 * 24 * 60 * 60 * 1000)
    ));

    const workouts = generateWeeklyWorkouts(plan, goal, profile, totalWeeks);

    return { plan, workouts };
}

function selectPeriodisation(goal, profile) {
    const level = profile.experienceLevel || 'intermediate';
    if (level === 'beginner') return 'linear';
    if (goal.type === 'strength' || goal.type === 'powerlifting') return 'block';
    return 'undulating';
}

function generateWeeklyWorkouts(plan, goal, profile, totalWeeks) {
    const workouts = [];
    const daysPerWeek = profile.trainingDays || 4;
    const startDate = new Date(plan.startDate);
    const periodisation = PERIODISATION[plan.periodisationType];

    for (let week = 0; week < totalWeeks; week++) {
        const weekStart = addDays(getMonday(addDays(startDate, week * 7)), 0);
        const isDeload = shouldDeload(week, plan.periodisationType, totalWeeks);

        // Get current phase parameters
        const phaseParams = getPhaseParams(week, plan.periodisationType, totalWeeks);

        // Generate workout days for this week
        const weekWorkouts = generateWeekDays(weekStart, daysPerWeek, goal, profile, phaseParams, isDeload, week);
        workouts.push(...weekWorkouts);
    }

    return workouts;
}

function shouldDeload(week, periodType, totalWeeks) {
    if (periodType === 'undulating') return (week + 1) % 4 === 0;
    // For linear/block, deload is built into phase structure
    return false;
}

function getPhaseParams(week, periodType, totalWeeks) {
    const periodisation = PERIODISATION[periodType];

    if (periodType === 'undulating') {
        return periodisation.weekPattern; // Returns array of daily patterns
    }

    // For linear/block, find which phase we're in
    let weekCounter = 0;
    for (const phase of periodisation.phases) {
        // Scale phase lengths proportionally to total plan length
        const phaseWeeks = Math.max(1, Math.round(phase.weeks * totalWeeks / 12));
        if (week < weekCounter + phaseWeeks) {
            return phase;
        }
        weekCounter += phaseWeeks;
    }

    // Fallback to last phase
    return periodisation.phases[periodisation.phases.length - 1];
}

function generateWeekDays(weekStart, daysPerWeek, goal, profile, phaseParams, isDeload, weekNum) {
    const workouts = [];
    const hasStrength = goal.type !== 'race_only';
    const hasRunning = goal.type !== 'strength_only';

    // Determine split based on days available
    const schedule = getWeeklySchedule(daysPerWeek, hasStrength, hasRunning);

    schedule.forEach((dayType, dayIndex) => {
        const date = addDays(weekStart, dayIndex);

        if (dayType === 'rest') return;

        const workout = {
            id: generateId(),
            planId: null, // Set when saving
            date: formatDateISO(date),
            type: dayType.includes('run') ? 'cardio' : 'strength',
            dayType: dayType,
            description: getDayDescription(dayType, phaseParams, isDeload),
            status: 'upcoming',
            week: weekNum + 1
        };

        if (workout.type === 'strength') {
            workout.exercises = generateStrengthExercises(dayType, phaseParams, isDeload);
        } else {
            workout.cardioTarget = generateRunTarget(dayType, goal, profile, weekNum, isDeload);
        }

        workouts.push(workout);
    });

    return workouts;
}

function getWeeklySchedule(days, hasStrength, hasRunning) {
    // 7-day schedule (Mon-Sun)
    if (hasStrength && hasRunning) {
        // Hybrid: alternate, avoid hard legs + hard run on same/adjacent days
        switch (days) {
            case 3: return ['full_body', 'rest', 'run_easy', 'rest', 'full_body', 'rest', 'run_long'];
            case 4: return ['full_upper', 'run_easy', 'rest', 'full_lower', 'rest', 'run_tempo', 'run_long'];
            case 5: return ['upper_push', 'run_easy', 'upper_pull', 'rest', 'full_lower', 'run_tempo', 'run_long'];
            case 6: return ['upper_push', 'run_easy', 'lower_quad', 'run_interval', 'upper_pull', 'lower_hinge', 'run_long'];
            default: return ['full_body', 'rest', 'run_easy', 'rest', 'full_body', 'rest', 'run_long'];
        }
    } else if (hasStrength) {
        switch (days) {
            case 3: return ['full_body', 'rest', 'full_body', 'rest', 'full_body', 'rest', 'rest'];
            case 4: return ['upper_push', 'lower_quad', 'rest', 'upper_pull', 'lower_hinge', 'rest', 'rest'];
            case 5: return ['upper_push', 'lower_quad', 'upper_pull', 'rest', 'lower_hinge', 'full_body', 'rest'];
            case 6: return ['upper_push', 'lower_quad', 'upper_pull', 'lower_hinge', 'upper_push', 'lower_quad', 'rest'];
            default: return ['full_body', 'rest', 'full_body', 'rest', 'full_body', 'rest', 'rest'];
        }
    } else {
        switch (days) {
            case 3: return ['run_easy', 'rest', 'run_tempo', 'rest', 'rest', 'rest', 'run_long'];
            case 4: return ['run_easy', 'rest', 'run_tempo', 'rest', 'run_easy', 'rest', 'run_long'];
            case 5: return ['run_easy', 'run_interval', 'rest', 'run_tempo', 'run_easy', 'rest', 'run_long'];
            default: return ['run_easy', 'rest', 'run_tempo', 'rest', 'rest', 'rest', 'run_long'];
        }
    }
}

function generateStrengthExercises(dayType, phaseParams, isDeload) {
    const template = STRENGTH_TEMPLATES[dayType] || STRENGTH_TEMPLATES.full_body;
    const phase = Array.isArray(phaseParams) ? phaseParams[0] : phaseParams;

    return template.map((exerciseId, idx) => {
        const exercise = EXERCISES.find(e => e.id === exerciseId);
        const isCompound = idx < 2; // First 2 exercises are main compounds

        let sets = isDeload ? Math.max(2, phase.sets - 1) : phase.sets;
        let reps = isDeload ? [phase.reps[1], phase.reps[1] + 2] : phase.reps;
        let rpe = isDeload ? [phase.rpe[0] - 2, phase.rpe[0] - 1] : phase.rpe;

        // Accessories get slightly different parameters
        if (!isCompound) {
            sets = Math.max(2, sets - 1);
            reps = [reps[0] + 2, reps[1] + 2];
            rpe = [rpe[0] - 1, rpe[1] - 1];
        }

        return {
            exerciseId,
            name: exercise?.name || exerciseId,
            targetSets: sets,
            targetReps: `${reps[0]}-${reps[1]}`,
            targetRPE: `${Math.max(1, rpe[0])}-${Math.max(1, rpe[1])}`,
            rest: isCompound ? (phase.rest || 120) : Math.max(60, (phase.rest || 120) - 30),
            isCompound
        };
    });
}

function generateRunTarget(dayType, goal, profile, weekNum, isDeload) {
    // Progressive weekly distance increase (~10% per 3 weeks, Daniels' principle)
    const baseDistance = profile.currentWeeklyDistance || 20; // km
    const weeklyIncrease = Math.min(1.1, 1 + (0.03 * Math.floor(weekNum / 3)));
    const weekDistance = isDeload ? baseDistance * 0.6 : baseDistance * weeklyIncrease;

    const targets = {
        run_easy: {
            type: 'Easy Run',
            distance: Math.round(weekDistance * 0.2 * 10) / 10,
            zone: 'easy',
            description: 'Easy conversational pace. Focus on time on feet.'
        },
        run_long: {
            type: 'Long Run',
            distance: Math.round(weekDistance * 0.35 * 10) / 10,
            zone: 'easy',
            description: 'Long steady run. Keep heart rate in easy zone.'
        },
        run_tempo: {
            type: 'Tempo Run',
            distance: Math.round(weekDistance * 0.15 * 10) / 10,
            zone: 'tempo',
            description: 'Warm up 2km, tempo effort, cool down 2km.'
        },
        run_interval: {
            type: 'Interval Session',
            distance: Math.round(weekDistance * 0.12 * 10) / 10,
            zone: 'interval',
            description: 'Warm up, then intervals at VO2max effort with equal rest.'
        }
    };

    return targets[dayType] || targets.run_easy;
}

function getDayDescription(dayType, phaseParams, isDeload) {
    const phase = Array.isArray(phaseParams) ? phaseParams[0] : phaseParams;
    const deloadSuffix = isDeload ? ' (Deload)' : '';

    const descriptions = {
        upper_push: `Upper Push${deloadSuffix} — ${phase.name || 'Training'}`,
        upper_pull: `Upper Pull${deloadSuffix} — ${phase.name || 'Training'}`,
        lower_quad: `Lower (Quad Focus)${deloadSuffix} — ${phase.name || 'Training'}`,
        lower_hinge: `Lower (Hinge Focus)${deloadSuffix} — ${phase.name || 'Training'}`,
        full_upper: `Full Upper${deloadSuffix} — ${phase.name || 'Training'}`,
        full_lower: `Full Lower${deloadSuffix} — ${phase.name || 'Training'}`,
        full_body: `Full Body${deloadSuffix} — ${phase.name || 'Training'}`,
        run_easy: `Easy Run${deloadSuffix}`,
        run_long: `Long Run${deloadSuffix}`,
        run_tempo: `Tempo Run${deloadSuffix}`,
        run_interval: `Intervals${deloadSuffix}`
    };

    return descriptions[dayType] || dayType;
}

// --- SAVE/LOAD PLANS ---

export async function savePlan(plan, workouts) {
    await dbPut('trainingPlans', plan);
    for (const workout of workouts) {
        workout.planId = plan.id;
        await dbPut('plannedWorkouts', workout);
    }
}

export async function getActivePlan() {
    const plans = await dbGetAll('trainingPlans');
    return plans.find(p => p.status === 'active') || null;
}

export async function getPlanWorkouts(planId) {
    return await dbGetByIndex('plannedWorkouts', 'planId', planId);
}

export async function getTodaysWorkout() {
    const today = formatDateISO(new Date());
    const workouts = await dbGetByIndex('plannedWorkouts', 'date', today);
    return workouts.find(w => w.status === 'upcoming') || null;
}
