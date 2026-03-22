// js/pages/gear.js — Gear tracker page logic
import { registerPage, showToast, showModal } from '../ui.js';
import { dbGetAll, dbPut, dbDelete, generateId } from '../db.js';
import { formatDate, escapeHtml } from '../utils.js';

export function initGearPage() {
    registerPage('gear', loadGearPage);
}

async function loadGearPage() {
    try {
        const gear = await dbGetAll('gear');
        const container = document.getElementById('gear-list');
        if (!container) return;

        if (gear.length === 0) {
            container.innerHTML = `<div class="empty-state">
                <div class="empty-icon">&#x1F45F;</div>
                <h3>No Gear Tracked</h3>
                <p>Track your shoes, bikes, and other equipment to monitor usage and know when to replace them.</p>
            </div>`;
            return;
        }

        container.innerHTML = gear.map(g => {
            const distKm = ((g.totalDistance || 0) / 1000).toFixed(1);
            const maxKm = g.maxDistanceKm || 800;
            const pct = Math.min(100, Math.round((g.totalDistance || 0) / (maxKm * 1000) * 100));
            const barColor = pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#22c55e';

            return `<div class="card gear-card">
                <div class="gear-header">
                    <div>
                        <h4>${escapeHtml(g.name)}</h4>
                        <span class="text-muted">${g.type || 'Shoes'} · ${g.brand || ''}</span>
                    </div>
                    <button class="btn-icon btn-danger-text" onclick="window.fitcoach.deleteGear('${g.id}')">&times;</button>
                </div>
                <div class="gear-stats">
                    <span>${distKm} km</span>
                    <span class="text-muted">/ ${maxKm} km</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width:${pct}%;background:${barColor}"></div>
                </div>
                <p class="text-muted">${g.totalActivities || 0} activities · Added ${formatDate(g.addedDate || g.createdAt)}</p>
                ${g.retired ? '<span class="badge badge-muted">Retired</span>' : ''}
            </div>`;
        }).join('');
    } catch (e) {
        console.warn('Failed to load gear:', e);
    }
}

export function addGear() {
    showModal('Add Gear', `
        <div class="form-group">
            <label>Name</label>
            <input type="text" id="gear-name" placeholder="e.g., Nike Pegasus 41">
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>Type</label>
                <select id="gear-type">
                    <option value="Shoes">Shoes</option>
                    <option value="Bike">Bike</option>
                    <option value="Watch">Watch</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label>Brand</label>
                <input type="text" id="gear-brand" placeholder="Nike">
            </div>
        </div>
        <div class="form-group">
            <label>Max Distance (km)</label>
            <input type="number" id="gear-max-distance" value="800" placeholder="800">
        </div>
    `, [
        {
            label: 'Add',
            class: 'btn-primary',
            onClick: async () => {
                const name = document.getElementById('gear-name')?.value;
                if (!name) { showToast('Enter a name', 'warning'); return; }

                await dbPut('gear', {
                    id: generateId(),
                    name,
                    type: document.getElementById('gear-type')?.value || 'Shoes',
                    brand: document.getElementById('gear-brand')?.value || '',
                    maxDistanceKm: parseInt(document.getElementById('gear-max-distance')?.value) || 800,
                    totalDistance: 0,
                    totalActivities: 0,
                    retired: false,
                    createdAt: new Date().toISOString()
                });
                showToast('Gear added', 'success');
                loadGearPage();
            }
        },
        { label: 'Cancel', onClick: () => {} }
    ]);
}

export function deleteGear(id) {
    showModal('Delete Gear', '<p>Remove this gear item?</p>', [
        {
            label: 'Delete',
            class: 'btn-danger',
            onClick: async () => {
                await dbDelete('gear', id);
                showToast('Gear removed', 'info');
                loadGearPage();
            }
        },
        { label: 'Cancel', onClick: () => {} }
    ]);
}
