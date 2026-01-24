// Flappy Chess - Web Version
// Constants
const BASE_SCREEN_WIDTH = 800;
const BASE_SCREEN_HEIGHT = 600;
let SCREEN_WIDTH = 800;
let SCREEN_HEIGHT = 600;
const FPS = 60;
const GRAVITY = 0.5;
const JUMP_STRENGTH = -8;

// Mobile detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
let scaleFactor = 1.0;

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDt7LutRyy7_bPr1_dLz95r1M2nYmXGjsA",
    authDomain: "flappy-chess-leaderboard.firebaseapp.com",
    databaseURL: "https://flappy-chess-leaderboard-default-rtdb.firebaseio.com",
    projectId: "flappy-chess-leaderboard",
    storageBucket: "flappy-chess-leaderboard.firebasestorage.app",
    messagingSenderId: "701602105763",
    appId: "1:701602105763:web:c28c67d8a864e9c4993216"
};

// Initialize Firebase
let database = null;
try {
    firebase.initializeApp(firebaseConfig);
    database = firebase.database();
    console.log('Firebase initialized successfully');
} catch (error) {
    console.warn('Firebase initialization failed:', error);
    console.warn('Leaderboard features will be disabled');
}

// Colors
const WHITE = '#FFFFFF';
const BLACK = '#000000';
const RED = '#FF0000';

// Game state
let canvas, ctx;
let gameState = 'loading'; // 'loading', 'title', 'playing', 'game_over', 'shop'
let shopState = 'main'; // 'main', 'skins', 'backgrounds'
let paused = false;
let images = {};
let sounds = {};

// Leaderboard state
let showNameInput = false;
let pendingScore = 0;
let leaderboardData = [];

// Audio - specific order
let musicFiles = [
    'stadium bites 134.mp3',
    'beautiful fields 138.mp3',
    'booyeah 120.mp3',
    'trinity 150.mp3'
];
let currentMusicIndex = 0;
let backgroundMusic = null;
let pointSound = null;
let musicPlaying = false;
let musicTimer = 0;
const musicSwitchInterval = 90 * 60; // 90 seconds in frames (at 60 FPS)
let musicSpeed = 1.0; // Playback speed multiplier

// Game objects
let player = null;
let chessPieces = [];
let score = 0;
let gameOver = false;
let spawnTimer = 0;
let spawnDelay = 90;

// Coin system
let totalCoins = 0;
let coinsEarnedThisGame = 0;

// Title screen assets
let logo = null;
let startButton = null;
let startButtonRect = null;
let shopButton = null;
let shopButtonRect = null;
let background = null;

// Shop assets
let skinsShopButton = null;
let skinsShopButtonRect = null;
let backgroundsShopButton = null;
let backgroundsShopButtonRect = null;
let backButtonRect = null;

// Shop data
let purchasedSkins = [];
let purchasedBackgrounds = [];
let selectedSkin = 'default';
let selectedBackground = 'default';

// Fonts
let font = '36px Arial';
let bigFont = '72px Arial';

// Calculate responsive dimensions
function calculateScreenDimensions() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    // Maintain aspect ratio
    const baseAspect = BASE_SCREEN_WIDTH / BASE_SCREEN_HEIGHT;
    const windowAspect = windowWidth / windowHeight;
    
    if (windowAspect > baseAspect) {
        // Window is wider - fit to height
        SCREEN_HEIGHT = Math.min(windowHeight, BASE_SCREEN_HEIGHT);
        SCREEN_WIDTH = SCREEN_HEIGHT * baseAspect;
    } else {
        // Window is taller - fit to width
        SCREEN_WIDTH = Math.min(windowWidth, BASE_SCREEN_WIDTH);
        SCREEN_HEIGHT = SCREEN_WIDTH / baseAspect;
    }
    
    // For mobile, use full screen
    if (isMobile) {
        SCREEN_WIDTH = windowWidth;
        SCREEN_HEIGHT = windowHeight;
    }
    
    scaleFactor = SCREEN_WIDTH / BASE_SCREEN_WIDTH;
    
    // Update fonts based on scale
    const baseFontSize = isMobile ? 24 : 36;
    const baseBigFontSize = isMobile ? 48 : 72;
    font = `${Math.round(baseFontSize * scaleFactor)}px Arial`;
    bigFont = `${Math.round(baseBigFontSize * scaleFactor)}px Arial`;
    
    // Update canvas size
    if (canvas) {
        canvas.width = SCREEN_WIDTH;
        canvas.height = SCREEN_HEIGHT;
        canvas.style.width = SCREEN_WIDTH + 'px';
        canvas.style.height = SCREEN_HEIGHT + 'px';
    }
}

