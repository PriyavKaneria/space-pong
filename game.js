/**
 * SPACE PONG - Event Horizon Edition
 * A visually stunning pong game with black hole physics and gravitational lensing
 */

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
    // Arena
    ARENA_RADIUS_FACTOR: 0.42,

    // Physics
    GRAVITY_STRENGTH: 18000,
    MAX_SPEED: 12,
    SPEED_INCREMENT: 0.000015,
    HIT_SPEED_BOOST: 0.002,

    // Paddle
    PADDLE_ARC_LENGTH: 0.5,
    PADDLE_WIDTH: 12,

    // Black Hole
    BLACK_HOLE_RADIUS: 30,
    ACCRETION_DISK_RADIUS: 80,

    // Particles
    STAR_COUNT: 350,
    TRAIL_PARTICLE_COUNT: 50,

    // Visual
    WARP_INTENSITY: 0.3,

    // Leaderboard API (update with your Worker URL after deployment)
    LEADERBOARD_API: 'https://space-pong-leaderboard.priyavkaneria.workers.dev'
};

// ============================================
// LEADERBOARD API
// ============================================

const LeaderboardAPI = {
    token: null,

    async startGame() {
        try {
            const response = await fetch(`${CONFIG.LEADERBOARD_API}/api/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            this.token = data.token;
            return data;
        } catch (e) {
            console.warn('Could not get game token:', e);
            return null;
        }
    },

    async submitScore(name, score) {
        if (!this.token) {
            return { error: 'No game token' };
        }
        try {
            const response = await fetch(`${CONFIG.LEADERBOARD_API}/api/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: this.token, name, score })
            });
            const data = await response.json();
            this.token = null; // Invalidate token after use
            return data;
        } catch (e) {
            console.warn('Could not submit score:', e);
            return { error: 'Network error' };
        }
    },

    async getLeaderboard() {
        try {
            const response = await fetch(`${CONFIG.LEADERBOARD_API}/api/leaderboard`);
            const data = await response.json();
            return data.leaderboard || [];
        } catch (e) {
            console.warn('Could not fetch leaderboard:', e);
            return [];
        }
    }
};

// ============================================
// HIGH SCORE MANAGER (Obfuscated Storage)
// ============================================

const HighScoreManager = {
    STORAGE_KEY: 'ehp_data',
    SECRET: 0x5A3C, // XOR key for obfuscation

    // Simple obfuscation: XOR + base64 + checksum
    encode(score) {
        const timestamp = Date.now();
        const checksum = (score * 7 + 42) ^ this.SECRET;
        const data = { s: score ^ this.SECRET, t: timestamp, c: checksum };
        return btoa(JSON.stringify(data));
    },

    decode(encoded) {
        try {
            const data = JSON.parse(atob(encoded));
            const score = data.s ^ this.SECRET;
            const expectedChecksum = (score * 7 + 42) ^ this.SECRET;

            // Validate checksum
            if (data.c !== expectedChecksum) {
                console.warn('Score data corrupted');
                return 0;
            }

            // Validate score is reasonable (0-9999)
            if (score < 0 || score > 9999 || !Number.isInteger(score)) {
                return 0;
            }

            return score;
        } catch (e) {
            return 0;
        }
    },

    save(score) {
        try {
            localStorage.setItem(this.STORAGE_KEY, this.encode(score));
        } catch (e) {
            console.warn('Could not save high score');
        }
    },

    load() {
        try {
            const encoded = localStorage.getItem(this.STORAGE_KEY);
            if (!encoded) return 0;
            return this.decode(encoded);
        } catch (e) {
            return 0;
        }
    }
};

// ============================================
// SARCASTIC GAME OVER MESSAGES
// ============================================

const GAME_OVER_MESSAGES = [
    "THE VOID CLAIMS ANOTHER",
    "GRAVITY ALWAYS WINS",
    "YOU TRIED. THAT'S... SOMETHING.",
    "IF LIGHT CAN'T ESCAPE. NEITHER CAN YOU.",
    "THE BLACK HOLE SENDS ITS REGARDS",
    "SKILL ISSUE DETECTED",
    "PHYSICS: 1, YOU: 0",
    "THAT PADDLE WON'T SAVE YOU",
    "CONSUMED BY THE SINGULARITY",
    "YOUR ATOMS ARE NOW SPAGHETTI",
    "EVENT HORIZON? MORE LIKE EVENT HORIZON-TALLY DESTROYED",
    "THE COSMOS IS UNFORGIVING",
    "NEWTON IS DISAPPOINTED",
    "YOU LASTED LONGER THAN MOST PHOTONS",
    "HAWKING RADIATION CLAIMS ANOTHER VICTIM",
    "PLOT TWIST: YOU WERE THE BALL ALL ALONG",
    "GRAVITY: STILL UNDEFEATED SINCE 13.8 BILLION BC",
    "THE SIMULATION REJECTS YOUR EXISTENCE",
    "YOUR TRAJECTORY WAS... SUBOPTIMAL",
    "SPAGHETTIFICATION COMPLETE",
    "THE VOID THANKS YOU FOR YOUR DONATION",
    "CAN'T HANDLE NO BALLS"
];

