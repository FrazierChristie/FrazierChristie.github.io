// js/services/syncService.js — Strava sync and data import

import { fetchAllActivities, fetchAthleteData } from '../api.js';
import { isStravaConnected } from '../auth.js';
import { dbPut, dbGetAll, dbPutMany, generateId } from '../db.js';
import { formatDateISO } from '../utils.js';
import { calculateWorkoutTSS } from '../engines/fitnessScores.js';

// Sync all Strava activities into local DB
export async function syncStravaActivities(forceRefresh = false) {
    if (!isStravaConnected()) return { synced: 0, message: 'Not connected to Strava' };

    const activities = await fetchAllActivities(forceRefresh);
    const existing = await dbGetAll('stravaActivities');
    const existingIds = new Set(existing.map(a => String(a.stravaId)));

    let synced = 0;
    for (const activity of activities) {
        if (existingIds.has(String(activity.id))) continue;

        const record = {
            id: generateId(),
            stravaId: String(activity.id),
            date: formatDateISO(activity.start_date_local || activity.start_date),
            type: activity.type || activity.sport_type || 'Run',
            name: activity.name,
            distance: activity.distance || 0,
            duration: activity.moving_time || activity.elapsed_time || 0,
            elevation: activity.total_elevation_gain || 0,
            averageHeartrate: activity.average_heartrate || null,
            maxHeartrate: activity.max_heartrate || null,
            averageSpeed: activity.average_speed || null,
            maxSpeed: activity.max_speed || null,
            calories: activity.calories || null,
            gearId: activity.gear_id || null,
            kudos: activity.kudos_count || 0,
            source: 'strava'
        };

        // Calculate pace for running activities
        if (record.distance > 0 && record.duration > 0) {
            record.pacePerKm = record.duration / (record.distance / 1000);
        }

        await dbPut('stravaActivities', record);

        // Also create a completed workout entry for fitness tracking
        const workout = {
            id: generateId(),
            type: 'cardio',
            activityType: record.type,
            date: record.date,
            distance: record.distance,
            duration: record.duration,
            averageHeartrate: record.averageHeartrate,
            maxHeartrate: record.maxHeartrate,
            elevation: record.elevation,
            overallRPE: estimateRPEFromHR(record.averageHeartrate, record.maxHeartrate),
            notes: `Synced from Strava: ${record.name}`,
            source: 'strava',
            stravaId: record.stravaId,
            createdAt: new Date().toISOString()
        };
        workout.trainingLoad = calculateWorkoutTSS(workout);

        await dbPut('completedWorkouts', workout);
        synced++;
    }

    // Also sync athlete profile
    try {
        const athlete = await fetchAthleteData();
        if (athlete) {
            await dbPut('profile', {
                id: 'strava',
                name: `${athlete.firstname} ${athlete.lastname}`,
                stravaId: athlete.id,
                city: athlete.city,
                country: athlete.country,
                profileImage: athlete.profile_medium || athlete.profile,
                updatedAt: new Date().toISOString()
            });
        }
    } catch (e) {
        console.warn('Failed to sync athlete profile:', e);
    }

    return { synced, message: `Synced ${synced} new activities from Strava` };
}

function estimateRPEFromHR(avgHR, maxHR) {
    if (!avgHR || !maxHR) return 5;
    const pctMax = avgHR / maxHR;
    if (pctMax > 0.92) return 9;
    if (pctMax > 0.85) return 8;
    if (pctMax > 0.78) return 7;
    if (pctMax > 0.70) return 6;
    if (pctMax > 0.60) return 5;
    return 4;
}

// Sync gear distance from Strava activities
export async function syncGearStats() {
    const activities = await dbGetAll('stravaActivities');
    const gearStats = {};

    activities.forEach(a => {
        if (!a.gearId) return;
        if (!gearStats[a.gearId]) gearStats[a.gearId] = { totalDistance: 0, totalActivities: 0 };
        gearStats[a.gearId].totalDistance += a.distance || 0;
        gearStats[a.gearId].totalActivities++;
    });

    const gear = await dbGetAll('gear');
    for (const g of gear) {
        if (g.stravaGearId && gearStats[g.stravaGearId]) {
            g.totalDistance = gearStats[g.stravaGearId].totalDistance;
            g.totalActivities = gearStats[g.stravaGearId].totalActivities;
            await dbPut('gear', g);
        }
    }

    return gearStats;
}