// Load all images
async function loadImages() {
    const imageFiles = {
        background: 'Background.png',
        logo: 'citadell games logo.png',
        startButton: 'start game button.png',
        shopButton: 'shop button.png',
        skinsShopButton: 'skins item shop button.png',
        backgroundsShopButton: 'background item shop button.png',
        jetpackFly: 'jetpack fly rough.png',
        jetpackFlyGold: 'jetpack fly gold skin.png',
        jetpackFlySilver: 'jetpack fly silver skin.png',
        jetpackFlyBronze: 'jetpack fly bronze skin.png',
        jetpackFlyTin: 'jetpack fly tin robot skin.png',
        jetpackFlyCopper: 'jetpack fly copper robot skin.png',
        // New skins
        jetpackFlyArcticResearcher: 'arctic researcher skin jetpack fly.png',
        jetpackFlyLegendaryCrazedRobot: 'legendary crazed robot skin jetpack fly.png',
        jetpackFlyLegendaryCyborg: 'legendary cyborg skin jetpack fly.png',
        jetpackFlyLegendaryMage: 'legendary mage skin jetpack fly.png',
        jetpackFlyLegendarySamurai: 'legendary samurai skin jetpack fly.png',
        jetpackFlyLongHair: 'long hair skin jetpack fly.png',
        jetpackFlyMerchant: 'merchant skin jetpack fly.png',
        jetpackFlyPirate: 'pirate skin jetpack fly.png',
        jetpackFlyRareCat: 'rare cat skin jetpack fly.png',
        jetpackFlyRareFish: 'rare fish skin jetpack fly.png',
        jetpackFlyRareGorilla: 'rare gorilla skin jetpack fly.png',
        jetpackFlyRareIceMonster: 'rare ice monster skin jetpack fly.png',
        jetpackFlySteampunkGorilla: 'steampunk gorilla skin jetpack fly.png',
        jetpackFlySteamshipPilot: 'steamship pilot skin jetpack fly.png',
        hatGold: 'golden hat.png',
        hatSilver: 'silver hat.png',
        hatBronze: 'bronze hat.png',
        coin: 'coin.png',
        // Shop thumbnails
        thumbnailDefault: 'default jetpack man thumbnail.png',
        thumbnailTin: 'tin robot thumbnail.png',
        thumbnailCopper: 'copper robot thumbnail.png',
        thumbnailArcticResearcher: 'arctic researcher skin thumbnail.png',
        thumbnailLegendaryCrazedRobot: 'legendary crazed robot skin thumbnail.png',
        thumbnailLegendaryCyborg: 'legendary cyborg skin thumbnail.png',
        thumbnailLegendaryMage: 'legendary mage skin thumbnail.png',
        thumbnailLegendarySamurai: 'legendary samurai skin thumbnail.png',
        thumbnailLongHair: 'long hair skin thumbnail.png',
        thumbnailMerchant: 'merchant skin thumbnail.png',
        thumbnailPirate: 'pirate skin thubmnail.png',
        thumbnailRareCat: 'rare cat skin thumbnail.png',
        thumbnailRareFish: 'rare fish skin thumbnail.png',
        thumbnailRareGorilla: 'Rare Gorilla skin thumbnail.png',
        thumbnailRareIceMonster: 'rare ice monster skin thumbnail.png',
        thumbnailSteampunkGorilla: 'steampunk gorilla skin thumbnail.png',
        thumbnailSteamshipPilot: 'steamship pilot skin thumbnail.png',
        // Backgrounds
        backgroundMarshland: 'marshland background.png',
        backgroundMountain: 'mountain background.png',
        backgroundSteampunkArctic: 'steampunk arctic background.png',
        backgroundSteampunkJapan: 'steampunk japan background.png',
        backgroundSteampunkJungle: 'steampunk jungle background.png',
        backgroundSteampunkTradingHub: 'steampunk trading hub background.png',
        backgroundSteampunkWaterworld: 'steampunk waterworld background.png',
        // Chess pieces
        W_Pawn: 'W_Pawn.png',
        W_Rook: 'W_Rook.png',
        W_Knight: 'W_Knight.png',
        W_Bishop: 'W_Bishop.png',
        W_Queen: 'W_Queen.png',
        W_King: 'W_King.png',
        B_Pawn: 'B_Pawn.png',
        B_Rook: 'B_Rook.png',
        B_Knight: 'B_Knight.png',
        B_Bishop: 'B_Bishop.png',
        B_Queen: 'B_Queen.png',
        B_King: 'B_King.png'
    };

    const loadPromises = Object.entries(imageFiles).map(([key, path]) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const timeout = setTimeout(() => {
                console.warn(`Timeout loading image: ${path}`);
                resolve(); // Continue even if image times out
            }, 10000); // 10 second timeout per image
            
            img.onload = () => {
                clearTimeout(timeout);
                images[key] = img;
                resolve();
            };
            img.onerror = () => {
                clearTimeout(timeout);
                console.warn(`Failed to load image: ${path}`);
                resolve(); // Continue even if image fails
            };
            img.src = path;
        });
    });

    try {
        await Promise.all(loadPromises);
    } catch (error) {
        console.error('Error loading images:', error);
        // Continue anyway - game can work with missing images
    }
    
    // Process images
    if (images.background) {
        background = images.background;
    }
    
    if (images.logo) {
        logo = images.logo;
        // Scale logo
        const logoWidth = 150;
        const logoHeight = (logo.height * logoWidth) / logo.width;
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = logoWidth;
        logoCanvas.height = logoHeight;
        const logoCtx = logoCanvas.getContext('2d');
        logoCtx.drawImage(logo, 0, 0, logoWidth, logoHeight);
        logo = logoCanvas;
    }
    
    if (images.startButton) {
        const fullButton = images.startButton;
        // Cut in half horizontally (take top half)
        const buttonWidth = fullButton.width;
        const buttonHeight = Math.floor(fullButton.height / 2);
        const buttonCanvas = document.createElement('canvas');
        buttonCanvas.width = buttonWidth;
        buttonCanvas.height = buttonHeight;
        const buttonCtx = buttonCanvas.getContext('2d');
        buttonCtx.drawImage(fullButton, 0, 0, buttonWidth, buttonHeight, 0, 0, buttonWidth, buttonHeight);
        
        // Scale to 200px wide
        const scaledWidth = 200;
        const scaledHeight = (buttonHeight * scaledWidth) / buttonWidth;
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = scaledWidth;
        scaledCanvas.height = scaledHeight;
        const scaledCtx = scaledCanvas.getContext('2d');
        scaledCtx.drawImage(buttonCanvas, 0, 0, scaledWidth, scaledHeight);
        startButton = scaledCanvas;
        startButtonRect = {
            x: SCREEN_WIDTH / 2 - scaledWidth / 2,
            y: SCREEN_HEIGHT / 2 - 50 - scaledHeight / 2,
            width: scaledWidth,
            height: scaledHeight
        };
    }
    
    if (images.shopButton) {
        const shopBtn = images.shopButton;
        const buttonWidth = startButton ? startButton.width : 200;
        const buttonHeight = (shopBtn.height * buttonWidth) / shopBtn.width;
        const shopCanvas = document.createElement('canvas');
        shopCanvas.width = buttonWidth;
        shopCanvas.height = buttonHeight;
        const shopCtx = shopCanvas.getContext('2d');
        shopCtx.drawImage(shopBtn, 0, 0, buttonWidth, buttonHeight);
        shopButton = shopCanvas;
        shopButtonRect = {
            x: SCREEN_WIDTH / 2 - buttonWidth / 2,
            y: SCREEN_HEIGHT / 2 + 50 - buttonHeight / 2,
            width: buttonWidth,
            height: buttonHeight
        };
    }
    
    // Process shop navigation buttons
    if (images.skinsShopButton) {
        const btn = images.skinsShopButton;
        const buttonWidth = 200 * scaleFactor;
        const buttonHeight = (btn.height * buttonWidth) / btn.width;
        const btnCanvas = document.createElement('canvas');
        btnCanvas.width = buttonWidth;
        btnCanvas.height = buttonHeight;
        const btnCtx = btnCanvas.getContext('2d');
        btnCtx.drawImage(btn, 0, 0, buttonWidth, buttonHeight);
        skinsShopButton = btnCanvas;
        skinsShopButtonRect = {
            x: SCREEN_WIDTH / 2 - buttonWidth / 2,
            y: SCREEN_HEIGHT / 2 - 50 - buttonHeight / 2,
            width: buttonWidth,
            height: buttonHeight
        };
    }
    
    if (images.backgroundsShopButton) {
        const btn = images.backgroundsShopButton;
        const buttonWidth = 200 * scaleFactor;
        const buttonHeight = (btn.height * buttonWidth) / btn.width;
        const btnCanvas = document.createElement('canvas');
        btnCanvas.width = buttonWidth;
        btnCanvas.height = buttonHeight;
        const btnCtx = btnCanvas.getContext('2d');
        btnCtx.drawImage(btn, 0, 0, buttonWidth, buttonHeight);
        backgroundsShopButton = btnCanvas;
        backgroundsShopButtonRect = {
            x: SCREEN_WIDTH / 2 - buttonWidth / 2,
            y: SCREEN_HEIGHT / 2 + 50 - buttonHeight / 2,
            width: buttonWidth,
            height: buttonHeight
        };
    }
    
    // Back button rect (text-based, no image)
    backButtonRect = {
        x: 10 * scaleFactor,
        y: 10 * scaleFactor,
        width: 100 * scaleFactor,
        height: 40 * scaleFactor
    };
    
    // Process jetpack animation frames for all skins
    // Default, Gold, Silver, Bronze, Tin, Copper are 4-frame (2x2 grid)
    if (images.jetpackFly) {
        processJetpackFrames(images.jetpackFly, 'default', 4);
    }
    if (images.jetpackFlyGold) {
        processJetpackFrames(images.jetpackFlyGold, 'gold', 4);
    }
    if (images.jetpackFlySilver) {
        processJetpackFrames(images.jetpackFlySilver, 'silver', 4);
    }
    if (images.jetpackFlyBronze) {
        processJetpackFrames(images.jetpackFlyBronze, 'bronze', 4);
    }
    if (images.jetpackFlyTin) {
        processJetpackFrames(images.jetpackFlyTin, 'tin', 4);
    }
    // Copper robot temporarily disabled due to frame issues
    // if (images.jetpackFlyCopper) {
    //     processJetpackFrames(images.jetpackFlyCopper, 'copper', 3);
    // }
    
    // New skins - process all (defaulting to 4 frames, can be adjusted per skin)
    // Skins with 3 frames side-by-side: copper, pirate, longHair, arcticResearcher, merchant, rareIceMonster, legendaryCyborg, legendarySamurai
    const newSkins = [
        { key: 'jetpackFlyArcticResearcher', type: 'arcticResearcher', frames: 3 },
        { key: 'jetpackFlyLegendaryCrazedRobot', type: 'legendaryCrazedRobot', frames: 4 },
        { key: 'jetpackFlyLegendaryCyborg', type: 'legendaryCyborg', frames: 3 },
        { key: 'jetpackFlyLegendaryMage', type: 'legendaryMage', frames: 4 },
        { key: 'jetpackFlyLegendarySamurai', type: 'legendarySamurai', frames: 3 },
        { key: 'jetpackFlyLongHair', type: 'longHair', frames: 3 },
        { key: 'jetpackFlyMerchant', type: 'merchant', frames: 3 },
        { key: 'jetpackFlyPirate', type: 'pirate', frames: 3 },
        { key: 'jetpackFlyRareCat', type: 'rareCat', frames: 4 },
        { key: 'jetpackFlyRareFish', type: 'rareFish', frames: 4 },
        { key: 'jetpackFlyRareGorilla', type: 'rareGorilla', frames: 4 },
        { key: 'jetpackFlyRareIceMonster', type: 'rareIceMonster', frames: 3 },
        { key: 'jetpackFlySteampunkGorilla', type: 'steampunkGorilla', frames: 4 },
        { key: 'jetpackFlySteamshipPilot', type: 'steamshipPilot', frames: 4 }
    ];
    
    newSkins.forEach(skin => {
        if (images[skin.key]) {
            processJetpackFrames(images[skin.key], skin.type, skin.frames);
        }
    });
    
    // Initialize player skin based on leaderboard rank
    updatePlayerSkin();
    
    gameState = 'title';
    document.getElementById('loading').style.display = 'none';
    document.getElementById('gameCanvas').style.display = 'block';
    
    // Start background music
    if (!musicPlaying) {
        playBackgroundMusic();
    }
}

function processJetpackFrames(spriteSheet, skinType = 'default', frameCount = 4) {
    const framesKey = skinType === 'default' ? 'jetpackFrames' : `jetpackFrames${skinType.charAt(0).toUpperCase() + skinType.slice(1)}`;
    images[framesKey] = [];
    
    if (frameCount === 3) {
        // 3 frames side by side - each frame is exactly 1/3 of the width
        const totalWidth = spriteSheet.width;
        const frameWidth = Math.floor(totalWidth / 3);
        const frameHeight = spriteSheet.height;
        
        for (let col = 0; col < 3; col++) {
            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = frameWidth;
            frameCanvas.height = frameHeight;
            const frameCtx = frameCanvas.getContext('2d');
            
            // Clear canvas to ensure transparency
            frameCtx.clearRect(0, 0, frameWidth, frameHeight);
            
            // Enable image smoothing for better quality
            frameCtx.imageSmoothingEnabled = true;
            frameCtx.imageSmoothingQuality = 'high';
            
            // Calculate exact source coordinates - use same width for all frames to avoid stretching
            const sourceX = col * frameWidth;
            const sourceY = 0;
            const sourceWidth = frameWidth; // Use consistent width, not variable
            const sourceHeight = frameHeight;
            
            // Draw the frame - source and destination dimensions must match to avoid distortion
            frameCtx.drawImage(
                spriteSheet,
                sourceX, sourceY,
                sourceWidth, sourceHeight,
                0, 0,
                frameWidth, frameHeight
            );
            
            images[framesKey].push(frameCanvas);
        }
    } else {
        // 4 frames in 2x2 grid (default) - each frame is exactly 1/2 width and 1/2 height
        const totalWidth = spriteSheet.width;
        const totalHeight = spriteSheet.height;
        const frameWidth = Math.floor(totalWidth / 2);
        const frameHeight = Math.floor(totalHeight / 2);
        
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 2; col++) {
                const frameCanvas = document.createElement('canvas');
                frameCanvas.width = frameWidth;
                frameCanvas.height = frameHeight;
                const frameCtx = frameCanvas.getContext('2d');
                
                // Clear canvas to ensure transparency
                frameCtx.clearRect(0, 0, frameWidth, frameHeight);
                
                // Enable image smoothing for better quality
                frameCtx.imageSmoothingEnabled = true;
                frameCtx.imageSmoothingQuality = 'high';
                
                // Calculate exact source coordinates - use same dimensions for all frames
                const sourceX = col * frameWidth;
                const sourceY = row * frameHeight;
                const sourceWidth = frameWidth; // Use consistent width
                const sourceHeight = frameHeight; // Use consistent height
                
                // Draw the frame - source and destination dimensions must match to avoid distortion
                frameCtx.drawImage(
                    spriteSheet,
                    sourceX, sourceY,
                    sourceWidth, sourceHeight,
                    0, 0,
                    frameWidth, frameHeight
                );
                
                images[framesKey].push(frameCanvas);
            }
        }
    }
}

// Get player's leaderboard rank
function getPlayerRank() {
    const playerName = localStorage.getItem('flappyChessPlayerName');
    if (!playerName || !leaderboardData || leaderboardData.length === 0) {
        return null;
    }
    
    // Find player's rank in leaderboard
    for (let i = 0; i < leaderboardData.length; i++) {
        if (leaderboardData[i].name === playerName) {
            return i + 1; // Rank is 1-indexed
        }
    }
    return null;
}