function getRandomGameOverMessage() {
    return GAME_OVER_MESSAGES[Math.floor(Math.random() * GAME_OVER_MESSAGES.length)];
}

// ============================================
// STAR PARTICLE
// ============================================

class Star {
    constructor(width, height, centerX, centerY, arenaRadius) {
        this.reset(width, height, centerX, centerY, arenaRadius);
    }

    reset(width, height, centerX, centerY, arenaRadius) {
        // Position stars in a larger area for parallax
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * Math.max(width, height) * 0.8;

        this.x = Math.cos(angle) * dist;
        this.y = Math.sin(angle) * dist;

        // Star properties
        this.baseSize = 0.5 + Math.random() * 2.5;
        this.size = this.baseSize;

        // Color temperature (white, blue, yellow, red)
        const temp = Math.random();
        if (temp < 0.6) {
            this.color = '#ffffff'; // White (most common)
        } else if (temp < 0.75) {
            this.color = '#a8d4ff'; // Blue
        } else if (temp < 0.9) {
            this.color = '#fff4e0'; // Yellow
        } else {
            this.color = '#ffb366'; // Orange/Red giant
        }

        // Twinkle animation
        this.twinkleSpeed = 0.5 + Math.random() * 2;
        this.twinkleOffset = Math.random() * Math.PI * 2;
        this.brightness = 0.5 + Math.random() * 0.5;

        // Depth for parallax (0 = far, 1 = close)
        this.depth = Math.random();

        // Orbit speed (very slow drift)
        this.orbitSpeed = (0.0001 + Math.random() * 0.0003) * (Math.random() > 0.5 ? 1 : -1);
        this.angle = angle;
        this.baseDist = dist;
    }

    update(time, deltaTime) {
        // Slow orbital drift
        this.angle += this.orbitSpeed * deltaTime;
        this.x = Math.cos(this.angle) * this.baseDist;
        this.y = Math.sin(this.angle) * this.baseDist;

        // Twinkle effect
        const twinkle = Math.sin(time * this.twinkleSpeed + this.twinkleOffset) * 0.3 + 0.7;
        this.currentBrightness = this.brightness * twinkle;
        this.size = this.baseSize * (0.8 + twinkle * 0.4);
    }

