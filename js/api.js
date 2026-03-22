// js/api.js — Strava API client with caching

import { getAuthPayload } from './auth.js';

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCached(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const { data, timestamp } = JSON.parse(raw);
        if (Date.now() - timestamp > CACHE_TTL) {
            localStorage.removeItem(key);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

function setCache(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) {
        console.warn('Cache write failed:', e);
    }
}

function updateTokensIfNeeded(tokens) {
    if (tokens) {
        localStorage.setItem('strava_tokens', JSON.stringify(tokens));
    }
}

export async function fetchAllActivities(forceRefresh = false) {
    if (!forceRefresh) {
        const cached = getCached('cache_activities');
        if (cached) return cached;
    }

    const payload = getAuthPayload();
    if (!payload) throw new Error('Not authenticated');

    const response = await fetch('/api/strava-activities', {
        headers: { Authorization: `Bearer ${payload}` }
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch activities');
    }

    const { activities, tokens } = await response.json();
    updateTokensIfNeeded(tokens);
    setCache('cache_activities', activities);
    return activities;
}

export async function fetchActivity(id) {
    const cacheKey = `cache_activity_${id}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const payload = getAuthPayload();
    if (!payload) throw new Error('Not authenticated');

    const response = await fetch(`/api/strava-activity?id=${id}`, {
        headers: { Authorization: `Bearer ${payload}` }
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch activity');
    }

    const { activity, tokens } = await response.json();
    updateTokensIfNeeded(tokens);
    setCache(cacheKey, activity);
    return activity;
}

export async function fetchAthleteData() {
    const cached = getCached('cache_athlete');
    if (cached) return cached;

    const payload = getAuthPayload();
    if (!payload) throw new Error('Not authenticated');

    const response = await fetch('/api/strava-athlete', {
        headers: { Authorization: `Bearer ${payload}` }
    });

    if (!response.ok) throw new Error('Failed to fetch athlete');

    const { athlete, tokens } = await response.json();
    updateTokensIfNeeded(tokens);
    setCache('cache_athlete', athlete);
    return athlete;
}

export async function fetchGearById(gearId) {
    const cacheKey = `cache_gear_${gearId}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const payload = getAuthPayload();
    if (!payload) throw new Error('Not authenticated');

    const response = await fetch(`/api/strava-gear?id=${gearId}`, {
        headers: { Authorization: `Bearer ${payload}` }
    });

    if (!response.ok) throw new Error('Failed to fetch gear');

    const { gear, tokens } = await response.json();
    updateTokensIfNeeded(tokens);
    setCache(cacheKey, gear);
    return gear;
}
