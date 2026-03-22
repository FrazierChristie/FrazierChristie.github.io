// data/exercises.js — Exercise library (~150 exercises)

export const MUSCLE_GROUPS = [
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
    'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Forearms'
];

export const MOVEMENT_PATTERNS = [
    'Horizontal Push', 'Horizontal Pull', 'Vertical Push', 'Vertical Pull',
    'Squat', 'Hip Hinge', 'Lunge', 'Carry', 'Isolation', 'Core'
];

export const CATEGORIES = [
    'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Kettlebell', 'Band'
];

export const EXERCISES = [
    // CHEST
    { id: 'bench-press', name: 'Bench Press', category: 'Barbell', muscleGroup: 'Chest', muscles: ['Chest', 'Triceps', 'Shoulders'], pattern: 'Horizontal Push' },
    { id: 'incline-bench', name: 'Incline Bench Press', category: 'Barbell', muscleGroup: 'Chest', muscles: ['Chest', 'Shoulders', 'Triceps'], pattern: 'Horizontal Push' },
    { id: 'decline-bench', name: 'Decline Bench Press', category: 'Barbell', muscleGroup: 'Chest', muscles: ['Chest', 'Triceps'], pattern: 'Horizontal Push' },
    { id: 'db-bench', name: 'Dumbbell Bench Press', category: 'Dumbbell', muscleGroup: 'Chest', muscles: ['Chest', 'Triceps', 'Shoulders'], pattern: 'Horizontal Push' },
    { id: 'db-incline-bench', name: 'Dumbbell Incline Bench Press', category: 'Dumbbell', muscleGroup: 'Chest', muscles: ['Chest', 'Shoulders'], pattern: 'Horizontal Push' },
    { id: 'db-fly', name: 'Dumbbell Fly', category: 'Dumbbell', muscleGroup: 'Chest', muscles: ['Chest'], pattern: 'Isolation' },
    { id: 'cable-fly', name: 'Cable Fly', category: 'Cable', muscleGroup: 'Chest', muscles: ['Chest'], pattern: 'Isolation' },
    { id: 'push-up', name: 'Push-Up', category: 'Bodyweight', muscleGroup: 'Chest', muscles: ['Chest', 'Triceps', 'Shoulders'], pattern: 'Horizontal Push' },
    { id: 'dip', name: 'Dip', category: 'Bodyweight', muscleGroup: 'Chest', muscles: ['Chest', 'Triceps', 'Shoulders'], pattern: 'Horizontal Push' },
    { id: 'chest-press-machine', name: 'Chest Press Machine', category: 'Machine', muscleGroup: 'Chest', muscles: ['Chest', 'Triceps'], pattern: 'Horizontal Push' },
    { id: 'pec-deck', name: 'Pec Deck', category: 'Machine', muscleGroup: 'Chest', muscles: ['Chest'], pattern: 'Isolation' },

    // BACK
    { id: 'deadlift', name: 'Deadlift', category: 'Barbell', muscleGroup: 'Back', muscles: ['Back', 'Hamstrings', 'Glutes', 'Core'], pattern: 'Hip Hinge' },
    { id: 'barbell-row', name: 'Barbell Row', category: 'Barbell', muscleGroup: 'Back', muscles: ['Back', 'Biceps'], pattern: 'Horizontal Pull' },
    { id: 'pendlay-row', name: 'Pendlay Row', category: 'Barbell', muscleGroup: 'Back', muscles: ['Back', 'Biceps'], pattern: 'Horizontal Pull' },
    { id: 'db-row', name: 'Dumbbell Row', category: 'Dumbbell', muscleGroup: 'Back', muscles: ['Back', 'Biceps'], pattern: 'Horizontal Pull' },
    { id: 'pull-up', name: 'Pull-Up', category: 'Bodyweight', muscleGroup: 'Back', muscles: ['Back', 'Biceps'], pattern: 'Vertical Pull' },
    { id: 'chin-up', name: 'Chin-Up', category: 'Bodyweight', muscleGroup: 'Back', muscles: ['Back', 'Biceps'], pattern: 'Vertical Pull' },
    { id: 'lat-pulldown', name: 'Lat Pulldown', category: 'Cable', muscleGroup: 'Back', muscles: ['Back', 'Biceps'], pattern: 'Vertical Pull' },
    { id: 'cable-row', name: 'Seated Cable Row', category: 'Cable', muscleGroup: 'Back', muscles: ['Back', 'Biceps'], pattern: 'Horizontal Pull' },
    { id: 't-bar-row', name: 'T-Bar Row', category: 'Barbell', muscleGroup: 'Back', muscles: ['Back', 'Biceps'], pattern: 'Horizontal Pull' },
    { id: 'face-pull', name: 'Face Pull', category: 'Cable', muscleGroup: 'Back', muscles: ['Back', 'Shoulders'], pattern: 'Horizontal Pull' },
    { id: 'rack-pull', name: 'Rack Pull', category: 'Barbell', muscleGroup: 'Back', muscles: ['Back', 'Glutes'], pattern: 'Hip Hinge' },

    // SHOULDERS
    { id: 'ohp', name: 'Overhead Press', category: 'Barbell', muscleGroup: 'Shoulders', muscles: ['Shoulders', 'Triceps'], pattern: 'Vertical Push' },
    { id: 'db-ohp', name: 'Dumbbell Shoulder Press', category: 'Dumbbell', muscleGroup: 'Shoulders', muscles: ['Shoulders', 'Triceps'], pattern: 'Vertical Push' },
    { id: 'arnold-press', name: 'Arnold Press', category: 'Dumbbell', muscleGroup: 'Shoulders', muscles: ['Shoulders'], pattern: 'Vertical Push' },
    { id: 'lateral-raise', name: 'Lateral Raise', category: 'Dumbbell', muscleGroup: 'Shoulders', muscles: ['Shoulders'], pattern: 'Isolation' },
    { id: 'front-raise', name: 'Front Raise', category: 'Dumbbell', muscleGroup: 'Shoulders', muscles: ['Shoulders'], pattern: 'Isolation' },
    { id: 'rear-delt-fly', name: 'Rear Delt Fly', category: 'Dumbbell', muscleGroup: 'Shoulders', muscles: ['Shoulders', 'Back'], pattern: 'Isolation' },
    { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', category: 'Cable', muscleGroup: 'Shoulders', muscles: ['Shoulders'], pattern: 'Isolation' },
    { id: 'push-press', name: 'Push Press', category: 'Barbell', muscleGroup: 'Shoulders', muscles: ['Shoulders', 'Triceps', 'Quads'], pattern: 'Vertical Push' },
    { id: 'upright-row', name: 'Upright Row', category: 'Barbell', muscleGroup: 'Shoulders', muscles: ['Shoulders', 'Biceps'], pattern: 'Vertical Pull' },
    { id: 'shoulder-press-machine', name: 'Shoulder Press Machine', category: 'Machine', muscleGroup: 'Shoulders', muscles: ['Shoulders', 'Triceps'], pattern: 'Vertical Push' },

    // BICEPS
    { id: 'barbell-curl', name: 'Barbell Curl', category: 'Barbell', muscleGroup: 'Biceps', muscles: ['Biceps'], pattern: 'Isolation' },
    { id: 'db-curl', name: 'Dumbbell Curl', category: 'Dumbbell', muscleGroup: 'Biceps', muscles: ['Biceps'], pattern: 'Isolation' },
    { id: 'hammer-curl', name: 'Hammer Curl', category: 'Dumbbell', muscleGroup: 'Biceps', muscles: ['Biceps', 'Forearms'], pattern: 'Isolation' },
    { id: 'preacher-curl', name: 'Preacher Curl', category: 'Barbell', muscleGroup: 'Biceps', muscles: ['Biceps'], pattern: 'Isolation' },
    { id: 'cable-curl', name: 'Cable Curl', category: 'Cable', muscleGroup: 'Biceps', muscles: ['Biceps'], pattern: 'Isolation' },
    { id: 'incline-curl', name: 'Incline Dumbbell Curl', category: 'Dumbbell', muscleGroup: 'Biceps', muscles: ['Biceps'], pattern: 'Isolation' },
    { id: 'concentration-curl', name: 'Concentration Curl', category: 'Dumbbell', muscleGroup: 'Biceps', muscles: ['Biceps'], pattern: 'Isolation' },

    // TRICEPS
    { id: 'close-grip-bench', name: 'Close Grip Bench Press', category: 'Barbell', muscleGroup: 'Triceps', muscles: ['Triceps', 'Chest'], pattern: 'Horizontal Push' },
    { id: 'tricep-pushdown', name: 'Tricep Pushdown', category: 'Cable', muscleGroup: 'Triceps', muscles: ['Triceps'], pattern: 'Isolation' },
    { id: 'overhead-extension', name: 'Overhead Tricep Extension', category: 'Dumbbell', muscleGroup: 'Triceps', muscles: ['Triceps'], pattern: 'Isolation' },
    { id: 'skull-crusher', name: 'Skull Crusher', category: 'Barbell', muscleGroup: 'Triceps', muscles: ['Triceps'], pattern: 'Isolation' },
    { id: 'tricep-dip', name: 'Tricep Dip', category: 'Bodyweight', muscleGroup: 'Triceps', muscles: ['Triceps', 'Chest'], pattern: 'Horizontal Push' },
    { id: 'kickback', name: 'Tricep Kickback', category: 'Dumbbell', muscleGroup: 'Triceps', muscles: ['Triceps'], pattern: 'Isolation' },

    // QUADS
    { id: 'squat', name: 'Barbell Back Squat', category: 'Barbell', muscleGroup: 'Quads', muscles: ['Quads', 'Glutes', 'Core'], pattern: 'Squat' },
    { id: 'front-squat', name: 'Front Squat', category: 'Barbell', muscleGroup: 'Quads', muscles: ['Quads', 'Core'], pattern: 'Squat' },
    { id: 'goblet-squat', name: 'Goblet Squat', category: 'Dumbbell', muscleGroup: 'Quads', muscles: ['Quads', 'Glutes'], pattern: 'Squat' },
    { id: 'leg-press', name: 'Leg Press', category: 'Machine', muscleGroup: 'Quads', muscles: ['Quads', 'Glutes'], pattern: 'Squat' },
    { id: 'leg-extension', name: 'Leg Extension', category: 'Machine', muscleGroup: 'Quads', muscles: ['Quads'], pattern: 'Isolation' },
    { id: 'hack-squat', name: 'Hack Squat', category: 'Machine', muscleGroup: 'Quads', muscles: ['Quads', 'Glutes'], pattern: 'Squat' },
    { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', category: 'Dumbbell', muscleGroup: 'Quads', muscles: ['Quads', 'Glutes'], pattern: 'Lunge' },
    { id: 'walking-lunge', name: 'Walking Lunge', category: 'Dumbbell', muscleGroup: 'Quads', muscles: ['Quads', 'Glutes'], pattern: 'Lunge' },
    { id: 'step-up', name: 'Step Up', category: 'Dumbbell', muscleGroup: 'Quads', muscles: ['Quads', 'Glutes'], pattern: 'Lunge' },

    // HAMSTRINGS
    { id: 'rdl', name: 'Romanian Deadlift', category: 'Barbell', muscleGroup: 'Hamstrings', muscles: ['Hamstrings', 'Glutes', 'Back'], pattern: 'Hip Hinge' },
    { id: 'db-rdl', name: 'Dumbbell Romanian Deadlift', category: 'Dumbbell', muscleGroup: 'Hamstrings', muscles: ['Hamstrings', 'Glutes'], pattern: 'Hip Hinge' },
    { id: 'leg-curl', name: 'Leg Curl', category: 'Machine', muscleGroup: 'Hamstrings', muscles: ['Hamstrings'], pattern: 'Isolation' },
    { id: 'nordic-curl', name: 'Nordic Hamstring Curl', category: 'Bodyweight', muscleGroup: 'Hamstrings', muscles: ['Hamstrings'], pattern: 'Isolation' },
    { id: 'good-morning', name: 'Good Morning', category: 'Barbell', muscleGroup: 'Hamstrings', muscles: ['Hamstrings', 'Back'], pattern: 'Hip Hinge' },
    { id: 'stiff-leg-dl', name: 'Stiff Leg Deadlift', category: 'Barbell', muscleGroup: 'Hamstrings', muscles: ['Hamstrings', 'Glutes', 'Back'], pattern: 'Hip Hinge' },

    // GLUTES
    { id: 'hip-thrust', name: 'Hip Thrust', category: 'Barbell', muscleGroup: 'Glutes', muscles: ['Glutes', 'Hamstrings'], pattern: 'Hip Hinge' },
    { id: 'glute-bridge', name: 'Glute Bridge', category: 'Bodyweight', muscleGroup: 'Glutes', muscles: ['Glutes'], pattern: 'Hip Hinge' },
    { id: 'cable-kickback', name: 'Cable Kickback', category: 'Cable', muscleGroup: 'Glutes', muscles: ['Glutes'], pattern: 'Isolation' },
    { id: 'sumo-deadlift', name: 'Sumo Deadlift', category: 'Barbell', muscleGroup: 'Glutes', muscles: ['Glutes', 'Quads', 'Back'], pattern: 'Hip Hinge' },

    // CALVES
    { id: 'standing-calf-raise', name: 'Standing Calf Raise', category: 'Machine', muscleGroup: 'Calves', muscles: ['Calves'], pattern: 'Isolation' },
    { id: 'seated-calf-raise', name: 'Seated Calf Raise', category: 'Machine', muscleGroup: 'Calves', muscles: ['Calves'], pattern: 'Isolation' },

    // CORE
    { id: 'plank', name: 'Plank', category: 'Bodyweight', muscleGroup: 'Core', muscles: ['Core'], pattern: 'Core' },
    { id: 'ab-wheel', name: 'Ab Wheel Rollout', category: 'Bodyweight', muscleGroup: 'Core', muscles: ['Core'], pattern: 'Core' },
    { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', category: 'Bodyweight', muscleGroup: 'Core', muscles: ['Core'], pattern: 'Core' },
    { id: 'cable-crunch', name: 'Cable Crunch', category: 'Cable', muscleGroup: 'Core', muscles: ['Core'], pattern: 'Core' },
    { id: 'russian-twist', name: 'Russian Twist', category: 'Bodyweight', muscleGroup: 'Core', muscles: ['Core'], pattern: 'Core' },
    { id: 'pallof-press', name: 'Pallof Press', category: 'Cable', muscleGroup: 'Core', muscles: ['Core'], pattern: 'Core' },
    { id: 'dead-bug', name: 'Dead Bug', category: 'Bodyweight', muscleGroup: 'Core', muscles: ['Core'], pattern: 'Core' },
    { id: 'side-plank', name: 'Side Plank', category: 'Bodyweight', muscleGroup: 'Core', muscles: ['Core'], pattern: 'Core' },

    // COMPOUND / FULL BODY
    { id: 'clean', name: 'Power Clean', category: 'Barbell', muscleGroup: 'Back', muscles: ['Back', 'Shoulders', 'Quads', 'Glutes'], pattern: 'Hip Hinge' },
    { id: 'snatch', name: 'Snatch', category: 'Barbell', muscleGroup: 'Back', muscles: ['Back', 'Shoulders', 'Quads'], pattern: 'Hip Hinge' },
    { id: 'thruster', name: 'Thruster', category: 'Barbell', muscleGroup: 'Quads', muscles: ['Quads', 'Shoulders', 'Core'], pattern: 'Squat' },
    { id: 'kb-swing', name: 'Kettlebell Swing', category: 'Kettlebell', muscleGroup: 'Glutes', muscles: ['Glutes', 'Hamstrings', 'Core'], pattern: 'Hip Hinge' },
    { id: 'kb-clean-press', name: 'Kettlebell Clean & Press', category: 'Kettlebell', muscleGroup: 'Shoulders', muscles: ['Shoulders', 'Back', 'Core'], pattern: 'Vertical Push' },
    { id: 'farmers-carry', name: 'Farmer\'s Carry', category: 'Dumbbell', muscleGroup: 'Core', muscles: ['Core', 'Forearms', 'Back'], pattern: 'Carry' },
    { id: 'turkish-getup', name: 'Turkish Get-Up', category: 'Kettlebell', muscleGroup: 'Core', muscles: ['Core', 'Shoulders'], pattern: 'Core' },

    // FOREARMS
    { id: 'wrist-curl', name: 'Wrist Curl', category: 'Barbell', muscleGroup: 'Forearms', muscles: ['Forearms'], pattern: 'Isolation' },
    { id: 'reverse-curl', name: 'Reverse Curl', category: 'Barbell', muscleGroup: 'Forearms', muscles: ['Forearms', 'Biceps'], pattern: 'Isolation' },
];

export function getExerciseById(id) {
    return EXERCISES.find(e => e.id === id);
}

export function getExercisesByMuscle(muscleGroup) {
    return EXERCISES.filter(e => e.muscleGroup === muscleGroup || e.muscles.includes(muscleGroup));
}

export function getExercisesByCategory(category) {
    return EXERCISES.filter(e => e.category === category);
}

export function getExercisesByPattern(pattern) {
    return EXERCISES.filter(e => e.pattern === pattern);
}

export function searchExercises(query) {
    const q = query.toLowerCase();
    return EXERCISES.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.muscleGroup.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    );
}