// Update player skin based on leaderboard rank (only overrides default skin) or selected skin
function updatePlayerSkin() {
    const rank = getPlayerRank();
    let framesKey = 'jetpackFrames'; // Default
    
    // Rank-based skins only override if default skin is selected
    // Robot skins (tin) are never overridden by rank-based skins
    if (selectedSkin === 'default') {
        // Only override default skin with rank-based skins
        if (rank === 1) {
            framesKey = 'jetpackFramesGold';
        } else if (rank === 2) {
            framesKey = 'jetpackFramesSilver';
        } else if (rank === 3) {
            framesKey = 'jetpackFramesBronze';
        } else {
            framesKey = 'jetpackFrames'; // Default
        }
    } else {
        // Use selected skin (robot skins are never overridden)
        // Map all skin IDs to their frame keys
        const skinFrameMap = {
            'tin': 'jetpackFramesTin',
            'arcticResearcher': 'jetpackFramesArcticResearcher',
            'legendaryCrazedRobot': 'jetpackFramesLegendaryCrazedRobot',
            'legendaryCyborg': 'jetpackFramesLegendaryCyborg',
            'legendaryMage': 'jetpackFramesLegendaryMage',
            'legendarySamurai': 'jetpackFramesLegendarySamurai',
            'longHair': 'jetpackFramesLongHair',
            'merchant': 'jetpackFramesMerchant',
            'pirate': 'jetpackFramesPirate',
            'rareCat': 'jetpackFramesRareCat',
            'rareFish': 'jetpackFramesRareFish',
            'rareGorilla': 'jetpackFramesRareGorilla',
            'rareIceMonster': 'jetpackFramesRareIceMonster',
            'steampunkGorilla': 'jetpackFramesSteampunkGorilla',
            'steamshipPilot': 'jetpackFramesSteamshipPilot'
        };
        
        framesKey = skinFrameMap[selectedSkin] || 'jetpackFrames'; // Default fallback
    }
    
    // Update frames if they exist
    if (images[framesKey] && images[framesKey].length > 0) {
        // Create a copy of the frames array to avoid reference issues
        images.jetpackFrames = [...images[framesKey]];
        // Update current player if exists
        if (player) {
            // Create a new array reference for the player to ensure isolation
            player.frames = [...images[framesKey]];
        }
    }
}

// JetpackMan class
class JetpackMan {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.velocity = 0;
        this.width = 60;
        this.height = 60;
        this.currentFrame = 0;
        this.animationTimer = 0;
        this.animationSpeed = 8;
        // Use current jetpack frames (will be updated based on rank)
        // Create a copy to ensure frame isolation
        this.frames = images.jetpackFrames ? [...images.jetpackFrames] : [];
    }
    
    update() {
        this.velocity += GRAVITY;
        this.y += this.velocity;
        
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
        if (this.y > SCREEN_HEIGHT - this.height) {
            this.y = SCREEN_HEIGHT - this.height;
            this.velocity = 0;
        }
        
        this.animationTimer++;
        if (this.animationTimer >= this.animationSpeed) {
            this.animationTimer = 0;
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
        }
    }
    
    jump() {
        this.velocity = JUMP_STRENGTH;
    }
    
    draw(ctx) {
        if (this.frames[this.currentFrame]) {
            // Save context state
            ctx.save();
            // Ensure transparency is preserved
            ctx.globalCompositeOperation = 'source-over';
            // Draw the frame (transparency should be preserved automatically)
            ctx.drawImage(this.frames[this.currentFrame], this.x, this.y, this.width, this.height);
            // Restore context state
            ctx.restore();
        }
    }
    
    getRect() {
        // Make hitbox smaller (70% of original size, centered) for more forgiving gameplay
        const hitboxWidth = Math.floor(this.width * 0.7);
        const hitboxHeight = Math.floor(this.height * 0.7);
        const hitboxX = this.x + Math.floor((this.width - hitboxWidth) / 2);
        const hitboxY = this.y + Math.floor((this.height - hitboxHeight) / 2);
        return { x: hitboxX, y: hitboxY, width: hitboxWidth, height: hitboxHeight };
    }
}

// ChessPiece class
class ChessPiece {
    constructor(pieceType, x, y) {
        this.pieceType = pieceType;
        this.x = x;
        this.y = y;
        this.width = pieceType === 'King' ? 70 : 50;
        this.height = pieceType === 'King' ? 70 : 50;
        
        // Load image
        const color = Math.random() < 0.5 ? 'W' : 'B';
        const imageKey = `${color}_${pieceType}`;
        this.image = images[imageKey] || null;
        
        this.setupMovement();
        
        this.moveTimer = 0;
        this.spawnAge = 0;
        this.verticalDirection = Math.random() < 0.5 ? 1 : -1;
        
        // Ensure horizontalSpeed is set
        if (!this.horizontalSpeed || isNaN(this.horizontalSpeed)) {
            this.horizontalSpeed = (Math.random() * (14.0 - 3.5) + 3.5) * 0.8 * (2/3);
        }
        
        // Ensure verticalSpeed is set (default to 0 if not set)
        if (this.verticalSpeed === undefined || isNaN(this.verticalSpeed)) {
            this.verticalSpeed = 0;
        }
    }
    
    setupMovement() {
        if (this.pieceType === 'Pawn') {
            this.verticalSpeed = 0;
            this.diagonalHorizontal = 0;
            this.horizontalSpeed = (Math.random() * (14.0 - 3.5) + 3.5) * 0.8 * (2/3);  // 1/3 slower
        } else if (this.pieceType === 'Rook') {
            this.verticalSpeed = 4.6 * (2/3);  // 1/3 slower
            this.diagonalHorizontal = 0;
            this.horizontalSpeed = (Math.random() * (14.0 - 3.5) + 3.5) * 0.8 * 0.5 * (2/3);  // 1/3 slower
        } else if (this.pieceType === 'Knight') {
            this.squareSize = 60;
            this.verticalJump = 2 * this.squareSize;
            this.horizontalJump = 1 * this.squareSize;
            this.knightState = null;
            this.knightTargetY = null;
            this.knightTargetX = null;
            this.knightMoveSpeed = 8 * (2/3) * 0.85;  // 1/3 slower, then 15% slower
            this.verticalSpeed = 0;
            this.diagonalHorizontal = 0;
            this.horizontalSpeed = (Math.random() * (14.0 - 3.5) + 3.5) * 0.8 * (2/3);  // 1/3 slower
        } else if (this.pieceType === 'Bishop') {
            this.verticalSpeed = 5 * (2/3);  // 1/3 slower
            this.diagonalHorizontal = 0;
            this.horizontalSpeed = 5 * (2/3);  // 1/3 slower
        } else if (this.pieceType === 'Queen') {
            const movementTypes = ['rook', 'bishop', 'knight', 'pawn'];
            this.queenMovementType = movementTypes[Math.floor(Math.random() * movementTypes.length)];
            
            if (this.queenMovementType === 'rook') {
                this.verticalSpeed = 4.6 * (2/3);  // 1/3 slower
                this.diagonalHorizontal = 0;
                this.horizontalSpeed = (Math.random() * (14.0 - 3.5) + 3.5) * 0.8 * 0.5 * (2/3);  // 1/3 slower
            } else if (this.queenMovementType === 'bishop') {
                this.verticalSpeed = 5 * (2/3);  // 1/3 slower
                this.diagonalHorizontal = 0;
                this.horizontalSpeed = 5 * (2/3);  // 1/3 slower
            } else if (this.queenMovementType === 'knight') {
                this.squareSize = 60;
                this.verticalJump = 2 * this.squareSize;
                this.horizontalJump = 1 * this.squareSize;
                this.knightState = null;
                this.knightTargetY = null;
                this.knightTargetX = null;
                this.knightMoveSpeed = 8 * (2/3) * 0.85;  // 1/3 slower, then 15% slower
                this.verticalSpeed = 0;
                this.diagonalHorizontal = 0;
                this.horizontalSpeed = (Math.random() * (14.0 - 3.5) + 3.5) * 0.8 * (2/3);  // 1/3 slower
            } else {
                this.verticalSpeed = 0;
                this.diagonalHorizontal = 0;
                this.horizontalSpeed = (Math.random() * (14.0 - 3.5) + 3.5) * 0.8 * (2/3);  // 1/3 slower
            }
        } else if (this.pieceType === 'King') {
            this.verticalSpeed = 0;
            this.diagonalHorizontal = 0;
            this.horizontalSpeed = (Math.random() * (14.0 - 3.5) + 3.5) * 0.8 * 0.5 * (2/3);  // 1/3 slower
        } else {
            this.verticalSpeed = 0;
            this.diagonalHorizontal = 0;
            this.horizontalSpeed = (Math.random() * (14.0 - 3.5) + 3.5) * 0.8 * (2/3);  // 1/3 slower
        }
    }
    
