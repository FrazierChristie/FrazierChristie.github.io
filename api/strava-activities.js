import { getValidAccessToken, validateEnv } from './_shared.js';

export default async function handler(req, res) {
    try {
        validateEnv();
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { accessToken, updatedTokens } = await getValidAccessToken(req);
        const allActivities = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await fetch(
                `https://www.strava.com/api/v3/athlete/activities?per_page=100&page=${page}`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(`Strava API error: ${JSON.stringify(errData)}`);
            }

            const activities = await response.json();
            allActivities.push(...activities);
            hasMore = activities.length === 100;
            page++;
        }

        return res.status(200).json({ activities: allActivities, tokens: updatedTokens });
    } catch (error) {
        console.error('Error in /api/strava-activities:', error.message);
        return res.status(500).json({ error: error.message });
    }
}
