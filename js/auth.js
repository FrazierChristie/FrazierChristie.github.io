// js/auth.js — Strava OAuth authentication

const STRAVA_CLIENT_ID = '143540'; // Users should replace with their own
const REDIRECT_URI = window.location.origin + window.location.pathname;

export function redirectToStrava() {
    const scope = 'read,activity:read_all,profile:read_all';
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${scope}`;
    window.location.href = authUrl;
}

export async function logout() {
    const tokenDataRaw = localStorage.getItem('strava_tokens');
    if (tokenDataRaw) {
        const tokenData = JSON.parse(tokenDataRaw);
        try {
            await fetch('https://www.strava.com/oauth/deauthorize', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
            });
        } catch (error) {
            console.warn('Failed to deauthorize token:', error);
        }
    }
    localStorage.removeItem('strava_tokens');
    localStorage.removeItem('strava_athlete_data');
    window.location.reload();
}

async function getTokensFromCode(code) {
    const response = await fetch('/api/strava-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Authentication failed');

    localStorage.setItem('strava_tokens', JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at
    }));

    if (data.athlete) {
        localStorage.setItem('strava_athlete_data', JSON.stringify(data.athlete));
    }

    window.history.replaceState({}, '', window.location.pathname);
}

export function getAuthPayload() {
    const tokenDataRaw = localStorage.getItem('strava_tokens');
    if (!tokenDataRaw) return null;
    return btoa(tokenDataRaw);
}

export function isStravaConnected() {
    const tokenDataRaw = localStorage.getItem('strava_tokens');
    if (!tokenDataRaw) return false;
    const tokenData = JSON.parse(tokenDataRaw);
    return !!(tokenData.access_token);
}

export async function handleAuth(onAuthenticated) {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code) {
        await getTokensFromCode(code);
    }

    const tokenDataRaw = localStorage.getItem('strava_tokens');
    if (tokenDataRaw) {
        const tokenData = JSON.parse(tokenDataRaw);
        const now = Math.floor(Date.now() / 1000);

        if (tokenData.access_token && tokenData.expires_at > now) {
            if (onAuthenticated) await onAuthenticated(tokenData);
            return true;
        } else {
            localStorage.removeItem('strava_tokens');
            localStorage.removeItem('strava_athlete_data');
        }
    }
    return false;
}