    update(speedMultiplier = 1.0) {
        this.spawnAge++;
        
        // Ensure speedMultiplier is a valid number
        if (isNaN(speedMultiplier) || !isFinite(speedMultiplier)) {
            speedMultiplier = 1.0;
        }
        
        // Apply speed multiplier to all movement, ensure values are valid numbers
        const effectiveHorizontalSpeed = (this.horizontalSpeed || 0) * speedMultiplier;
        const effectiveVerticalSpeed = (this.verticalSpeed || 0) * speedMultiplier;
        const effectiveKnightMoveSpeed = (this.knightMoveSpeed || 0) * speedMultiplier;
        
        // Safety check: if any speed is NaN or invalid, use 0
        if (isNaN(effectiveHorizontalSpeed) || !isFinite(effectiveHorizontalSpeed)) {
            console.warn('Invalid horizontalSpeed for piece:', this.pieceType);
            return;
        }
        if (isNaN(effectiveVerticalSpeed) || !isFinite(effectiveVerticalSpeed)) {
            console.warn('Invalid verticalSpeed for piece:', this.pieceType);
            return;
        }
        
        const isKnight = this.pieceType === 'Knight' || 
            (this.pieceType === 'Queen' && this.queenMovementType === 'knight');
        
        if (isKnight) {
            // Knight L-shape movement
            if (this.knightState === null) {
                this.knightState = 'vertical';
                this.verticalDirection = Math.random() < 0.5 ? 1 : -1;
                this.knightTargetY = this.y + (this.verticalJump * this.verticalDirection);
                if (this.knightTargetY < 0) {
                    this.knightTargetY = 0;
                    this.verticalDirection = 1;
                } else if (this.knightTargetY > SCREEN_HEIGHT - this.height) {
                    this.knightTargetY = SCREEN_HEIGHT - this.height;
                    this.verticalDirection = -1;
                }
            }
            
            if (this.knightState === 'vertical') {
                const distanceToTarget = Math.abs(this.knightTargetY - this.y);
                // Safety check: if effectiveKnightMoveSpeed is 0 or invalid, snap to target
                if (effectiveKnightMoveSpeed <= 0 || isNaN(effectiveKnightMoveSpeed) || !isFinite(effectiveKnightMoveSpeed)) {
                    this.y = this.knightTargetY;
                    this.knightState = 'horizontal';
                    this.knightTargetX = this.x - (this.horizontalJump || 60);
                } else if (distanceToTarget > effectiveKnightMoveSpeed) {
                    if (this.y < this.knightTargetY) {
                        this.y += effectiveKnightMoveSpeed;
                    } else {
                        this.y -= effectiveKnightMoveSpeed;
                    }
                } else {
                    this.y = this.knightTargetY;
                    this.knightState = 'horizontal';
                    this.knightTargetX = this.x - (this.horizontalJump || 60);
                }
            } else if (this.knightState === 'horizontal') {
                const distanceToTarget = Math.abs(this.knightTargetX - this.x);
                // Safety check: if effectiveKnightMoveSpeed is 0 or invalid, snap to target
                if (effectiveKnightMoveSpeed <= 0 || isNaN(effectiveKnightMoveSpeed) || !isFinite(effectiveKnightMoveSpeed)) {
                    this.x = this.knightTargetX;
                    this.knightState = 'vertical';
                    if (this.y <= 0) {
                        this.verticalDirection = 1;
                    } else if (this.y >= SCREEN_HEIGHT - this.height) {
                        this.verticalDirection = -1;
                    } else {
                        this.verticalDirection = Math.random() < 0.5 ? 1 : -1;
                    }
                    this.knightTargetY = this.y + ((this.verticalJump || 120) * this.verticalDirection);
                    if (this.knightTargetY < 0) {
                        this.knightTargetY = 0;
                    } else if (this.knightTargetY > SCREEN_HEIGHT - this.height) {
                        this.knightTargetY = SCREEN_HEIGHT - this.height;
                    }
                } else if (distanceToTarget > effectiveKnightMoveSpeed) {
                    if (this.x > this.knightTargetX) {
                        this.x -= effectiveKnightMoveSpeed;
                    }
                } else {
                    this.x = this.knightTargetX;
                    this.knightState = 'vertical';
                    if (this.y <= 0) {
                        this.verticalDirection = 1;
                    } else if (this.y >= SCREEN_HEIGHT - this.height) {
                        this.verticalDirection = -1;
                    } else {
                        this.verticalDirection = Math.random() < 0.5 ? 1 : -1;
                    }
                    this.knightTargetY = this.y + ((this.verticalJump || 120) * this.verticalDirection);
                    if (this.knightTargetY < 0) {
                        this.knightTargetY = 0;
                    } else if (this.knightTargetY > SCREEN_HEIGHT - this.height) {
                        this.knightTargetY = SCREEN_HEIGHT - this.height;
                    }
                }
            }
        } else {
            // Normal movement
            this.x -= effectiveHorizontalSpeed;
            const verticalMovement = effectiveVerticalSpeed * this.verticalDirection;
            this.y += verticalMovement;
            
            // Boundary check
            if (this.y <= 0) {
                this.y = 0;
                this.verticalDirection = 1;
            } else if (this.y >= SCREEN_HEIGHT - this.height) {
                this.y = SCREEN_HEIGHT - this.height;
                this.verticalDirection = -1;
            }
        }
        
        // Queen movement type change
        if (this.pieceType === 'Queen' && Math.random() < 0.05) {
            const movementTypes = ['rook', 'bishop', 'knight', 'pawn'];
            this.queenMovementType = movementTypes[Math.floor(Math.random() * movementTypes.length)];
            
            if (this.queenMovementType === 'rook') {
                this.verticalSpeed = 4.6 * (2/3);  // 1/3 slower
                this.diagonalHorizontal = 0;
                this.horizontalSpeed = (Math.random() * (14.0 - 3.5) + 3.5) * 0.8 * 0.5 * (2/3);  // 1/3 slower
            } else if (this.queenMovementType === 'bishop') {
                this.verticalSpeed = 5 * (2/3);  // 1/3 slower
                this.diagonalHorizontal = 0;
                this.horizontalSpeed = 5 * (2/3);  // 1/3 slower
            } else if (this.queenMovementType === 'knight') {
                this.squareSize = 60;
                this.verticalJump = 2 * this.squareSize;
                this.horizontalJump = 1 * this.squareSize;
                this.knightState = null;
                this.knightTargetY = null;
                this.knightTargetX = null;
                this.knightMoveSpeed = 8 * (2/3) * 0.85;  // 1/3 slower, then 15% slower
                this.verticalSpeed = 0;
                this.diagonalHorizontal = 0;
                this.horizontalSpeed = (Math.random() * (14.0 - 3.5) + 3.5) * 0.8 * (2/3);  // 1/3 slower
            } else {
                this.verticalSpeed = 0;
                this.diagonalHorizontal = 0;
                this.horizontalSpeed = (Math.random() * (14.0 - 3.5) + 3.5) * 0.8 * (2/3);  // 1/3 slower
            }
        }
    }
    
    draw(ctx) {
        if (this.image) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
    }
    
    getRect() {
        // Make hitbox smaller (80% of original size, centered)
        const hitboxWidth = Math.floor(this.width * 0.8);
        const hitboxHeight = Math.floor(this.height * 0.8);
        const hitboxX = this.x + Math.floor((this.width - hitboxWidth) / 2);
        const hitboxY = this.y + Math.floor((this.height - hitboxHeight) / 2);
        return { x: hitboxX, y: hitboxY, width: hitboxWidth, height: hitboxHeight };
    }
}

// Audio functions
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function loadAudio() {
    // Music is in fixed order, no shuffling
    currentMusicIndex = 0;
    musicSpeed = 1.0;
    
    // Load point sound
    pointSound = new Audio('SFX-06.wav');
    pointSound.volume = 0.7;
}

function playBackgroundMusic() {
    if (musicFiles.length > 0) {
        if (backgroundMusic) {
            backgroundMusic.pause();
            backgroundMusic = null;
        }
        
        backgroundMusic = new Audio(musicFiles[currentMusicIndex]);
        backgroundMusic.volume = 0.5;
        backgroundMusic.loop = false;
        
        // Set playback speed based on current score
        // Speed increases by 0.1 for every 10 points, max 2.0x speed
        const newSpeed = Math.min(1.0 + Math.floor(score / 10) * 0.1, 2.0);
        backgroundMusic.playbackRate = newSpeed;
        musicSpeed = newSpeed;
        
        // Continue playing music in sequence
        backgroundMusic.onended = () => {
            // Continue playing music regardless of game state
            currentMusicIndex = (currentMusicIndex + 1) % musicFiles.length;
            musicTimer = 0; // Reset timer
            playBackgroundMusic();
        };
        
        // Try to play music
        const playPromise = backgroundMusic.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    musicPlaying = true;
                    console.log('Music started playing');
                })
                .catch(err => {
                    console.warn('Could not play music (autoplay blocked):', err);
                    // Music will start on next user interaction
                    musicPlaying = false;
                });
        }
    }
}

function stopBackgroundMusic() {
    if (backgroundMusic) {
        backgroundMusic.pause();
        backgroundMusic = null;
    }
    musicPlaying = false;
    musicTimer = 0;
    musicSpeed = 1.0; // Reset speed
}

// Game functions
function startGame() {
    // Update player skin before creating player
    updatePlayerSkin();
    
    player = new JetpackMan(100, SCREEN_HEIGHT / 2);
    chessPieces = [];
    score = 0;
    coinsEarnedThisGame = 0;
    gameOver = false;
    paused = false;
    spawnTimer = 0;
    gameState = 'playing';
    showNameInput = false;
    hideLeaderboardButton();
    hideGameOverButtons();
    // Don't reset music timer, speed, or index - keep music playing
    
    // Load leaderboard to check for rank-based skin (will override if needed)
    loadLeaderboard().then(() => {
        updatePlayerSkin();
        if (player && images.jetpackFrames) {
            // Create a copy to ensure isolation
            player.frames = [...images.jetpackFrames];
        }
    });
    
    // Start background music only if not already playing
    if (!musicPlaying) {
        playBackgroundMusic();
    }
}

function hideGameOverButtons() {
    const gameOverButtons = document.getElementById('gameOverButtons');
    if (gameOverButtons) {
        gameOverButtons.style.display = 'none';
    }
}

function showGameOverButtons() {
    if (isMobile && gameState === 'playing' && gameOver && !showNameInput) {
        const gameOverButtons = document.getElementById('gameOverButtons');
        if (gameOverButtons) {
            gameOverButtons.style.display = 'flex';
        }
    }
}

function spawnChessPiece() {
    const pieceTypes = ['Pawn', 'Rook', 'Knight', 'Bishop', 'Queen', 'King'];
    const pieceType = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
    const x = SCREEN_WIDTH + 50;
    const y = Math.random() * (SCREEN_HEIGHT - 100) + 50;
    chessPieces.push(new ChessPiece(pieceType, x, y));
}

function checkCollisions() {
    if (!player) return false;
    const playerRect = player.getRect();
    for (let piece of chessPieces) {
        const pieceRect = piece.getRect();
        if (playerRect.x < pieceRect.x + pieceRect.width &&
            playerRect.x + playerRect.width > pieceRect.x &&
            playerRect.y < pieceRect.y + pieceRect.height &&
            playerRect.y + playerRect.height > pieceRect.y) {
            return true;
        }
    }
    return false;
}

