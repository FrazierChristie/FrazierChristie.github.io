import { getValidAccessToken, validateEnv } from './_shared.js';

export default async function handler(req, res) {
    try { validateEnv(); } catch (e) { return res.status(500).json({ error: e.message }); }
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { accessToken, updatedTokens } = await getValidAccessToken(req);
        const response = await fetch('https://www.strava.com/api/v3/athlete', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) {
            const errData = await response.json();
            return res.status(response.status).json({ error: 'Failed to fetch athlete', details: errData });
        }
        const athlete = await response.json();
        return res.status(200).json({ athlete, tokens: updatedTokens });
    } catch (error) {
        console.error('Error in /api/strava-athlete:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
