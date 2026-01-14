# Deploy Space Pong Leaderboard Worker

## Prerequisites
- Cloudflare account (free tier works)
- Node.js installed
- Wrangler CLI: `npm install -g wrangler`

## Steps

### 1. Login to Cloudflare
```bash
wrangler login
```

### 2. Create KV Namespace
```bash
cd worker
wrangler kv:namespace create LEADERBOARD
```
Copy the `id` from the output.

### 3. Update wrangler.toml
Replace `YOUR_KV_NAMESPACE_ID_HERE` with the ID from step 2.

### 4. Deploy Worker
```bash
wrangler deploy
```

### 5. Update game.js
Replace `YOUR_SUBDOMAIN` in `CONFIG.LEADERBOARD_API` with your Workers subdomain:
```javascript
LEADERBOARD_API: 'https://space-pong-leaderboard.YOUR_SUBDOMAIN.workers.dev'
```

## Done!
Your leaderboard is now live. Test by playing a game and submitting a score.