function update() {
    if (gameState !== 'playing') return;
    
    if (paused) return;
    
    if (gameOver) return;
    
    player.update();
    
    spawnTimer++;
    if (spawnTimer >= spawnDelay && chessPieces.length < 5) {
        spawnTimer = 0;
        spawnChessPiece();
    }
    
    // Calculate speed multiplier based on score (gradually increase)
    // Speed increases by 0.1 for every 10 points, max 2.0x speed
    const speedMultiplier = Math.min(1.0 + Math.floor(score / 10) * 0.1, 2.0);
    
    for (let i = chessPieces.length - 1; i >= 0; i--) {
        const piece = chessPieces[i];
        piece.update(speedMultiplier);
        
        if (piece.x < -150) {
            chessPieces.splice(i, 1);
            score++;
            // Play point sound effect
            if (pointSound) {
                pointSound.currentTime = 0;
                pointSound.play().catch(err => console.warn('Could not play sound:', err));
            }
        } else if (piece.x > SCREEN_WIDTH + 200) {
            chessPieces.splice(i, 1);
        } else if (piece.spawnAge > 600) {
            chessPieces.splice(i, 1);
            score++;
            // Play point sound effect
            if (pointSound) {
                pointSound.currentTime = 0;
                pointSound.play().catch(err => console.warn('Could not play sound:', err));
            }
        }
    }
    
    // Music continues playing regardless of game state
    
    if (checkCollisions()) {
        gameOver = true;
        pendingScore = score;
        
        // Calculate and award coins based on final score
        coinsEarnedThisGame = score; // 1 coin per point
        totalCoins += coinsEarnedThisGame;
        saveCoins();
        
        // Check if this is a new high score
        const currentHighScore = getPlayerHighScore();
        if (score > currentHighScore) {
            // New high score! Show name input modal after a short delay
            setTimeout(() => {
                showNameInputModal();
            }, 1000); // Delay to let game over screen render
            // Update high score in localStorage
            setPlayerHighScore(score);
        }
        
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    
    if (gameState === 'title') {
        drawTitleScreen();
    } else if (gameState === 'shop') {
        drawShopScreen();
    } else if (gameState === 'playing') {
        // Draw background
        // Use selected background
        let currentBg = background;
        const bgMap = {
            'marshland': images.backgroundMarshland,
            'mountain': images.backgroundMountain,
            'steampunkArctic': images.backgroundSteampunkArctic,
            'steampunkJapan': images.backgroundSteampunkJapan,
            'steampunkJungle': images.backgroundSteampunkJungle,
            'steampunkTradingHub': images.backgroundSteampunkTradingHub,
            'steampunkWaterworld': images.backgroundSteampunkWaterworld
        };
        if (selectedBackground !== 'default' && bgMap[selectedBackground]) {
            currentBg = bgMap[selectedBackground];
        }
        if (currentBg) {
            ctx.drawImage(currentBg, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        }
        
        if (!gameOver) {
            for (let piece of chessPieces) {
                piece.draw(ctx);
            }
            player.draw(ctx);
            
            ctx.fillStyle = WHITE;
            ctx.font = font;
            ctx.fillText(`Score: ${score}`, 10 * scaleFactor, 30 * scaleFactor);
            
            // Display coins with coin image
            if (images.coin) {
                const coinSize = 30 * scaleFactor;
                ctx.drawImage(images.coin, 10 * scaleFactor, 65 * scaleFactor, coinSize, coinSize);
                ctx.fillStyle = '#FFD700'; // Gold color for text
                ctx.font = font;
                ctx.fillText(`${totalCoins}`, (10 + coinSize + 5) * scaleFactor, (65 + coinSize - 5) * scaleFactor);
            } else {
                ctx.fillStyle = '#FFD700';
                ctx.fillText(`💰 ${totalCoins}`, 10 * scaleFactor, 70 * scaleFactor);
            }
            
            // Draw pause button (scaled for mobile)
            const pauseButtonX = SCREEN_WIDTH - 100 * scaleFactor;
            const pauseButtonY = 10 * scaleFactor;
            const pauseButtonWidth = 90 * scaleFactor;
            const pauseButtonHeight = 30 * scaleFactor;
            ctx.fillStyle = 'rgb(100, 100, 100)';
            ctx.fillRect(pauseButtonX, pauseButtonY, pauseButtonWidth, pauseButtonHeight);
            ctx.strokeStyle = WHITE;
            ctx.lineWidth = 2;
            ctx.strokeRect(pauseButtonX, pauseButtonY, pauseButtonWidth, pauseButtonHeight);
            ctx.fillStyle = WHITE;
            ctx.font = font;
            ctx.textAlign = 'center';
            ctx.fillText('PAUSE', pauseButtonX + pauseButtonWidth / 2, pauseButtonY + pauseButtonHeight / 2 + 5);
            ctx.textAlign = 'left';
            
            // Draw pause overlay if paused
            if (paused) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
                
                // Display total coins in corner (always visible, even when paused)
                if (images.coin) {
                    const coinSize = 30 * scaleFactor;
                    ctx.drawImage(images.coin, 10 * scaleFactor, 10 * scaleFactor, coinSize, coinSize);
                    ctx.fillStyle = '#FFD700'; // Gold color
                    ctx.font = `${Math.round(24 * scaleFactor)}px Arial`;
                    ctx.textAlign = 'left';
                    ctx.fillText(`${totalCoins}`, (10 + coinSize + 5) * scaleFactor, (10 + coinSize - 5) * scaleFactor);
                    ctx.textAlign = 'center';
                } else {
                    ctx.fillStyle = '#FFD700';
                    ctx.font = `${Math.round(24 * scaleFactor)}px Arial`;
                    ctx.textAlign = 'left';
                    ctx.fillText(`💰 ${totalCoins}`, 10 * scaleFactor, 30 * scaleFactor);
                    ctx.textAlign = 'center';
                }
                
                ctx.fillStyle = WHITE;
                ctx.font = bigFont;
                ctx.textAlign = 'center';
                ctx.fillText('PAUSED', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 50);
                
                ctx.font = font;
                ctx.fillText('Press P or click PAUSE to resume', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20 * scaleFactor);
                ctx.textAlign = 'left';
            }
        } else {
            // Display total coins in corner (always visible, even on game over)
            if (images.coin) {
                const coinSize = 30 * scaleFactor;
                ctx.drawImage(images.coin, 10 * scaleFactor, 10 * scaleFactor, coinSize, coinSize);
                ctx.fillStyle = '#FFD700'; // Gold color
                ctx.font = `${Math.round(24 * scaleFactor)}px Arial`;
                ctx.textAlign = 'left';
                ctx.fillText(`${totalCoins}`, (10 + coinSize + 5) * scaleFactor, (10 + coinSize - 5) * scaleFactor);
                ctx.textAlign = 'center';
            } else {
                ctx.fillStyle = '#FFD700';
                ctx.font = `${Math.round(24 * scaleFactor)}px Arial`;
                ctx.textAlign = 'left';
                ctx.fillText(`💰 ${totalCoins}`, 10 * scaleFactor, 30 * scaleFactor);
                ctx.textAlign = 'center';
            }
            
            ctx.fillStyle = RED;
            ctx.font = bigFont;
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 80);
            
            ctx.fillStyle = WHITE;
            ctx.font = font;
            ctx.fillText(`Final Score: ${score}`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 20);
            
            // Show coins earned
            if (coinsEarnedThisGame > 0) {
                ctx.fillStyle = '#FFD700'; // Gold color
                ctx.font = `${Math.round(28 * scaleFactor)}px Arial`;
                if (images.coin) {
                    const coinSize = 28 * scaleFactor;
                    ctx.drawImage(images.coin, SCREEN_WIDTH / 2 - 80 * scaleFactor, SCREEN_HEIGHT / 2 - 10 * scaleFactor, coinSize, coinSize);
                    ctx.fillText(`+${coinsEarnedThisGame} Coins!`, SCREEN_WIDTH / 2 + 10 * scaleFactor, SCREEN_HEIGHT / 2 + 15 * scaleFactor);
                } else {
                    ctx.fillText(`💰 +${coinsEarnedThisGame} Coins!`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 5);
                }
                ctx.fillStyle = '#FFD700';
                ctx.font = `${Math.round(20 * scaleFactor)}px Arial`;
                if (images.coin) {
                    const coinSize = 20 * scaleFactor;
                    ctx.drawImage(images.coin, SCREEN_WIDTH / 2 - 60 * scaleFactor, SCREEN_HEIGHT / 2 + 20 * scaleFactor, coinSize, coinSize);
                    ctx.fillText(`Total: ${totalCoins}`, SCREEN_WIDTH / 2 + 10 * scaleFactor, SCREEN_HEIGHT / 2 + 40 * scaleFactor);
                } else {
                    ctx.fillText(`Total: ${totalCoins} Coins`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 35 * scaleFactor);
                }
                ctx.font = font;
            }
            
            // Show high score comparison
            const highScore = getPlayerHighScore();
            if (score > highScore) {
                ctx.fillStyle = '#4CAF50';
                ctx.font = font;
                ctx.fillText('NEW HIGH SCORE!', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + (coinsEarnedThisGame > 0 ? 65 : 20) * scaleFactor);
            } else if (highScore > 0) {
                ctx.fillStyle = '#888';
                ctx.font = `${Math.round(24 * scaleFactor)}px Arial`;
                ctx.fillText(`Personal Best: ${highScore}`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + (coinsEarnedThisGame > 0 ? 65 : 20) * scaleFactor);
                ctx.font = font;
            }
            
            if (!showNameInput) {
                // Show mobile buttons on mobile devices
                if (isMobile) {
                    const gameOverButtons = document.getElementById('gameOverButtons');
                    if (gameOverButtons) {
                        gameOverButtons.style.display = 'flex';
                    }
                    // Still show text for desktop users who might be on mobile browser
                    ctx.fillStyle = WHITE;
                    ctx.font = `${Math.round(18 * scaleFactor)}px Arial`;
                    const offsetY = coinsEarnedThisGame > 0 ? 100 : 60;
                    ctx.fillText('Use buttons below', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + offsetY * scaleFactor);
                } else {
                    // Hide mobile buttons on desktop
                    const gameOverButtons = document.getElementById('gameOverButtons');
                    if (gameOverButtons) {
                        gameOverButtons.style.display = 'none';
                    }
                    ctx.fillStyle = WHITE;
                    const offsetY = coinsEarnedThisGame > 0 ? 100 : 60;
                    ctx.fillText('Press SPACE to restart', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + offsetY * scaleFactor);
                    ctx.fillText('Press ESC to return to menu', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + (offsetY + 40) * scaleFactor);
                }
            } else {
                // Hide buttons when name input is showing
                const gameOverButtons = document.getElementById('gameOverButtons');
                if (gameOverButtons) {
                    gameOverButtons.style.display = 'none';
                }
            }
            ctx.textAlign = 'left';
        }
    }
}

