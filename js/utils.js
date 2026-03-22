// js/utils.js — Shared utility functions

export function formatDate(date) {
    if (typeof date === 'string') date = new Date(date);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateShort(date) {
    if (typeof date === 'string') date = new Date(date);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function formatDateISO(date) {
    if (typeof date === 'string') return date.substring(0, 10);
    return date.toISOString().substring(0, 10);
}

export function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatPace(secondsPerKm) {
    const min = Math.floor(secondsPerKm / 60);
    const sec = Math.round(secondsPerKm % 60);
    return `${min}:${sec.toString().padStart(2, '0')}/km`;
}

export function formatDistance(meters, unit = 'metric') {
    if (unit === 'imperial') return (meters / 1609.34).toFixed(2) + ' mi';
    return (meters / 1000).toFixed(2) + ' km';
}

export function formatWeight(kg, unit = 'metric') {
    if (unit === 'imperial') return (kg * 2.20462).toFixed(1) + ' lbs';
    return kg.toFixed(1) + ' kg';
}

export function estimate1RM(weight, reps) {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    // Epley formula
    return Math.round(weight * (1 + reps / 30));
}

export function estimate1RMBrzycki(weight, reps) {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    return Math.round(weight * (36 / (37 - reps)));
}

export function daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

export function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

export function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

export function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

export function rpeToIntensity(rpe) {
    // Convert RPE 1-10 to intensity percentage 0-1
    return clamp((rpe - 1) / 9, 0, 1);
}

export function getTrainingLoadFromRPE(rpe, durationMinutes) {
    // TRIMP-like score: duration * intensity
    return Math.round(durationMinutes * rpeToIntensity(rpe) * 10);
}

export function getStrengthTrainingLoad(sets) {
    // Volume load based training stress
    let totalVolume = 0;
    let maxRPE = 0;
    sets.forEach(s => {
        totalVolume += (s.weight || 0) * (s.reps || 0);
        if (s.rpe > maxRPE) maxRPE = s.rpe;
    });
    const intensityFactor = rpeToIntensity(maxRPE || 5);
    return Math.round((totalVolume / 100) * intensityFactor * 10);
}
