// js/services/llmService.js — Claude API integration for AI-powered training plans

const API_URL = 'https://api.anthropic.com/v1/messages';

export function getApiKey() {
    return localStorage.getItem('fitcoach_anthropic_key') || '';
}

export function setApiKey(key) {
    if (key) {
        localStorage.setItem('fitcoach_anthropic_key', key.trim());
    } else {
        localStorage.removeItem('fitcoach_anthropic_key');
    }
}

export function hasApiKey() {
    return !!getApiKey();
}

export async function generatePlanWithLLM(goal, profile, exerciseList) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('No API key configured. Add your Anthropic API key in Settings.');

    const today = new Date().toISOString().substring(0, 10);
    const totalWeeks = Math.max(4, Math.ceil(
        (new Date(goal.targetDate) - new Date()) / (7 * 24 * 60 * 60 * 1000)
    ));

    const prompt = buildPlanPrompt(goal, profile, exerciseList, today, totalWeeks);

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8192,
            messages: [{ role: 'user', content: prompt }]
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 401) throw new Error('Invalid API key. Check your key in Settings.');
        throw new Error(err.error?.message || `API error (${response.status})`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    return parsePlanResponse(text, goal, today);
}

function buildPlanPrompt(goal, profile, exerciseList, today, totalWeeks) {
    const exerciseNames = exerciseList.map(e => `${e.id}: ${e.name} (${e.category}, ${e.muscleGroup})`).join('\n');

    return `You are an expert strength & conditioning coach and running coach. Generate a detailed ${totalWeeks}-week training plan.

ATHLETE PROFILE:
- Experience level: ${profile.experienceLevel || 'intermediate'}
- Training days per week: ${profile.trainingDays || 4}
- Current weekly running distance: ${profile.currentWeeklyDistance || 20}km
${profile.weight ? `- Weight: ${profile.weight}kg` : ''}
${profile.age ? `- Age: ${profile.age}` : ''}

GOAL:
- Type: ${goal.type}
- Description: ${goal.description || 'General fitness improvement'}
- Target date: ${goal.targetDate}
- Start date: ${today}
- Total weeks: ${totalWeeks}

AVAILABLE EXERCISES (use these exact IDs):
${exerciseNames}

Generate the plan as a JSON array of workout objects. Each workout must have:
- "date": ISO date string (YYYY-MM-DD), starting from ${today}, scheduled on appropriate days of the week
- "type": "strength" or "cardio"
- "description": brief workout title (e.g. "Upper Push — Hypertrophy", "Easy Run", "Tempo Intervals")
- "week": week number (1-indexed)

For strength workouts, include "exercises" array with:
- "exerciseId": from the available exercises list
- "name": exercise name
- "targetSets": number
- "targetReps": string like "8-10" or "5"
- "targetRPE": string like "7-8"

For cardio workouts, include "cardioTarget" with:
- "type": "Easy Run", "Long Run", "Tempo Run", "Interval Session", etc.
- "distance": number in km
- "description": coaching notes for the session
- "zone": "easy", "tempo", or "interval"

COACHING PRINCIPLES to follow:
- Use proper periodisation (linear for beginners, undulating/block for intermediate+)
- Include deload weeks every 3-4 weeks
- Don't increase running volume more than 10% per week
- Avoid scheduling heavy legs adjacent to hard runs
- Balance push/pull/legs volume
- Progress from higher volume/lower intensity to lower volume/higher intensity as the target date approaches
- Include warm-up sets for main compounds
- Adjust everything to match the athlete's experience level

Return ONLY the JSON array, no other text. Start with [ and end with ].`;
}

function parsePlanResponse(text, goal, startDate) {
    // Extract JSON from the response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Failed to parse plan from AI response');

    let workouts;
    try {
        workouts = JSON.parse(jsonMatch[0]);
    } catch (e) {
        throw new Error('AI returned invalid JSON. Please try again.');
    }

    if (!Array.isArray(workouts) || workouts.length === 0) {
        throw new Error('AI returned an empty plan. Please try again.');
    }

    // Validate and normalise each workout
    return workouts.map(w => ({
        date: w.date,
        type: w.type || 'strength',
        description: w.description || 'Training Session',
        week: w.week || 1,
        status: 'upcoming',
        exercises: w.exercises || undefined,
        cardioTarget: w.cardioTarget || undefined
    }));
}
