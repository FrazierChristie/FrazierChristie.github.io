// js/pages/health.js — Health & readiness page logic
import { registerPage, showToast, showLoading, hideLoading } from '../ui.js';
import { calculateReadinessScore, getBaselines, saveHealthMetric, parseAppleHealthXML, parseHealthCSV } from '../engines/readinessEngine.js';
import { dbGetAll, dbPutMany } from '../db.js';
import { formatDateISO } from '../utils.js';
import { getCurrentFitnessState } from '../engines/fitnessScores.js';

export function initHealthPage() {
    registerPage('health', loadHealthPage);
}

async function loadHealthPage() {
    await loadReadinessScore();
}

async function loadReadinessScore() {
    try {
        const healthMetrics = await dbGetAll('healthMetrics');
        const fitnessScores = await dbGetAll('fitnessScores');
        const baselines = await getBaselines();

        const scoreEl = document.getElementById('readiness-score-value');
        const recEl = document.getElementById('readiness-recommendation');
        const factorsEl = document.getElementById('readiness-factors');
        const circleEl = document.getElementById('readiness-circle');
        const badgeEl = document.getElementById('readiness-badge');
        const badgeValueEl = document.getElementById('readiness-value');

        if (healthMetrics.length === 0) {
            if (scoreEl) scoreEl.textContent = '--';
            if (recEl) recEl.textContent = 'Log health data to see readiness';
            return;
        }

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

        if (scoreEl) scoreEl.textContent = readiness.score;
        if (recEl) recEl.textContent = readiness.recommendation;

        // Color the circle based on score
        if (circleEl) {
            const color = readiness.score >= 70 ? '#22c55e' : readiness.score >= 50 ? '#f59e0b' : '#ef4444';
            circleEl.style.borderColor = color;
        }

        // Update top-bar badge
        if (badgeEl) badgeEl.classList.remove('hidden');
        if (badgeValueEl) badgeValueEl.textContent = readiness.score;

        // Render factors
        if (factorsEl) {
            factorsEl.innerHTML = readiness.factors.map(f =>
                `<div class="readiness-factor factor-${f.impact}">
                    <span class="factor-name">${f.name}</span>
                    <span class="factor-detail">${f.detail}</span>
                </div>`
            ).join('');
        }
    } catch (e) {
        console.warn('Failed to load readiness:', e);
    }
}

export async function saveHealthData() {
    const sleep = document.getElementById('health-sleep')?.value;
    const hrv = document.getElementById('health-hrv')?.value;
    const rhr = document.getElementById('health-rhr')?.value;
    const quality = document.getElementById('health-quality')?.value;

    if (!sleep && !hrv && !rhr) {
        showToast('Enter at least one health metric', 'warning');
        return;
    }

    try {
        await saveHealthMetric({
            date: formatDateISO(new Date()),
            sleepTotal: parseFloat(sleep) || null,
            hrv: parseInt(hrv) || null,
            restingHR: parseInt(rhr) || null,
            sleepScore: parseInt(quality) ? parseInt(quality) * 10 : null,
            source: 'manual'
        });

        showToast('Health data saved!', 'success');
        ['health-sleep', 'health-hrv', 'health-rhr', 'health-quality'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        await loadReadinessScore();
    } catch (e) {
        showToast('Failed to save: ' + e.message, 'error');
    }
}

export async function importHealthData(event) {
    const file = event.target.files[0];
    if (!file) return;

    showLoading('Importing health data...');

    try {
        const text = await file.text();
        let metrics;

        if (file.name.endsWith('.xml')) {
            metrics = parseAppleHealthXML(text);
        } else if (file.name.endsWith('.csv')) {
            metrics = parseHealthCSV(text);
        } else {
            throw new Error('Unsupported file type. Use .xml or .csv');
        }

        if (metrics.length === 0) {
            hideLoading();
            showToast('No health data found in file', 'warning');
            return;
        }

        // Save each metric
        for (const m of metrics) {
            await saveHealthMetric(m);
        }

        hideLoading();
        showToast(`Imported ${metrics.length} health records`, 'success');
        await loadReadinessScore();
    } catch (e) {
        hideLoading();
        showToast('Import failed: ' + e.message, 'error');
    }

    // Reset file input
    event.target.value = '';
}
