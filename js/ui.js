// js/ui.js — Core UI framework: navigation, loading, modals

let currentPage = 'dashboard';
let pageLoadCallbacks = {};

export function registerPage(name, loadCallback) {
    pageLoadCallbacks[name] = loadCallback;
}

export function navigateTo(page) {
    currentPage = page;
    window.location.hash = page;

    // Update nav
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
    });

    // Hide all pages, show target
    document.querySelectorAll('.page').forEach(el => {
        el.classList.toggle('hidden', el.id !== `page-${page}`);
    });

    // Call page load callback
    if (pageLoadCallbacks[page]) {
        pageLoadCallbacks[page]();
    }
}

export function getCurrentPage() {
    return currentPage;
}

export function showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    const msg = document.getElementById('loading-message');
    if (overlay) {
        msg.textContent = message;
        overlay.classList.remove('hidden');
    }
}

export function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.add('hidden');
}

export function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

export function showModal(title, content, actions = []) {
    const modal = document.getElementById('modal');
    if (!modal) return;

    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;

    const actionsEl = document.getElementById('modal-actions');
    actionsEl.innerHTML = '';
    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.textContent = action.label;
        btn.className = `btn ${action.class || 'btn-secondary'}`;
        btn.onclick = () => {
            action.onClick();
            closeModal();
        };
        actionsEl.appendChild(btn);
    });

    modal.classList.remove('hidden');
}

export function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.classList.add('hidden');
}

export function formatRelativeTime(date) {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function initNavigation() {
    // Bottom nav click handlers
    document.querySelectorAll('.nav-item').forEach(el => {
        el.addEventListener('click', () => navigateTo(el.dataset.page));
    });

    // Modal close
    document.getElementById('modal-close')?.addEventListener('click', closeModal);
    document.getElementById('modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
    });

    // Handle hash navigation
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);

    window.addEventListener('hashchange', () => {
        const page = window.location.hash.replace('#', '') || 'dashboard';
        if (page !== currentPage) navigateTo(page);
    });
}