function drawTitleScreen() {
    // Use selected background
    let currentBg = background;
    const bgMap = {
        'marshland': images.backgroundMarshland,
        'mountain': images.backgroundMountain,
        'steampunkArctic': images.backgroundSteampunkArctic,
        'steampunkJapan': images.backgroundSteampunkJapan,
        'steampunkJungle': images.backgroundSteampunkJungle,
        'steampunkTradingHub': images.backgroundSteampunkTradingHub,
        'steampunkWaterworld': images.backgroundSteampunkWaterworld
    };
    if (selectedBackground !== 'default' && bgMap[selectedBackground]) {
        currentBg = bgMap[selectedBackground];
    }
    if (currentBg) {
        ctx.drawImage(currentBg, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }
    
    if (logo) {
        ctx.drawImage(logo, 10, 10);
    }
    
    // Display total coins on title screen (always visible in corner)
    if (images.coin) {
        const coinSize = 30 * scaleFactor;
        ctx.drawImage(images.coin, 10 * scaleFactor, 10 * scaleFactor, coinSize, coinSize);
        ctx.fillStyle = '#FFD700'; // Gold color
        ctx.font = `${Math.round(24 * scaleFactor)}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(`${totalCoins}`, (10 + coinSize + 5) * scaleFactor, (10 + coinSize - 5) * scaleFactor);
    } else {
        ctx.fillStyle = '#FFD700';
        ctx.font = `${Math.round(24 * scaleFactor)}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(`💰 ${totalCoins}`, 10 * scaleFactor, 30 * scaleFactor);
    }
    ctx.textAlign = 'center';
    
    ctx.fillStyle = WHITE;
    ctx.font = bigFont;
    ctx.textAlign = 'center';
    ctx.fillText('FLAPPY CHESS', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 150);
    
    if (startButton) {
        ctx.drawImage(startButton, startButtonRect.x, startButtonRect.y);
    }
    
    if (shopButton) {
        ctx.drawImage(shopButton, shopButtonRect.x, shopButtonRect.y);
    }
    
    // Show leaderboard hint
    ctx.fillStyle = WHITE;
    ctx.font = '20px Arial';
    ctx.fillText('Press L to view Leaderboard', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 150);
    
    ctx.textAlign = 'left';
    
    // Show banner ad on title screen
    const bannerAd = document.getElementById('bannerAd');
    if (bannerAd && gameState === 'title') {
        bannerAd.style.display = 'block';
        initializeBannerAd();
    } else if (bannerAd && gameState !== 'title') {
        bannerAd.style.display = 'none';
    }
    
    // Show leaderboard button
    showLeaderboardButton();
}

function drawShopScreen() {
    if (background) {
        ctx.drawImage(background, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }
    
    if (logo) {
        ctx.drawImage(logo, 10, 10);
    }
    
    // Display total coins on shop screen (always visible in corner)
    if (images.coin) {
        const coinSize = 30 * scaleFactor;
        ctx.drawImage(images.coin, 10 * scaleFactor, 10 * scaleFactor, coinSize, coinSize);
        ctx.fillStyle = '#FFD700'; // Gold color
        ctx.font = `${Math.round(24 * scaleFactor)}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(`${totalCoins}`, (10 + coinSize + 5) * scaleFactor, (10 + coinSize - 5) * scaleFactor);
        ctx.textAlign = 'center';
    } else {
        ctx.fillStyle = '#FFD700';
        ctx.font = `${Math.round(24 * scaleFactor)}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText(`💰 ${totalCoins}`, 10 * scaleFactor, 30 * scaleFactor);
        ctx.textAlign = 'center';
    }
    
    ctx.fillStyle = WHITE;
    ctx.font = bigFont;
    ctx.textAlign = 'center';
    // Use selected background
    let currentBg = background;
    if (selectedBackground === 'marshland' && images.backgroundMarshland) {
        currentBg = images.backgroundMarshland;
    } else if (selectedBackground === 'mountain' && images.backgroundMountain) {
        currentBg = images.backgroundMountain;
    }
    
    if (currentBg) {
        ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        ctx.drawImage(currentBg, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }
    
    // Draw back button (except on main shop screen)
    if (shopState !== 'main') {
        ctx.fillStyle = '#888';
        ctx.font = `${Math.round(20 * scaleFactor)}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('← Back', backButtonRect.x, backButtonRect.y + backButtonRect.height);
        ctx.textAlign = 'center';
    }
    
    if (shopState === 'main') {
        ctx.fillText('SHOP', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 150 * scaleFactor);
        
        // Draw shop navigation buttons
        if (skinsShopButton) {
            ctx.drawImage(skinsShopButton, skinsShopButtonRect.x, skinsShopButtonRect.y);
        }
        if (backgroundsShopButton) {
            ctx.drawImage(backgroundsShopButton, backgroundsShopButtonRect.x, backgroundsShopButtonRect.y);
        }
    } else if (shopState === 'skins') {
        drawSkinsShop();
    } else if (shopState === 'backgrounds') {
        drawBackgroundsShop();
    }
}

function drawSkinsShop() {
    ctx.fillText('SKINS SHOP', SCREEN_WIDTH / 2, 60 * scaleFactor);
    
    const skins = [
        { id: 'default', name: 'Default', thumbnail: images.thumbnailDefault, price: 0 },
        { id: 'tin', name: 'Tin Robot', thumbnail: images.thumbnailTin, price: 0 },
        { id: 'arcticResearcher', name: 'Arctic Researcher', thumbnail: images.thumbnailArcticResearcher, price: 0 },
        { id: 'legendaryCrazedRobot', name: 'Crazed Robot', thumbnail: images.thumbnailLegendaryCrazedRobot, price: 0 },
        { id: 'legendaryCyborg', name: 'Cyborg', thumbnail: images.thumbnailLegendaryCyborg, price: 0 },
        { id: 'legendaryMage', name: 'Mage', thumbnail: images.thumbnailLegendaryMage, price: 0 },
        { id: 'legendarySamurai', name: 'Samurai', thumbnail: images.thumbnailLegendarySamurai, price: 0 },
        { id: 'longHair', name: 'Long Hair', thumbnail: images.thumbnailLongHair, price: 0 },
        { id: 'merchant', name: 'Merchant', thumbnail: images.thumbnailMerchant, price: 0 },
        { id: 'pirate', name: 'Pirate', thumbnail: images.thumbnailPirate, price: 0 },
        { id: 'rareCat', name: 'Cat', thumbnail: images.thumbnailRareCat, price: 0 },
        { id: 'rareFish', name: 'Fish', thumbnail: images.thumbnailRareFish, price: 0 },
        { id: 'rareGorilla', name: 'Gorilla', thumbnail: images.thumbnailRareGorilla, price: 0 },
        { id: 'rareIceMonster', name: 'Ice Monster', thumbnail: images.thumbnailRareIceMonster, price: 0 },
        { id: 'steampunkGorilla', name: 'Steampunk Gorilla', thumbnail: images.thumbnailSteampunkGorilla, price: 0 },
        { id: 'steamshipPilot', name: 'Steamship Pilot', thumbnail: images.thumbnailSteamshipPilot, price: 0 }
    ];
    
    const thumbnailSize = 100 * scaleFactor;
    const spacing = 15 * scaleFactor;
    const itemsPerRow = Math.floor((SCREEN_WIDTH - 40 * scaleFactor) / (thumbnailSize + spacing));
    const startX = (SCREEN_WIDTH - (itemsPerRow * (thumbnailSize + spacing) - spacing)) / 2;
    let startY = 100 * scaleFactor;
    
    skins.forEach((skin, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        const x = startX + col * (thumbnailSize + spacing);
        const y = startY + row * (thumbnailSize + spacing + 40 * scaleFactor);
        
        // Skip if off screen (basic culling)
        if (y > SCREEN_HEIGHT) return;
        
        // Draw thumbnail
        if (skin.thumbnail) {
            ctx.drawImage(skin.thumbnail, x, y, thumbnailSize, thumbnailSize);
        }
        
        // Draw selection border if selected
        if (selectedSkin === skin.id) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 4 * scaleFactor;
            ctx.strokeRect(x - 2 * scaleFactor, y - 2 * scaleFactor, thumbnailSize + 4 * scaleFactor, thumbnailSize + 4 * scaleFactor);
        }
        
        // Draw price or "SELECTED" or "OWNED"
        ctx.fillStyle = WHITE;
        ctx.font = `${Math.round(14 * scaleFactor)}px Arial`;
        ctx.textAlign = 'center';
        
        if (selectedSkin === skin.id) {
            ctx.fillStyle = '#FFD700';
            ctx.fillText('SELECTED', x + thumbnailSize / 2, y + thumbnailSize + 20 * scaleFactor);
        } else if (hasPurchasedSkin(skin.id)) {
            ctx.fillStyle = '#0F0';
            ctx.fillText('OWNED', x + thumbnailSize / 2, y + thumbnailSize + 20 * scaleFactor);
        } else {
            ctx.fillStyle = '#FFD700';
            ctx.fillText('FREE', x + thumbnailSize / 2, y + thumbnailSize + 20 * scaleFactor);
        }
    });
}

function drawBackgroundsShop() {
    ctx.fillText('BACKGROUNDS SHOP', SCREEN_WIDTH / 2, 80 * scaleFactor);
    
    const backgrounds = [
        { id: 'default', name: 'Default', image: background, price: 0 },
        { id: 'marshland', name: 'Marshland', image: images.backgroundMarshland, price: 0 },
        { id: 'mountain', name: 'Mountain', image: images.backgroundMountain, price: 0 },
        { id: 'steampunkArctic', name: 'Steampunk Arctic', image: images.backgroundSteampunkArctic, price: 0 },
        { id: 'steampunkJapan', name: 'Steampunk Japan', image: images.backgroundSteampunkJapan, price: 0 },
        { id: 'steampunkJungle', name: 'Steampunk Jungle', image: images.backgroundSteampunkJungle, price: 0 },
        { id: 'steampunkTradingHub', name: 'Trading Hub', image: images.backgroundSteampunkTradingHub, price: 0 },
        { id: 'steampunkWaterworld', name: 'Waterworld', image: images.backgroundSteampunkWaterworld, price: 0 }
    ];
    
    const thumbnailSize = 140 * scaleFactor;
    const spacing = 15 * scaleFactor;
    const itemsPerRow = Math.floor((SCREEN_WIDTH - 40 * scaleFactor) / (thumbnailSize + spacing));
    const startX = (SCREEN_WIDTH - (itemsPerRow * (thumbnailSize + spacing) - spacing)) / 2;
    let startY = 100 * scaleFactor;
    
    backgrounds.forEach((bg, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        const x = startX + col * (thumbnailSize + spacing);
        const y = startY + row * (thumbnailSize * 0.75 + spacing + 40 * scaleFactor);
        
        // Skip if off screen (basic culling)
        if (y > SCREEN_HEIGHT) return;
        
        // Draw thumbnail (stretch to fit)
        if (bg.image) {
            ctx.drawImage(bg.image, x, y, thumbnailSize, thumbnailSize * 0.75);
        }
        
        // Draw selection border if selected
        if (selectedBackground === bg.id) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 4 * scaleFactor;
            ctx.strokeRect(x - 2 * scaleFactor, y - 2 * scaleFactor, thumbnailSize + 4 * scaleFactor, thumbnailSize * 0.75 + 4 * scaleFactor);
        }
        
        // Draw price or "SELECTED" or "OWNED"
        ctx.fillStyle = WHITE;
        ctx.font = `${Math.round(14 * scaleFactor)}px Arial`;
        ctx.textAlign = 'center';
        
        if (selectedBackground === bg.id) {
            ctx.fillStyle = '#FFD700';
            ctx.fillText('SELECTED', x + thumbnailSize / 2, y + thumbnailSize * 0.75 + 20 * scaleFactor);
        } else if (hasPurchasedBackground(bg.id)) {
            ctx.fillStyle = '#0F0';
            ctx.fillText('OWNED', x + thumbnailSize / 2, y + thumbnailSize * 0.75 + 20 * scaleFactor);
        } else {
            ctx.fillStyle = '#FFD700';
            ctx.fillText('FREE', x + thumbnailSize / 2, y + thumbnailSize * 0.75 + 20 * scaleFactor);
        }
    });
}

// Event handlers
function handleKeyDown(event) {
    // Close modals with Escape
    if (event.key === 'Escape') {
        if (showNameInput) {
            hideNameInputModal();
            return;
        }
        const leaderboardModal = document.getElementById('leaderboardModal');
        if (leaderboardModal && leaderboardModal.style.display === 'block') {
            hideLeaderboard();
            return;
        }
        
        if (gameState === 'game_over' || gameState === 'shop') {
            gameState = 'title';
            shopState = 'main';
            // Don't stop music - keep it playing
            hideGameOverButtons();
            showLeaderboardButton();
        } else if (gameState === 'playing' && gameOver) {
            gameState = 'title';
            // Don't stop music - keep it playing
            hideGameOverButtons();
            showLeaderboardButton();
        }
    } else if (event.key === ' ' || event.key === 'Spacebar') {
        if (gameState === 'playing') {
            if (gameOver && !showNameInput) {
                startGame();
            } else if (!paused && player && !showNameInput) {
                player.jump();
            }
        }
    } else if (event.key === 'p' || event.key === 'P') {
        // Toggle pause
        if (gameState === 'playing' && !gameOver && !showNameInput) {
            paused = !paused;
        }
    } else if (event.key === 'l' || event.key === 'L') {
        // Show leaderboard (when on title screen)
        if (gameState === 'title') {
            showLeaderboard();
        }
    }
}

function getCanvasCoordinates(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if (event.touches) {
        // Touch event
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        // Mouse event
        clientX = event.clientX;
        clientY = event.clientY;
    }
    
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function handleMouseClick(event) {
    const coords = getCanvasCoordinates(event);
    const x = coords.x;
    const y = coords.y;
    
    if (gameState === 'title') {
        // Start music on first user interaction if not already playing
        if (!musicPlaying) {
            playBackgroundMusic();
        }
        
        if (startButtonRect && 
            x >= startButtonRect.x && x <= startButtonRect.x + startButtonRect.width &&
            y >= startButtonRect.y && y <= startButtonRect.y + startButtonRect.height) {
            startGame();
        } else if (shopButtonRect &&
            x >= shopButtonRect.x && x <= shopButtonRect.x + shopButtonRect.width &&
            y >= shopButtonRect.y && y <= shopButtonRect.y + shopButtonRect.height) {
            gameState = 'shop';
            shopState = 'main';
        }
    } else if (gameState === 'shop') {
        // Handle shop navigation
        if (shopState === 'main') {
            // Check skins button
            if (skinsShopButtonRect &&
                x >= skinsShopButtonRect.x && x <= skinsShopButtonRect.x + skinsShopButtonRect.width &&
                y >= skinsShopButtonRect.y && y <= skinsShopButtonRect.y + skinsShopButtonRect.height) {
                shopState = 'skins';
            }
            // Check backgrounds button
            else if (backgroundsShopButtonRect &&
                x >= backgroundsShopButtonRect.x && x <= backgroundsShopButtonRect.x + backgroundsShopButtonRect.width &&
                y >= backgroundsShopButtonRect.y && y <= backgroundsShopButtonRect.y + backgroundsShopButtonRect.height) {
                shopState = 'backgrounds';
            }
        } else {
            // Handle back button
            if (backButtonRect &&
                x >= backButtonRect.x && x <= backButtonRect.x + backButtonRect.width &&
                y >= backButtonRect.y && y <= backButtonRect.y + backButtonRect.height) {
                shopState = 'main';
            }
            // Handle shop item clicks
            else if (shopState === 'skins') {
                handleSkinShopClick(x, y);
            } else if (shopState === 'backgrounds') {
                handleBackgroundShopClick(x, y);
            }
        }
    } else if (gameState === 'playing') {
        if (!gameOver) {
            // Check if pause button was clicked
            const pauseButtonX = SCREEN_WIDTH - 100 * scaleFactor;
            const pauseButtonY = 10 * scaleFactor;
            const pauseButtonWidth = 90 * scaleFactor;
            const pauseButtonHeight = 30 * scaleFactor;
            
            if (x >= pauseButtonX && x <= pauseButtonX + pauseButtonWidth &&
                y >= pauseButtonY && y <= pauseButtonY + pauseButtonHeight) {
                paused = !paused;
            } else if (!paused) {
                // Click to jump (anywhere on screen during gameplay)
                if (player) {
                    player.jump();
                }
            }
        }
    }
}

function handleSkinShopClick(x, y) {
    const skins = [
        { id: 'default', price: 0 },
        { id: 'tin', price: 0 },
        { id: 'arcticResearcher', price: 0 },
        { id: 'legendaryCrazedRobot', price: 0 },
        { id: 'legendaryCyborg', price: 0 },
        { id: 'legendaryMage', price: 0 },
        { id: 'legendarySamurai', price: 0 },
        { id: 'longHair', price: 0 },
        { id: 'merchant', price: 0 },
        { id: 'pirate', price: 0 },
        { id: 'rareCat', price: 0 },
        { id: 'rareFish', price: 0 },
        { id: 'rareGorilla', price: 0 },
        { id: 'rareIceMonster', price: 0 },
        { id: 'steampunkGorilla', price: 0 },
        { id: 'steamshipPilot', price: 0 }
    ];
    
    const thumbnailSize = 100 * scaleFactor;
    const spacing = 15 * scaleFactor;
    const itemsPerRow = Math.floor((SCREEN_WIDTH - 40 * scaleFactor) / (thumbnailSize + spacing));
    const startX = (SCREEN_WIDTH - (itemsPerRow * (thumbnailSize + spacing) - spacing)) / 2;
    let startY = 100 * scaleFactor;
    
    skins.forEach((skin, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        const itemX = startX + col * (thumbnailSize + spacing);
        const itemY = startY + row * (thumbnailSize + spacing + 40 * scaleFactor);
        
        if (x >= itemX && x <= itemX + thumbnailSize &&
            y >= itemY && y <= itemY + thumbnailSize + 50 * scaleFactor) {
            // All skins are free, so just select them
            selectedSkin = skin.id;
            saveShopData();
            updatePlayerSkin();
            // Auto-purchase if not already purchased
            if (!hasPurchasedSkin(skin.id)) {
                purchaseSkin(skin.id);
            }
        }
    });
}

function handleBackgroundShopClick(x, y) {
    const backgrounds = [
        { id: 'default', price: 0 },
        { id: 'marshland', price: 0 },
        { id: 'mountain', price: 0 },
        { id: 'steampunkArctic', price: 0 },
        { id: 'steampunkJapan', price: 0 },
        { id: 'steampunkJungle', price: 0 },
        { id: 'steampunkTradingHub', price: 0 },
        { id: 'steampunkWaterworld', price: 0 }
    ];
    
    const thumbnailSize = 140 * scaleFactor;
    const spacing = 15 * scaleFactor;
    const itemsPerRow = Math.floor((SCREEN_WIDTH - 40 * scaleFactor) / (thumbnailSize + spacing));
    const startX = (SCREEN_WIDTH - (itemsPerRow * (thumbnailSize + spacing) - spacing)) / 2;
    let startY = 100 * scaleFactor;
    
    backgrounds.forEach((bg, index) => {
        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;
        const itemX = startX + col * (thumbnailSize + spacing);
        const itemY = startY + row * (thumbnailSize * 0.75 + spacing + 40 * scaleFactor);
        
        if (x >= itemX && x <= itemX + thumbnailSize &&
            y >= itemY && y <= itemY + thumbnailSize * 0.75 + 50 * scaleFactor) {
            // All backgrounds are free, so just select them
            selectedBackground = bg.id;
            saveShopData();
            // Auto-purchase if not already purchased
            if (!hasPurchasedBackground(bg.id)) {
                purchaseBackground(bg.id);
            }
        }
    });
}

function handleTouchStart(event) {
    event.preventDefault();
    
    // Start music on first user interaction if not already playing
    if (!musicPlaying) {
        playBackgroundMusic();
    }
    
    if (gameState === 'playing' && !gameOver && !paused) {
        if (player) {
            player.jump();
        }
    } else {
        // Handle UI clicks
        handleMouseClick(event);
    }
}

// Game loop with frame rate limiting
let lastFrameTime = 0;
const targetFrameTime = 1000 / FPS; // 16.67ms for 60fps

function gameLoop(currentTime) {
    // Calculate delta time
    const deltaTime = currentTime - lastFrameTime;
    
    // Only update if enough time has passed (frame rate limiting)
    if (deltaTime >= targetFrameTime) {
        update();
        lastFrameTime = currentTime - (deltaTime % targetFrameTime); // Preserve leftover time
    }
    
    // Always draw (for smooth rendering)
    draw();
    
    requestAnimationFrame(gameLoop);
}

// Ad management
let bannerAdInitialized = false;

function initializeBannerAd() {
    if (!bannerAdInitialized) {
        try {
            (adsbygoogle = window.adsbygoogle || []).push({});
            (adsbygoogle = window.adsbygoogle || []).push({});
            (adsbygoogle = window.adsbygoogle || []).push({});
            bannerAdInitialized = true;
        } catch (e) {
            console.warn('Ad initialization error:', e);
        }
    }
}

// Leaderboard Functions
function getPlayerHighScore() {
    const highScore = localStorage.getItem('flappyChessHighScore');
    return highScore ? parseInt(highScore, 10) : 0;
}

function setPlayerHighScore(score) {
    localStorage.setItem('flappyChessHighScore', score.toString());
}

// Coin system functions
function loadCoins() {
    const savedCoins = localStorage.getItem('flappyChessCoins');
    totalCoins = savedCoins ? parseInt(savedCoins, 10) : 0;
}

function saveCoins() {
    localStorage.setItem('flappyChessCoins', totalCoins.toString());
}

function addCoins(amount) {
    totalCoins += amount;
    saveCoins();
}

// Shop data functions
function loadShopData() {
    const savedSkins = localStorage.getItem('flappyChessPurchasedSkins');
    if (savedSkins) {
        purchasedSkins = JSON.parse(savedSkins);
    }
    
    const savedBackgrounds = localStorage.getItem('flappyChessPurchasedBackgrounds');
    if (savedBackgrounds) {
        purchasedBackgrounds = JSON.parse(savedBackgrounds);
    }
    
    const savedSkin = localStorage.getItem('flappyChessSelectedSkin');
    if (savedSkin) {
        selectedSkin = savedSkin;
    }
    
    const savedBackground = localStorage.getItem('flappyChessSelectedBackground');
    if (savedBackground) {
        selectedBackground = savedBackground;
    }
}

function saveShopData() {
    localStorage.setItem('flappyChessPurchasedSkins', JSON.stringify(purchasedSkins));
    localStorage.setItem('flappyChessPurchasedBackgrounds', JSON.stringify(purchasedBackgrounds));
    localStorage.setItem('flappyChessSelectedSkin', selectedSkin);
    localStorage.setItem('flappyChessSelectedBackground', selectedBackground);
}

function purchaseSkin(skinId) {
    if (!purchasedSkins.includes(skinId)) {
        purchasedSkins.push(skinId);
        saveShopData();
    }
}

function purchaseBackground(bgId) {
    if (!purchasedBackgrounds.includes(bgId)) {
        purchasedBackgrounds.push(bgId);
        saveShopData();
    }
}

function hasPurchasedSkin(skinId) {
    return skinId === 'default' || purchasedSkins.includes(skinId);
}

function hasPurchasedBackground(bgId) {
    return bgId === 'default' || purchasedBackgrounds.includes(bgId);
}

function showNameInputModal() {
    if (!database) {
        console.warn('Firebase not initialized, skipping leaderboard');
        return;
    }
    
    showNameInput = true;
    const modal = document.getElementById('nameInputModal');
    const input = document.getElementById('playerNameInput');
    
    if (modal && input) {
        // Load saved name from localStorage
        const savedName = localStorage.getItem('flappyChessPlayerName') || '';
        input.value = savedName;
        
        modal.style.display = 'block';
        input.focus();
        input.select();
        
        // Handle Enter key
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                submitScore();
            }
        };
    }
}

function hideNameInputModal() {
    showNameInput = false;
    const modal = document.getElementById('nameInputModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function submitScore() {
    if (!database) return;
    
    const input = document.getElementById('playerNameInput');
    if (!input) return;
    
    let playerName = input.value.trim();
    
    // Default name if empty
    if (!playerName) {
        playerName = 'Anonymous';
    }
    
    // Sanitize name (limit length, remove special characters that might cause issues)
    playerName = playerName.substring(0, 20).replace(/[^a-zA-Z0-9\s]/g, '');
    if (!playerName) {
        playerName = 'Anonymous';
    }
    
    // Save name to localStorage
    localStorage.setItem('flappyChessPlayerName', playerName);
    
    // Submit to Firebase
    const scoreData = {
        name: playerName,
        score: pendingScore,
        timestamp: Date.now()
    };
    
    database.ref('leaderboard/scores').push(scoreData)
        .then(() => {
            console.log('Score submitted successfully');
            hideNameInputModal();
            // Refresh leaderboard (which will update player skin)
            loadLeaderboard();
        })
        .catch((error) => {
            console.error('Error submitting score:', error);
            alert('Failed to submit score. Please try again.');
        });
}

function skipScoreSubmission() {
    // High score is already updated, just hide the modal
    hideNameInputModal();
}

function loadLeaderboard() {
    if (!database) return;
    
    const leaderboardRef = database.ref('leaderboard/scores');
    
    leaderboardRef.orderByChild('score').limitToLast(10).once('value', (snapshot) => {
        leaderboardData = [];
        snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            leaderboardData.push({
                name: data.name,
                score: data.score,
                timestamp: data.timestamp
            });
        });
        
        // Sort by score descending
        leaderboardData.sort((a, b) => b.score - a.score);
        
        // Update player skin based on new leaderboard data
        updatePlayerSkin();
        
        updateLeaderboardDisplay();
    });
}

function updateLeaderboardDisplay() {
    const list = document.getElementById('leaderboardList');
    if (!list) return;
    
    if (leaderboardData.length === 0) {
        list.innerHTML = '<p style="color: #888; text-align: center;">No scores yet. Be the first!</p>';
        return;
    }
    
    let html = '';
    leaderboardData.forEach((entry, index) => {
        const rank = index + 1;
        let rankDisplay = `${rank}.`;
        
        // Use hat icons for top 3 ranks
        if (rank === 1) {
            const hatSrc = images.hatGold ? images.hatGold.src : 'golden hat.png';
            rankDisplay = `<img src="${hatSrc}" alt="Gold" style="width: 30px; height: 30px; vertical-align: middle; display: inline-block;">`;
        } else if (rank === 2) {
            const hatSrc = images.hatSilver ? images.hatSilver.src : 'silver hat.png';
            rankDisplay = `<img src="${hatSrc}" alt="Silver" style="width: 30px; height: 30px; vertical-align: middle; display: inline-block;">`;
        } else if (rank === 3) {
            const hatSrc = images.hatBronze ? images.hatBronze.src : 'bronze hat.png';
            rankDisplay = `<img src="${hatSrc}" alt="Bronze" style="width: 30px; height: 30px; vertical-align: middle; display: inline-block;">`;
        }
        
        html += `
            <div class="leaderboardEntry">
                <span class="rank">${rankDisplay}</span>
                <span class="name">${escapeHtml(entry.name)}</span>
                <span class="score">${entry.score}</span>
            </div>
        `;
    });
    
    list.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    if (modal) {
        loadLeaderboard();
        modal.style.display = 'block';
    }
}

function hideLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showLeaderboardButton() {
    const leaderboardBtn = document.getElementById('leaderboardButton');
    if (leaderboardBtn && gameState === 'title') {
        leaderboardBtn.style.display = 'block';
    }
}

function hideLeaderboardButton() {
    const leaderboardBtn = document.getElementById('leaderboardButton');
    if (leaderboardBtn) {
        leaderboardBtn.style.display = 'none';
    }
}

// Initialize
async function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Calculate responsive dimensions
    calculateScreenDimensions();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        calculateScreenDimensions();
    });
    
    // Handle orientation change
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            calculateScreenDimensions();
        }, 100);
    });
    
    await loadImages();
    loadAudio();
    
    // Load coins from localStorage
    loadCoins();
    
    // Load shop data from localStorage
    loadShopData();
    
    // Add event listeners
    canvas.addEventListener('click', handleMouseClick);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
    window.addEventListener('keydown', handleKeyDown);
    
    // Prevent default touch behaviors
    document.addEventListener('touchmove', (e) => {
        if (gameState === 'playing') {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
    
    // Setup name input modal buttons
    const submitBtn = document.getElementById('submitScoreBtn');
    const skipBtn = document.getElementById('skipScoreBtn');
    if (submitBtn) {
        submitBtn.addEventListener('click', submitScore);
    }
    if (skipBtn) {
        skipBtn.addEventListener('click', skipScoreSubmission);
    }
    
    // Setup leaderboard modal
    const leaderboardBtn = document.getElementById('leaderboardButton');
    const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
    if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', showLeaderboard);
        // Show leaderboard button when on title screen
        if (gameState === 'title') {
            leaderboardBtn.style.display = 'block';
        }
    }
    if (closeLeaderboardBtn) {
        closeLeaderboardBtn.addEventListener('click', hideLeaderboard);
    }
    
    // Setup game over buttons (mobile)
    const restartBtn = document.getElementById('restartButton');
    const menuBtn = document.getElementById('menuButton');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            if (gameState === 'playing' && gameOver) {
                startGame();
            }
        });
    }
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            if (gameState === 'playing' && gameOver) {
                gameState = 'title';
                // Don't stop music - keep it playing
                showLeaderboardButton();
            }
        });
    }
    
    // Load leaderboard on init
    if (database) {
        loadLeaderboard();
    }
    
    // Show banner ad on title screen
    if (gameState === 'title') {
        const bannerAd = document.getElementById('bannerAd');
        if (bannerAd) {
            bannerAd.style.display = 'block';
            initializeBannerAd();
        }
        // Show leaderboard button
        if (leaderboardBtn) {
            leaderboardBtn.style.display = 'block';
        }
    }
    
    // Initialize frame timing
    lastFrameTime = performance.now();
    gameLoop(performance.now());
}

// Start when page loads
window.addEventListener('load', init);