    draw(ctx, centerX, centerY) {
        const screenX = centerX + this.x;
        const screenY = centerY + this.y;

        // Draw star with glow
        ctx.save();
        ctx.globalAlpha = this.currentBrightness;

        // Glow
        if (this.size > 1.5) {
            ctx.beginPath();
            ctx.fillStyle = this.color;
            ctx.shadowBlur = this.size * 3;
            ctx.shadowColor = this.color;
            ctx.arc(screenX, screenY, this.size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Core
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 0;
        ctx.arc(screenX, screenY, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ============================================
// TRAIL PARTICLE
// ============================================

class TrailParticle {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.life = 0;
        this.maxLife = 0;
        this.size = 0;
        this.color = '#00f0ff';
    }

    spawn(x, y, vx, vy, color) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.vx = vx * 0.1 + (Math.random() - 0.5) * 0.5;
        this.vy = vy * 0.1 + (Math.random() - 0.5) * 0.5;
        this.maxLife = 30 + Math.random() * 30;
        this.life = this.maxLife;
        this.size = 2 + Math.random() * 3;
        this.color = color;
    }

    update() {
        if (!this.active) return;

        this.life--;
        if (this.life <= 0) {
            this.active = false;
            return;
        }

        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.98;
        this.vy *= 0.98;
    }

    draw(ctx, centerX, centerY) {
        if (!this.active) return;

        const alpha = this.life / this.maxLife;
        const size = this.size * alpha;

        ctx.save();
        ctx.globalAlpha = alpha * 0.8;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = size * 2;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(centerX + this.x, centerY + this.y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ============================================
// PADDLE
// ============================================

class Paddle {
    constructor() {
        this.angle = -Math.PI / 2;
        this.dist = 0;
        this.pulsePhase = 0;
        this.lastAngle = this.angle;
        this.velocity = 0;
        this.hitFlash = 0;
    }

    update(time, deltaTime) {
        this.pulsePhase = time * 2;
        this.velocity = (this.angle - this.lastAngle) / deltaTime;
        this.lastAngle = this.angle;

        if (this.hitFlash > 0) {
            this.hitFlash -= deltaTime * 0.005;
        }
    }

    onHit() {
        this.hitFlash = 1;
    }

    draw(ctx, radius, arcLength) {
        const startAngle = this.angle - arcLength / 2;
        const endAngle = this.angle + arcLength / 2;

        // Multiple layers for depth effect

        // Outer glow layer
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
        ctx.lineWidth = CONFIG.PADDLE_WIDTH + 20;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 30;
        ctx.shadowColor = '#00f0ff';
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.stroke();
        ctx.restore();

        // Middle energy layer
        ctx.save();
        ctx.beginPath();
        const gradient = ctx.createLinearGradient(
            Math.cos(startAngle) * radius,
            Math.sin(startAngle) * radius,
            Math.cos(endAngle) * radius,
            Math.sin(endAngle) * radius
        );
        gradient.addColorStop(0, '#00f0ff');
        gradient.addColorStop(0.5, '#7b42f6');
        gradient.addColorStop(1, '#ff00aa');
        ctx.strokeStyle = gradient;
        ctx.lineWidth = CONFIG.PADDLE_WIDTH + 8;
        ctx.lineCap = 'round';
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.stroke();
        ctx.restore();

        // Core bright layer
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = CONFIG.PADDLE_WIDTH - 4;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.8 + Math.sin(this.pulsePhase) * 0.2;
        ctx.arc(0, 0, radius, startAngle, endAngle);
        ctx.stroke();
        ctx.restore();

        // Hit flash effect
        if (this.hitFlash > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${this.hitFlash})`;
            ctx.lineWidth = CONFIG.PADDLE_WIDTH + 30;
            ctx.lineCap = 'round';
            ctx.shadowBlur = 50;
            ctx.shadowColor = '#ffffff';
            ctx.arc(0, 0, radius, startAngle, endAngle);
            ctx.stroke();
            ctx.restore();
        }

        // Radiation pulse rings
        const pulseCount = 3;
        for (let i = 0; i < pulseCount; i++) {
            const pulseProgress = ((this.pulsePhase / 5 + i / pulseCount) % 1);
            const pulseRadius = radius + pulseProgress * 40;
            const pulseAlpha = (1 - pulseProgress) * 0.3;

            ctx.save();
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 240, 255, ${pulseAlpha})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 10]);
            ctx.arc(0, 0, pulseRadius, startAngle - 0.1, endAngle + 0.1);
            ctx.stroke();
            ctx.restore();
        }

        // Energy particles along paddle
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            const t = i / (particleCount - 1);
            const particleAngle = startAngle + t * arcLength;
            const offset = Math.sin(this.pulsePhase * 3 + i * 0.5) * 5;
            const px = Math.cos(particleAngle) * (radius + offset);
            const py = Math.sin(particleAngle) * (radius + offset);
            const particleSize = 2 + Math.sin(this.pulsePhase * 4 + i) * 1;

            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = 0.5 + Math.sin(this.pulsePhase * 2 + i * 0.7) * 0.5;
            ctx.arc(px, py, particleSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}

// ============================================
// BALL
// ============================================

class Ball {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.radius = 8;
        this.speed = 0;
        this.glowIntensity = 1;
    }

    update(speedMultiplier) {
        this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        this.glowIntensity = Math.min(1, this.speed / 10);
    }

    draw(ctx) {
        const distFromCenter = Math.sqrt(this.x * this.x + this.y * this.y);

        // Color shifts based on proximity to black hole
        let hue = 180; // Cyan
        if (distFromCenter < 150) {
            hue = 180 + (150 - distFromCenter) * 0.5; // Shift towards purple
        }
        const mainColor = `hsl(${hue}, 100%, 70%)`;
        const glowColor = `hsl(${hue}, 100%, 50%)`;

        // Outer glow
        ctx.save();
        ctx.beginPath();
        ctx.fillStyle = mainColor;
        ctx.shadowBlur = 20 + this.glowIntensity * 30;
        ctx.shadowColor = glowColor;
        ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Core
        ctx.save();
        ctx.beginPath();
        const coreGradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius
        );
        coreGradient.addColorStop(0, '#ffffff');
        coreGradient.addColorStop(0.5, mainColor);
        coreGradient.addColorStop(1, glowColor);
        ctx.fillStyle = coreGradient;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ============================================
// BLACK HOLE
// ============================================

class BlackHole {
    constructor() {
        this.rotationAngle = 0;
        this.pulsePhase = 0;
    }

    update(time, deltaTime) {
        this.rotationAngle += deltaTime * 0.0005;
        this.pulsePhase = time;
    }

    draw(ctx) {
        ctx.save();
        ctx.rotate(this.rotationAngle);

        // Outer accretion disk glow
        const outerGlow = ctx.createRadialGradient(0, 0, 50, 0, 0, CONFIG.ACCRETION_DISK_RADIUS);
        outerGlow.addColorStop(0, 'rgba(156, 39, 176, 0.8)');
        outerGlow.addColorStop(0.3, 'rgba(255, 107, 0, 0.5)');
        outerGlow.addColorStop(0.6, 'rgba(255, 204, 0, 0.3)');
        outerGlow.addColorStop(1, 'transparent');

        ctx.fillStyle = outerGlow;
        ctx.beginPath();
        ctx.arc(0, 0, CONFIG.ACCRETION_DISK_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Spinning accretion ring
        ctx.save();
        ctx.rotate(this.rotationAngle * 3);

        // Draw asymmetric ring for Doppler effect
        const ringGradient = ctx.createConicGradient(0, 0, 0);
        ringGradient.addColorStop(0, 'rgba(255, 200, 100, 0.9)');
        ringGradient.addColorStop(0.25, 'rgba(255, 150, 50, 0.7)');
        ringGradient.addColorStop(0.5, 'rgba(180, 100, 200, 0.4)');
        ringGradient.addColorStop(0.75, 'rgba(100, 50, 150, 0.3)');
        ringGradient.addColorStop(1, 'rgba(255, 200, 100, 0.9)');

        ctx.strokeStyle = ringGradient;
        ctx.lineWidth = 15;
        ctx.beginPath();
        ctx.arc(0, 0, 55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Photon sphere glow
        const photonGlow = ctx.createRadialGradient(0, 0, CONFIG.BLACK_HOLE_RADIUS, 0, 0, CONFIG.BLACK_HOLE_RADIUS + 15);
        photonGlow.addColorStop(0, 'rgba(100, 200, 255, 0.8)');
        photonGlow.addColorStop(0.5, 'rgba(150, 100, 255, 0.4)');
        photonGlow.addColorStop(1, 'transparent');

        ctx.fillStyle = photonGlow;
        ctx.beginPath();
        ctx.arc(0, 0, CONFIG.BLACK_HOLE_RADIUS + 15, 0, Math.PI * 2);
        ctx.fill();

        // Event horizon (the void)
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, CONFIG.BLACK_HOLE_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        // Subtle edge highlight
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }
}

// ============================================
// MAIN GAME CLASS
// ============================================

class Game {
    constructor() {
        this.setupCanvas();
        this.setupUI();
        this.initGame();
        this.bindEvents();
        this.lastTime = performance.now();
        this.gameLoop();
    }

    setupCanvas() {
        this.container = document.getElementById('game-container');

        // Background canvas (stars, drawn to texture)
        this.bgCanvas = document.getElementById('backgroundCanvas');
        this.bgCtx = this.bgCanvas.getContext('2d');

        // Warp canvas (WebGL shader output)
        this.warpCanvas = document.getElementById('warpCanvas');
        this.lensShader = new GravitationalLensShader(this.warpCanvas);

        // Game canvas (paddle, ball, black hole, UI elements)
        this.gameCanvas = document.getElementById('gameCanvas');
        this.ctx = this.gameCanvas.getContext('2d');

        this.resize();
    }

    setupUI() {
        this.scoreEl = document.getElementById('score-display');
        this.highScoreEl = document.getElementById('highscore-display');
        this.msgEl = document.getElementById('start-msg');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.gameOverTitleEl = document.getElementById('game-over-title');
        this.finalScoreEl = document.getElementById('final-score');
        this.newHighScoreEl = document.getElementById('new-highscore');
        this.energyBar = document.getElementById('energy-bar');

        // Leaderboard elements
        this.nameInputContainer = document.getElementById('name-input-container');
        this.playerNameInput = document.getElementById('player-name');
        this.submitScoreBtn = document.getElementById('submit-score-btn');
        this.submitStatus = document.getElementById('submit-status');
        this.leaderboardList = document.getElementById('leaderboard-list');

        // Music elements
        this.bgMusic = document.getElementById('bg-music');
        this.musicToggle = document.getElementById('music-toggle');
        this.musicStarted = false;

        // Load mute preference from localStorage
        this.musicMuted = localStorage.getItem('spacePongMuted') === 'true';
        if (this.musicMuted && this.musicToggle) {
            this.musicToggle.textContent = '🔇';
            this.musicToggle.classList.add('muted');
        }

        // Music toggle button
        if (this.musicToggle && this.bgMusic) {
            this.musicToggle.addEventListener('click', () => this.toggleMusic());
        }

        // Bind submit button event
        if (this.submitScoreBtn) {
            this.submitScoreBtn.addEventListener('click', () => this.submitToLeaderboard());
        }
        if (this.playerNameInput) {
            this.playerNameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.submitToLeaderboard();
                e.stopPropagation(); // Prevent space from restarting
            });
        }
    }

    startMusic() {
        if (this.bgMusic && !this.musicStarted && !this.musicMuted) {
            this.bgMusic.volume = 0.5;
            const playPromise = this.bgMusic.play();

            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this.musicStarted = true;
                    this.musicPlaying = true;
                }).catch(() => {
                    // Autoplay blocked, try again after short delay
                    setTimeout(() => this.retryMusic(), 500);
                });
            }
            this.musicStarted = true;
        }
    }

    retryMusic() {
        // Don't retry if user manually muted
        if (this.musicMuted) return;

        if (this.bgMusic && !this.musicPlaying) {
            this.bgMusic.play().then(() => {
                this.musicPlaying = true;
            }).catch(() => {
                // Still blocked, will retry on next interaction
            });
        }
    }

    // Call this periodically to ensure music eventually plays
    ensureMusicPlaying() {
        if (this.musicMuted) return;
        if (this.bgMusic && this.musicStarted && !this.musicPlaying && !this.bgMusic.paused === false) {
            this.retryMusic();
        }
    }

    toggleMusic() {
        if (!this.bgMusic) return;

        if (this.bgMusic.paused) {
            this.musicMuted = false;
            localStorage.setItem('spacePongMuted', 'false');
            this.bgMusic.play().then(() => {
                this.musicPlaying = true;
            }).catch(() => { });
            if (this.musicToggle) {
                this.musicToggle.textContent = '🔊';
                this.musicToggle.classList.remove('muted');
            }
        } else {
            this.musicMuted = true;
            localStorage.setItem('spacePongMuted', 'true');
            this.bgMusic.pause();
            this.musicPlaying = false;
            if (this.musicToggle) {
                this.musicToggle.textContent = '🔇';
                this.musicToggle.classList.add('muted');
            }
        }
    }

    initGame() {
        // Game state
        this.score = 0;
        this.highScore = HighScoreManager.load();
        this.gameOver = false;
        this.ballAttached = true;
        this.ballEscaping = false;
        this.speedMultiplier = 1.0;
        this.time = 0;
        this.shakeAmount = 0;

        // Game objects
        this.paddle = new Paddle();
        this.ball = new Ball();
        this.blackHole = new BlackHole();
        this.stars = [];
        this.trailParticles = [];

        // Initialize particles
        this.initStars();
        this.initTrailParticles();

        // Update UI
        this.updateScore();
        this.updateHighScore();
        this.showStartMessage();
    }

    initStars() {
        this.stars = [];
        for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
            this.stars.push(new Star(
                this.width, this.height,
                this.centerX, this.centerY,
                this.arenaRadius
            ));
        }
    }

    initTrailParticles() {
        this.trailParticles = [];
        for (let i = 0; i < CONFIG.TRAIL_PARTICLE_COUNT; i++) {
            this.trailParticles.push(new TrailParticle());
        }
        this.trailIndex = 0;
    }

    spawnTrailParticle() {
        if (this.ballAttached) return;

        const particle = this.trailParticles[this.trailIndex];
        particle.spawn(this.ball.x, this.ball.y, -this.ball.vx, -this.ball.vy, '#00f0ff');
        this.trailIndex = (this.trailIndex + 1) % CONFIG.TRAIL_PARTICLE_COUNT;
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.arenaRadius = Math.min(this.width, this.height) * CONFIG.ARENA_RADIUS_FACTOR;

        // Resize all canvases
        [this.bgCanvas, this.warpCanvas, this.gameCanvas].forEach(canvas => {
            canvas.width = this.width;
            canvas.height = this.height;
        });

        if (this.lensShader) {
            this.lensShader.resize(this.width, this.height);
        }

        if (this.paddle) {
            this.paddle.dist = this.arenaRadius;
        }

        // Reinitialize stars for new dimensions
        if (this.stars && this.stars.length > 0) {
            this.initStars();
        }
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());

        window.addEventListener('mousemove', (e) => {
            if (this.gameOver) return;
            const dx = e.clientX - this.centerX;
            const dy = e.clientY - this.centerY;
            this.paddle.angle = Math.atan2(dy, dx);
        });

        window.addEventListener('mousedown', (e) => {
            // Don't reset if clicking on game over UI elements
            if (e.target.closest('#game-over-screen')) return;

            if (this.gameOver) {
                this.resetGame();
            } else if (this.ballAttached) {
                this.launchBall();
            }
        });

        window.addEventListener('keydown', (e) => {
            // Don't handle space if typing in input
            if (e.target.tagName === 'INPUT') return;

            if (e.code === 'Space') {
                if (this.gameOver) {
                    this.resetGame();
                } else if (this.ballAttached) {
                    this.launchBall();
                }
            }

            const speed = 0.08;
            if (e.key === 'ArrowLeft') this.paddle.angle -= speed;
            if (e.key === 'ArrowRight') this.paddle.angle += speed;
        });

        // Touch events for mobile
        window.addEventListener('touchstart', (e) => {
            // Allow touch on interactive elements (links, buttons, inputs)
            if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') {
                return;
            }

            // Don't reset if touching game over UI elements
            if (e.target.closest('#game-over-screen')) return;

            e.preventDefault();

            // Start music on touch (mobile needs this)
            this.startMusic();

            if (this.gameOver) {
                this.resetGame();
            } else if (this.ballAttached) {
                this.launchBall();
            }

            // Also update paddle position on touch start
            if (e.touches.length > 0) {
                const touch = e.touches[0];
                const dx = touch.clientX - this.centerX;
                const dy = touch.clientY - this.centerY;
                this.paddle.angle = Math.atan2(dy, dx);
            }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.gameOver) return;

            if (e.touches.length > 0) {
                const touch = e.touches[0];
                const dx = touch.clientX - this.centerX;
                const dy = touch.clientY - this.centerY;
                this.paddle.angle = Math.atan2(dy, dx);
            }
        }, { passive: false });
    }

    resetGame() {
        this.score = 0;
        this.speedMultiplier = 1.0;
        this.gameOver = false;
        this.ballAttached = true;
        this.ballEscaping = false;
        this.shakeAmount = 0;

        this.updateScore();
        this.showStartMessage();
        this.hideGameOver();
        this.initTrailParticles();
    }

    launchBall() {
        this.ballAttached = false;
        this.hideStartMessage();

        // Start music on first launch
        this.startMusic();

        // Request game token from leaderboard API
        LeaderboardAPI.startGame();

        // Launch with tangential velocity for orbital motion
        const nx = -Math.cos(this.paddle.angle);
        const ny = -Math.sin(this.paddle.angle);
        const tx = ny;
        const ty = -nx;

        const inwardSpeed = 3;
        const sideSpeed = 1.4;
        const sideDir = Math.random() > 0.5 ? 1 : -1;

        this.ball.vx = nx * inwardSpeed + tx * sideSpeed * sideDir;
        this.ball.vy = ny * inwardSpeed + ty * sideSpeed * sideDir;
    }

    updatePhysics(deltaTime) {
        if (this.gameOver) return;

        // Increase game speed over time
        if (!this.ballAttached) {
            this.speedMultiplier += CONFIG.SPEED_INCREMENT * deltaTime;
        }

        if (this.ballAttached) {
            // Stick ball to paddle
            this.ball.x = Math.cos(this.paddle.angle) * (this.arenaRadius - 20);
            this.ball.y = Math.sin(this.paddle.angle) * (this.arenaRadius - 20);
            return;
        }

        // Gravity from black hole
        const dx = -this.ball.x;
        const dy = -this.ball.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        const fx = dx / dist;
        const fy = dy / dist;

        const safeDist = Math.max(distSq, 400);
        const force = CONFIG.GRAVITY_STRENGTH / safeDist;

        // Scale gravity MORE than speed to keep tight orbits at high speed
        const gravityScale = Math.pow(this.speedMultiplier, 1.3);
        this.ball.vx += fx * force * 0.09 * gravityScale;
        this.ball.vy += fy * force * 0.09 * gravityScale;

        // Move ball
        this.ball.x += this.ball.vx * this.speedMultiplier;
        this.ball.y += this.ball.vy * this.speedMultiplier;

        // Spawn trail particles
        if (Math.random() < 0.4) {
            this.spawnTrailParticle();
        }

        // Black hole collision (slingshot if too close)
        if (dist < CONFIG.BLACK_HOLE_RADIUS + 5) {
            this.ball.vx = -this.ball.vx * 1.4;
            this.ball.vy = -this.ball.vy * 1.4;
            this.shakeAmount = 10;
        }

        // Arena boundary collision - skip if ball is already escaping
        const ballDist = Math.sqrt(this.ball.x * this.ball.x + this.ball.y * this.ball.y);

        if (!this.ballEscaping && ballDist >= this.arenaRadius - this.ball.radius) {
            let ballAngle = Math.atan2(this.ball.y, this.ball.x);
            let paddleAngle = this.paddle.angle;

            // Normalize angles
            while (ballAngle <= -Math.PI) ballAngle += Math.PI * 2;
            while (ballAngle > Math.PI) ballAngle -= Math.PI * 2;
            while (paddleAngle <= -Math.PI) paddleAngle += Math.PI * 2;
            while (paddleAngle > Math.PI) paddleAngle -= Math.PI * 2;

            let diff = Math.abs(ballAngle - paddleAngle);
            if (diff > Math.PI) diff = Math.PI * 2 - diff;

            if (diff < CONFIG.PADDLE_ARC_LENGTH / 2) {
                // HIT!
                this.score++;
                this.updateScore();
                this.speedMultiplier += CONFIG.HIT_SPEED_BOOST;
                this.paddle.onHit();
                this.shakeAmount = 8;

                // Reflect
                const nx = -this.ball.x / ballDist;
                const ny = -this.ball.y / ballDist;
                const dot = this.ball.vx * nx + this.ball.vy * ny;

                this.ball.vx = this.ball.vx - 2 * dot * nx;
                this.ball.vy = this.ball.vy - 2 * dot * ny;

                // Add energy
                this.ball.vx *= 1.08;
                this.ball.vy *= 1.08;

                // Push out of collision
                const overlap = ballDist - (this.arenaRadius - this.ball.radius);
                this.ball.x += nx * overlap * 1.2;
                this.ball.y += ny * overlap * 1.2;

                // Spawn impact particles
                for (let i = 0; i < 5; i++) {
                    this.spawnTrailParticle();
                }
            } else {
                // MISS - Mark ball as escaping and start timer
                if (!this.ballEscaping) {
                    this.ballEscaping = true;
                    this.escapeTime = Date.now();
                }
            }
        }

        // Check if escaping ball timer has elapsed (300ms delay)
        if (this.ballEscaping && !this.gameOver) {
            if (Date.now() - this.escapeTime > 300) {
                this.gameOver = true;
                this.showGameOver();
            }
        }

        // Update ball visual properties
        this.ball.update(this.speedMultiplier);
    }

    update(deltaTime) {
        this.time += deltaTime * 0.001;

        // Update shake
        if (this.shakeAmount > 0) {
            this.shakeAmount *= 0.9;
            if (this.shakeAmount < 0.5) this.shakeAmount = 0;
        }

        // Retry music periodically if not playing (every 2 seconds)
        if (this.musicStarted && !this.musicPlaying && Math.floor(this.time) % 2 === 0 && Math.floor(this.time) !== this.lastMusicRetry) {
            this.lastMusicRetry = Math.floor(this.time);
            this.retryMusic();
        }

        // Update game objects
        this.paddle.update(this.time, deltaTime);
        this.blackHole.update(this.time, deltaTime);

        // Update stars
        this.stars.forEach(star => star.update(this.time, deltaTime));

        // Update trail particles
        this.trailParticles.forEach(p => p.update());

        // Update physics
        this.updatePhysics(deltaTime);

        // Update energy bar
        const energy = Math.min(100, (this.speedMultiplier - 1) * 100 + 20);
        if (this.energyBar) {
            this.energyBar.style.width = `${energy}%`;
        }
    }

    drawBackground() {
        // Clear background canvas
        this.bgCtx.fillStyle = '#020412';
        this.bgCtx.fillRect(0, 0, this.width, this.height);

        // Draw stars
        this.stars.forEach(star => star.draw(this.bgCtx, this.centerX, this.centerY));
    }

    drawGame() {
        const ctx = this.ctx;

        // Clear game canvas
        ctx.clearRect(0, 0, this.width, this.height);

        ctx.save();

        // Apply screen shake
        if (this.shakeAmount > 0) {
            ctx.translate(
                (Math.random() - 0.5) * this.shakeAmount,
                (Math.random() - 0.5) * this.shakeAmount
            );
        }

        ctx.translate(this.centerX, this.centerY);

        // Draw arena boundary
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(41, 182, 246, 0.3)';
        ctx.lineWidth = 2;
        ctx.arc(0, 0, this.arenaRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw grid lines for sci-fi feel
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.strokeStyle = '#29b6f6';
        ctx.lineWidth = 1;
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * this.arenaRadius, Math.sin(angle) * this.arenaRadius);
            ctx.stroke();
        }
        ctx.restore();

        // Draw trail particles (behind black hole)
        this.trailParticles.forEach(p => p.draw(ctx, 0, 0));

        // Draw black hole
        this.blackHole.draw(ctx);

        // Draw ball
        if (!this.gameOver) {
            this.ball.draw(ctx);
        }

        // Draw paddle
        this.paddle.draw(ctx, this.arenaRadius, CONFIG.PADDLE_ARC_LENGTH);

        ctx.restore();
    }

    render() {
        // Draw stars to background canvas
        this.drawBackground();

        // Apply gravitational lensing shader
        if (this.lensShader && this.lensShader.enabled) {
            this.lensShader.render(
                this.bgCanvas,
                this.centerX,
                this.centerY,
                CONFIG.BLACK_HOLE_RADIUS * 2.5,
                this.time
            );
        }

        // Draw game elements
        this.drawGame();
    }

    gameLoop() {
        const now = performance.now();
        const deltaTime = Math.min(now - this.lastTime, 50); // Cap at 50ms
        this.lastTime = now;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame(() => this.gameLoop());
    }

    // UI Helpers
    updateScore() {
        if (this.scoreEl) {
            this.scoreEl.textContent = this.score;
            this.scoreEl.style.animation = 'none';
            this.scoreEl.offsetHeight; // Trigger reflow
            this.scoreEl.style.animation = 'scorePulse 0.3s ease-out';
        }
    }

    updateHighScore() {
        if (this.highScoreEl) {
            this.highScoreEl.textContent = this.highScore;
        }
    }

    showStartMessage() {
        if (this.msgEl) {
            this.msgEl.style.display = 'block';
        }
    }

    hideStartMessage() {
        if (this.msgEl) {
            this.msgEl.style.display = 'none';
        }
    }

    showGameOver() {
        // Check for new high score
        const isNewHighScore = this.score > this.highScore;

        if (isNewHighScore && this.score > 0) {
            this.highScore = this.score;
            HighScoreManager.save(this.highScore);
            this.updateHighScore();
        }

        if (this.gameOverScreen) {
            this.gameOverScreen.style.display = 'flex';
        }
        if (this.gameOverTitleEl) {
            this.gameOverTitleEl.textContent = getRandomGameOverMessage();
        }
        if (this.finalScoreEl) {
            this.finalScoreEl.textContent = this.score;
        }
        if (this.newHighScoreEl) {
            this.newHighScoreEl.style.display = isNewHighScore && this.score > 0 ? 'block' : 'none';
        }

        // Show name input if score > 0 OR if high score exists (allows submitting best)
        if (this.nameInputContainer && (this.score > 0 || this.highScore > 0)) {
            this.nameInputContainer.style.display = 'flex';
            this.scoreSubmitted = false;
            if (this.submitStatus) this.submitStatus.textContent = '';
            if (this.submitScoreBtn) this.submitScoreBtn.disabled = false;
        }

        // Fetch and display leaderboard
        this.fetchLeaderboard();
    }

    hideGameOver() {
        if (this.gameOverScreen) {
            this.gameOverScreen.style.display = 'none';
        }
        if (this.newHighScoreEl) {
            this.newHighScoreEl.style.display = 'none';
        }
        if (this.nameInputContainer) {
            this.nameInputContainer.style.display = 'none';
        }
    }

    async submitToLeaderboard() {
        if (this.scoreSubmitted || !this.playerNameInput) return;

        const name = this.playerNameInput.value.trim() || 'Anonymous';

        // Use current score, or high score if current is 0 (allows submitting best score)
        const scoreToSubmit = this.score > 0 ? this.score : this.highScore;

        if (scoreToSubmit <= 0) {
            if (this.submitStatus) this.submitStatus.textContent = 'No score to submit';
            return;
        }

        if (this.submitScoreBtn) this.submitScoreBtn.disabled = true;
        if (this.submitStatus) this.submitStatus.textContent = 'Submitting...';

        const result = await LeaderboardAPI.submitScore(name, scoreToSubmit);

        if (result.success) {
            this.scoreSubmitted = true;
            if (this.submitStatus) {
                this.submitStatus.textContent = result.message || 'Score submitted!';
            }
            if (this.nameInputContainer) {
                this.nameInputContainer.style.display = 'none';
            }
            // Refresh leaderboard
            this.fetchLeaderboard();
        } else {
            if (this.submitStatus) {
                this.submitStatus.textContent = result.error || 'Failed to submit';
                this.submitStatus.style.color = '#ff6b35';
            }
            if (this.submitScoreBtn) this.submitScoreBtn.disabled = false;
        }
    }

    async fetchLeaderboard() {
        if (!this.leaderboardList) return;

        this.leaderboardList.innerHTML = '<div class="leaderboard-loading">Loading...</div>';

        const leaderboard = await LeaderboardAPI.getLeaderboard();

        if (leaderboard.length === 0) {
            this.leaderboardList.innerHTML = '<div class="leaderboard-loading">No scores yet. Be the first!</div>';
            return;
        }

        this.leaderboardList.innerHTML = leaderboard.map((entry, i) => `
            <div class="leaderboard-entry ${i < 3 ? 'top-3' : ''}">
                <span class="leaderboard-rank">#${i + 1}</span>
                <span class="leaderboard-name">${this.escapeHtml(entry.name)}</span>
                <span class="leaderboard-score">${entry.score}</span>
            </div>
        `).join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ============================================
// INITIALIZE GAME
// ============================================

window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
