/**
 * Space Pong Leaderboard Worker
 * Cloudflare Worker + KV for global leaderboard with anti-cheat
 * 
 * SECRET_KEY is stored as a Cloudflare Worker secret (not in code)
 * Set via: wrangler secret put SECRET_KEY
 */

// Score validation: minimum seconds per point (based on game physics)
// const MIN_SECONDS_PER_POINT = 1.5;

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
};

// Simple hash function for token signing
async function hashToken(data, secretKey) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data + secretKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate game start token
async function generateToken(timestamp, secretKey) {
    const data = `start_${timestamp}`;
    const hash = await hashToken(data, secretKey);
    return `${timestamp}_${hash.substring(0, 16)}`;
}

// Validate token and extract start time
async function validateToken(token, secretKey) {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('_');
    if (parts.length !== 2) return null;

    const timestamp = parseInt(parts[0]);
    if (isNaN(timestamp)) return null;

    // Verify hash
    const expectedHash = (await hashToken(`start_${timestamp}`, secretKey)).substring(0, 16);
    if (parts[1] !== expectedHash) return null;

    return timestamp;
}

// Handle requests
export default {
    async fetch(request, env) {
        // Get secret from environment
        const secretKey = env.SECRET_KEY || 'SUPER_SECRET_KEY';

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        try {
            // Start game - issue token
            if (path === '/api/start' && request.method === 'POST') {
                const timestamp = Date.now();
                const token = await generateToken(timestamp, secretKey);

                return new Response(JSON.stringify({
                    token,
                    timestamp
                }), { headers: corsHeaders });
            }

            // Submit score
            if (path === '/api/submit' && request.method === 'POST') {
                const body = await request.json();
                const { token, score, name } = body;

                // Validate inputs
                if (!token || typeof score !== 'number' || !name) {
                    return new Response(JSON.stringify({
                        error: 'Invalid submission'
                    }), { status: 400, headers: corsHeaders });
                }

                // Validate token and get start time
                const startTime = await validateToken(token, secretKey);
                if (!startTime) {
                    return new Response(JSON.stringify({
                        error: 'Invalid token'
                    }), { status: 400, headers: corsHeaders });
                }

                // Calculate game duration
                const now = Date.now();
                const durationSeconds = (now - startTime) / 1000;

                // Score plausibility check
                // const minDuration = score * MIN_SECONDS_PER_POINT;
                // if (durationSeconds < minDuration) {
                //     return new Response(JSON.stringify({
                //         error: 'Score too fast'
                //     }), { status: 400, headers: corsHeaders });
                // }

                // Token age check (max 1 hour)
                if (now - startTime > 3600000) {
                    return new Response(JSON.stringify({
                        error: 'Token expired'
                    }), { status: 400, headers: corsHeaders });
                }

                // Sanitize name (max 20 chars, alphanumeric + spaces)
                const sanitizedName = name.toString()
                    .substring(0, 20)
                    .replace(/[^a-zA-Z0-9 _-]/g, '')
                    .trim() || 'Anonymous';

                // Get current leaderboard
                let leaderboard = [];
                try {
                    const data = await env.PONG_LEADERBOARD.get('scores', { type: 'json' });
                    if (data) leaderboard = data;
                } catch (e) {
                    leaderboard = [];
                }

                // Check if player already exists and update if new score is higher
                const existingIndex = leaderboard.findIndex(e =>
                    e.name.toLowerCase() === sanitizedName.toLowerCase()
                );

                const newScore = Math.floor(score);

                if (existingIndex >= 0) {
                    // Player exists - only update if new score is higher
                    if (newScore > leaderboard[existingIndex].score) {
                        leaderboard[existingIndex].score = newScore;
                        leaderboard[existingIndex].date = new Date().toISOString();
                    } else {
                        // Score not higher, return current rank
                        leaderboard.sort((a, b) => b.score - a.score);
                        const rank = leaderboard.findIndex(e =>
                            e.name.toLowerCase() === sanitizedName.toLowerCase()
                        ) + 1;
                        return new Response(JSON.stringify({
                            success: true,
                            rank,
                            message: `Your best is still ${leaderboard[existingIndex].score}. You're #${rank}`
                        }), { headers: corsHeaders });
                    }
                } else {
                    // New player - add to leaderboard
                    leaderboard.push({
                        name: sanitizedName,
                        score: newScore,
                        date: new Date().toISOString()
                    });
                }

                // Sort by score (descending) and keep top 100
                leaderboard.sort((a, b) => b.score - a.score);
                leaderboard = leaderboard.slice(0, 100);

                // Save to KV
                await env.PONG_LEADERBOARD.put('scores', JSON.stringify(leaderboard));

                // Return rank
                const rank = leaderboard.findIndex(e =>
                    e.name === sanitizedName && e.score === Math.floor(score)
                ) + 1;

                return new Response(JSON.stringify({
                    success: true,
                    rank,
                    message: rank <= 10 ? 'You made the top 10!' : `You ranked #${rank}`
                }), { headers: corsHeaders });
            }

            // Get leaderboard
            if (path === '/api/leaderboard' && request.method === 'GET') {
                let leaderboard = [];
                try {
                    const data = await env.PONG_LEADERBOARD.get('scores', { type: 'json' });
                    if (data) leaderboard = data.slice(0, 10);
                } catch (e) {
                    leaderboard = [];
                }

                return new Response(JSON.stringify({
                    leaderboard
                }), { headers: corsHeaders });
            }

            // 404 for unknown routes
            return new Response(JSON.stringify({
                error: 'Not found'
            }), { status: 404, headers: corsHeaders });

        } catch (error) {
            return new Response(JSON.stringify({
                error: 'Server error'
            }), { status: 500, headers: corsHeaders });
        }
    }
};
