// js/engines/readinessEngine.js — Readiness scoring from health metrics

import { dbGetAll, dbGetByRange, dbPut, generateId } from '../db.js';
import { formatDateISO } from '../utils.js';

// Calculate readiness score (0-100) from multiple inputs
export function calculateReadinessScore({ hrv, restingHR, sleepTotal, sleepScore, tsb, baselineHRV, baselineRestingHR }) {
    let score = 50; // Start neutral
    const factors = [];

    // HRV factor (most important — 30% weight)
    if (hrv && baselineHRV) {
        const hrvRatio = hrv / baselineHRV;
        if (hrvRatio > 1.1) { score += 15; factors.push({ name: 'HRV', impact: 'positive', detail: 'Above baseline' }); }
        else if (hrvRatio > 0.95) { score += 8; factors.push({ name: 'HRV', impact: 'neutral', detail: 'Near baseline' }); }
        else if (hrvRatio > 0.8) { score -= 5; factors.push({ name: 'HRV', impact: 'warning', detail: 'Below baseline' }); }
        else { score -= 15; factors.push({ name: 'HRV', impact: 'negative', detail: 'Significantly below baseline' }); }
    }

    // Resting HR factor (20% weight)
    if (restingHR && baselineRestingHR) {
        const hrDiff = restingHR - baselineRestingHR;
        if (hrDiff < -2) { score += 10; factors.push({ name: 'Resting HR', impact: 'positive', detail: 'Lower than usual' }); }
        else if (hrDiff < 3) { score += 5; factors.push({ name: 'Resting HR', impact: 'neutral', detail: 'Normal' }); }
        else if (hrDiff < 7) { score -= 5; factors.push({ name: 'Resting HR', impact: 'warning', detail: 'Elevated' }); }
        else { score -= 15; factors.push({ name: 'Resting HR', impact: 'negative', detail: 'Significantly elevated' }); }
    }

    // Sleep factor (25% weight)
    if (sleepTotal) {
        const sleepHours = sleepTotal;
        if (sleepHours >= 8) { score += 12; factors.push({ name: 'Sleep', impact: 'positive', detail: `${sleepHours.toFixed(1)}h — Excellent` }); }
        else if (sleepHours >= 7) { score += 6; factors.push({ name: 'Sleep', impact: 'neutral', detail: `${sleepHours.toFixed(1)}h — Good` }); }
        else if (sleepHours >= 6) { score -= 5; factors.push({ name: 'Sleep', impact: 'warning', detail: `${sleepHours.toFixed(1)}h — Below optimal` }); }
        else { score -= 12; factors.push({ name: 'Sleep', impact: 'negative', detail: `${sleepHours.toFixed(1)}h — Poor` }); }
    }

    if (sleepScore) {
        const adjustment = (sleepScore - 70) / 10;
        score += adjustment;
    }

    // Training load factor (25% weight — from TSB)
    if (tsb !== undefined) {
        if (tsb > 15) { score += 12; factors.push({ name: 'Training Load', impact: 'positive', detail: 'Well rested' }); }
        else if (tsb > 0) { score += 6; factors.push({ name: 'Training Load', impact: 'neutral', detail: 'Fresh' }); }
        else if (tsb > -15) { score -= 3; factors.push({ name: 'Training Load', impact: 'warning', detail: 'Accumulated fatigue' }); }
        else { score -= 12; factors.push({ name: 'Training Load', impact: 'negative', detail: 'High fatigue' }); }
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    let recommendation;
    if (score >= 80) recommendation = 'High intensity day — go hard';
    else if (score >= 60) recommendation = 'Normal training — follow the plan';
    else if (score >= 40) recommendation = 'Reduce intensity — easy session recommended';
    else recommendation = 'Rest day recommended — recovery priority';

    return { score, factors, recommendation };
}

// Get baseline values from recent history (rolling 28-day average)
export async function getBaselines() {
    const metrics = await dbGetAll('healthMetrics');
    if (metrics.length === 0) return { baselineHRV: null, baselineRestingHR: null };

    const recent = metrics
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 28);

    const hrvValues = recent.filter(m => m.hrv).map(m => m.hrv);
    const hrValues = recent.filter(m => m.restingHR).map(m => m.restingHR);

    return {
        baselineHRV: hrvValues.length > 0 ? hrvValues.reduce((a, b) => a + b) / hrvValues.length : null,
        baselineRestingHR: hrValues.length > 0 ? hrValues.reduce((a, b) => a + b) / hrValues.length : null
    };
}

// Save a daily health metric
export async function saveHealthMetric(data) {
    const metric = {
        id: generateId(),
        date: data.date || formatDateISO(new Date()),
        source: data.source || 'manual',
        sleepTotal: data.sleepTotal || null,
        sleepDeep: data.sleepDeep || null,
        sleepREM: data.sleepREM || null,
        sleepScore: data.sleepScore || null,
        hrv: data.hrv || null,
        restingHR: data.restingHR || null,
        readinessScore: data.readinessScore || null,
        notes: data.notes || ''
    };

    await dbPut('healthMetrics', metric);
    return metric;
}

// Parse Apple Health XML export
export function parseAppleHealthXML(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');
    const records = doc.querySelectorAll('Record');
    const metrics = {};

    records.forEach(record => {
        const type = record.getAttribute('type');
        const value = parseFloat(record.getAttribute('value'));
        const date = record.getAttribute('startDate')?.substring(0, 10);
        if (!date || isNaN(value)) return;

        if (!metrics[date]) metrics[date] = { date, source: 'appleHealth' };

        switch (type) {
            case 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN':
                metrics[date].hrv = value;
                break;
            case 'HKQuantityTypeIdentifierRestingHeartRate':
                metrics[date].restingHR = value;
                break;
            case 'HKCategoryTypeIdentifierSleepAnalysis':
                // Sleep duration in hours
                const start = new Date(record.getAttribute('startDate'));
                const end = new Date(record.getAttribute('endDate'));
                const hours = (end - start) / (1000 * 60 * 60);
                if (!metrics[date].sleepTotal) metrics[date].sleepTotal = 0;
                metrics[date].sleepTotal += hours;
                break;
        }
    });

    return Object.values(metrics);
}

// Parse Health Auto Export CSV
export function parseHealthCSV(csvString) {
    const lines = csvString.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const metrics = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const entry = { source: 'appleHealth' };

        headers.forEach((header, idx) => {
            const val = values[idx]?.trim();
            if (header.includes('date')) entry.date = val?.substring(0, 10);
            if (header.includes('hrv')) entry.hrv = parseFloat(val) || null;
            if (header.includes('resting') && header.includes('heart')) entry.restingHR = parseFloat(val) || null;
            if (header.includes('sleep') && header.includes('total')) entry.sleepTotal = parseFloat(val) || null;
            if (header.includes('sleep') && header.includes('deep')) entry.sleepDeep = parseFloat(val) || null;
            if (header.includes('sleep') && header.includes('rem')) entry.sleepREM = parseFloat(val) || null;
        });

        if (entry.date) metrics.push(entry);
    }

    return metrics;
}
