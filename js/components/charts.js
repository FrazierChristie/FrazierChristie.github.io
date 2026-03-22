// js/components/charts.js — Chart.js wrapper for all analytics charts

import { formatDateShort, formatPace } from '../utils.js';

let chartInstances = {};

function destroyChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        delete chartInstances[id];
    }
}

const COLORS = {
    primary: '#ffffff',
    secondary: '#999999',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
    muted: '#666666',
    gridColor: 'rgba(255, 255, 255, 0.06)',
    textColor: '#999999'
};

const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: COLORS.textColor, font: { size: 11 } } } },
    scales: {
        x: { ticks: { color: COLORS.textColor, font: { size: 10 } }, grid: { color: COLORS.gridColor } },
        y: { ticks: { color: COLORS.textColor, font: { size: 10 } }, grid: { color: COLORS.gridColor } }
    }
};

// Fitness & Fatigue (CTL/ATL/TSB) chart
export function renderFitnessChart(canvasId, scores) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || scores.length === 0) return;

    const last90 = scores.slice(-90);
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: last90.map(s => formatDateShort(s.date)),
            datasets: [
                { label: 'Fitness (CTL)', data: last90.map(s => s.ctl), borderColor: COLORS.primary, borderWidth: 2, pointRadius: 0, fill: false },
                { label: 'Fatigue (ATL)', data: last90.map(s => s.atl), borderColor: COLORS.danger, borderWidth: 2, pointRadius: 0, fill: false },
                { label: 'Form (TSB)', data: last90.map(s => s.tsb), borderColor: COLORS.success, borderWidth: 1.5, pointRadius: 0, fill: { target: 'origin', above: 'rgba(34,197,94,0.08)', below: 'rgba(239,68,68,0.08)' } }
            ]
        },
        options: { ...defaultOptions, plugins: { ...defaultOptions.plugins, tooltip: { mode: 'index', intersect: false } } }
    });
}

// Weekly training load bar chart
export function renderWeeklyLoadChart(canvasId, weeklyData) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || weeklyData.length === 0) return;

    const last12 = weeklyData.slice(-12);
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: last12.map(w => w.label),
            datasets: [{
                label: 'Training Load',
                data: last12.map(w => w.load),
                backgroundColor: last12.map(w => w.load > (w.avg * 1.3) ? COLORS.danger : COLORS.primary),
                borderRadius: 4
            }]
        },
        options: { ...defaultOptions, plugins: { legend: { display: false } } }
    });
}

// Estimated 1RM progression
export function renderE1RMChart(canvasId, history) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || history.length === 0) return;

    chartInstances[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: history.map(h => formatDateShort(h.date)),
            datasets: [{
                label: 'Est. 1RM (kg)',
                data: history.map(h => h.e1rm),
                borderColor: COLORS.primary,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                borderWidth: 2,
                pointRadius: 3,
                fill: true
            }]
        },
        options: defaultOptions
    });
}

// Volume load chart
export function renderVolumeChart(canvasId, weeklyVolume) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || weeklyVolume.length === 0) return;

    chartInstances[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: weeklyVolume.map(w => w.label),
            datasets: [{
                label: 'Volume (kg)',
                data: weeklyVolume.map(w => w.volume),
                backgroundColor: COLORS.secondary,
                borderRadius: 4
            }]
        },
        options: { ...defaultOptions, plugins: { legend: { display: false } } }
    });
}

// Muscle group radar chart
export function renderMuscleBalanceChart(canvasId, muscleData) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || Object.keys(muscleData).length === 0) return;

    const labels = Object.keys(muscleData);
    const values = Object.values(muscleData);
    const maxVal = Math.max(...values);

    chartInstances[canvasId] = new Chart(canvas, {
        type: 'radar',
        data: {
            labels,
            datasets: [{
                label: 'Volume',
                data: values.map(v => Math.round(v / maxVal * 100)),
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderColor: COLORS.primary,
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: COLORS.primary
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { ticks: { color: COLORS.textColor, backdropColor: 'transparent' }, grid: { color: COLORS.gridColor }, pointLabels: { color: COLORS.textColor, font: { size: 10 } } } },
            plugins: { legend: { display: false } }
        }
    });
}

// Pace progression chart
export function renderPaceChart(canvasId, paceData) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || paceData.length === 0) return;

    chartInstances[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: paceData.map(p => formatDateShort(p.date)),
            datasets: [{
                label: 'Avg Pace (min/km)',
                data: paceData.map(p => p.paceMinutes),
                borderColor: COLORS.success,
                borderWidth: 2,
                pointRadius: 3,
                fill: false
            }]
        },
        options: {
            ...defaultOptions,
            scales: {
                ...defaultOptions.scales,
                y: { ...defaultOptions.scales.y, reverse: true, ticks: { ...defaultOptions.scales.y.ticks, callback: v => `${Math.floor(v)}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}` } }
            }
        }
    });
}

// Weekly distance chart
export function renderDistanceChart(canvasId, weeklyDistance) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || weeklyDistance.length === 0) return;

    chartInstances[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: weeklyDistance.map(w => w.label),
            datasets: [{
                label: 'Distance (km)',
                data: weeklyDistance.map(w => w.distance),
                backgroundColor: COLORS.success,
                borderRadius: 4
            }]
        },
        options: { ...defaultOptions, plugins: { legend: { display: false } } }
    });
}

// Weight trend line
export function renderWeightChart(canvasId, weightData) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || weightData.length === 0) return;

    chartInstances[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: weightData.map(w => formatDateShort(w.date)),
            datasets: [{
                label: 'Weight (kg)',
                data: weightData.map(w => w.weight),
                borderColor: COLORS.warning,
                borderWidth: 2,
                pointRadius: 2,
                fill: false
            }]
        },
        options: defaultOptions
    });
}

// Health trends (HRV + sleep + resting HR)
export function renderHealthTrendsChart(canvasId, healthData) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || healthData.length === 0) return;

    chartInstances[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: healthData.map(h => formatDateShort(h.date)),
            datasets: [
                { label: 'HRV (ms)', data: healthData.map(h => h.hrv), borderColor: COLORS.primary, borderWidth: 2, pointRadius: 2, fill: false, yAxisID: 'y' },
                { label: 'Resting HR', data: healthData.map(h => h.restingHR), borderColor: COLORS.danger, borderWidth: 2, pointRadius: 2, fill: false, yAxisID: 'y' },
                { label: 'Sleep (h)', data: healthData.map(h => h.sleepTotal), borderColor: COLORS.secondary, borderWidth: 2, pointRadius: 2, fill: false, yAxisID: 'y1' }
            ]
        },
        options: {
            ...defaultOptions,
            scales: {
                x: defaultOptions.scales.x,
                y: { ...defaultOptions.scales.y, position: 'left' },
                y1: { ...defaultOptions.scales.y, position: 'right', grid: { drawOnChartArea: false } }
            }
        }
    });
}

// Readiness history
export function renderReadinessChart(canvasId, readinessData) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas || readinessData.length === 0) return;

    chartInstances[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels: readinessData.map(r => formatDateShort(r.date)),
            datasets: [{
                label: 'Readiness Score',
                data: readinessData.map(r => r.score),
                borderColor: COLORS.success,
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderWidth: 2,
                pointRadius: 3,
                fill: true
            }]
        },
        options: { ...defaultOptions, scales: { ...defaultOptions.scales, y: { ...defaultOptions.scales.y, min: 0, max: 100 } } }
    });
}
