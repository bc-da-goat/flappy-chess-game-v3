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
    'booyeah 120.mp3',
    'trinity 150.mp3',
    'beautiful fields 138.mp3'
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

// Title screen assets
let logo = null;
let startButton = null;
let startButtonRect = null;
let shopButton = null;
let shopButtonRect = null;
let background = null;

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
        jetpackFly: 'jetpack fly rough.png',
        jetpackFlyGold: 'jetpack fly gold skin.png',
        jetpackFlySilver: 'jetpack fly silver skin.png',
        jetpackFlyBronze: 'jetpack fly bronze skin.png',
        hatGold: 'golden hat.png',
        hatSilver: 'silver hat.png',
        hatBronze: 'bronze hat.png',
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
    
    // Process jetpack animation frames for all skins
    if (images.jetpackFly) {
        processJetpackFrames(images.jetpackFly, 'default');
    }
    if (images.jetpackFlyGold) {
        processJetpackFrames(images.jetpackFlyGold, 'gold');
    }
    if (images.jetpackFlySilver) {
        processJetpackFrames(images.jetpackFlySilver, 'silver');
    }
    if (images.jetpackFlyBronze) {
        processJetpackFrames(images.jetpackFlyBronze, 'bronze');
    }
    
    // Initialize player skin based on leaderboard rank
    updatePlayerSkin();
    
    gameState = 'title';
    document.getElementById('loading').style.display = 'none';
    document.getElementById('gameCanvas').style.display = 'block';
}

function processJetpackFrames(spriteSheet, skinType = 'default') {
    // Split 2x2 sprite sheet into 4 frames
    const frameWidth = spriteSheet.width / 2;
    const frameHeight = spriteSheet.height / 2;
    const framesKey = skinType === 'default' ? 'jetpackFrames' : `jetpackFrames${skinType.charAt(0).toUpperCase() + skinType.slice(1)}`;
    images[framesKey] = [];
    
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
            
            // Draw the frame with transparency preserved
            frameCtx.drawImage(
                spriteSheet,
                col * frameWidth, row * frameHeight,
                frameWidth, frameHeight,
                0, 0,
                frameWidth, frameHeight
            );
            
            images[framesKey].push(frameCanvas);
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

// Update player skin based on leaderboard rank
function updatePlayerSkin() {
    const rank = getPlayerRank();
    let framesKey = 'jetpackFrames'; // Default
    
    if (rank === 1) {
        framesKey = 'jetpackFramesGold';
    } else if (rank === 2) {
        framesKey = 'jetpackFramesSilver';
    } else if (rank === 3) {
        framesKey = 'jetpackFramesBronze';
    }
    
    // Update frames if they exist
    if (images[framesKey] && images[framesKey].length > 0) {
        images.jetpackFrames = images[framesKey];
        // Update current player if exists
        if (player && player.frames) {
            player.frames = images.jetpackFrames;
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
        this.frames = images.jetpackFrames || [];
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
        return { x: this.x, y: this.y, width: this.width, height: this.height };
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
            this.knightMoveSpeed = 8 * (2/3);  // 1/3 slower
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
                this.knightMoveSpeed = 8 * (2/3);  // 1/3 slower
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
                this.knightMoveSpeed = 8 * (2/3);  // 1/3 slower
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
        
        // Backup: if onended doesn't fire, timer will switch songs
        backgroundMusic.onended = () => {
            if (gameState === 'playing' && !gameOver) {
                currentMusicIndex = (currentMusicIndex + 1) % musicFiles.length;
                musicTimer = 0; // Reset timer
                playBackgroundMusic();
            } else {
                musicPlaying = false;
            }
        };
        
        backgroundMusic.play().catch(err => {
            console.warn('Could not play music:', err);
        });
        
        musicPlaying = true;
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
    gameOver = false;
    paused = false;
    spawnTimer = 0;
    gameState = 'playing';
    showNameInput = false;
    hideLeaderboardButton();
    hideGameOverButtons();
    // Don't reset music timer, speed, or index - keep music playing
    
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
    
    // Check if music needs to continue (no speed changes)
    if (gameState !== 'playing' || gameOver) {
        stopBackgroundMusic();
    }
    
    if (checkCollisions()) {
        gameOver = true;
        pendingScore = score;
        
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
        
        // Show interstitial ad after game over
        setTimeout(() => {
            showInterstitialAd();
        }, 500); // Small delay to let game over screen render
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
        if (background) {
            ctx.drawImage(background, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        }
        
        if (!gameOver) {
            for (let piece of chessPieces) {
                piece.draw(ctx);
            }
            player.draw(ctx);
            
            ctx.fillStyle = WHITE;
            ctx.font = font;
            ctx.fillText(`Score: ${score}`, 10 * scaleFactor, 30 * scaleFactor);
            
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
                
                ctx.fillStyle = WHITE;
                ctx.font = bigFont;
                ctx.textAlign = 'center';
                ctx.fillText('PAUSED', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 50);
                
                ctx.font = font;
                ctx.fillText('Press P or click PAUSE to resume', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20 * scaleFactor);
                ctx.textAlign = 'left';
            }
        } else {
            ctx.fillStyle = RED;
            ctx.font = bigFont;
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 80);
            
            ctx.fillStyle = WHITE;
            ctx.font = font;
            ctx.fillText(`Final Score: ${score}`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 20);
            
            // Show high score comparison
            const highScore = getPlayerHighScore();
            if (score > highScore) {
                ctx.fillStyle = '#4CAF50';
                ctx.fillText('NEW HIGH SCORE!', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20);
            } else if (highScore > 0) {
                ctx.fillStyle = '#888';
                ctx.font = `${Math.round(24 * scaleFactor)}px Arial`;
                ctx.fillText(`Personal Best: ${highScore}`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20 * scaleFactor);
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
                    ctx.fillText('Use buttons below', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 60 * scaleFactor);
                } else {
                    // Hide mobile buttons on desktop
                    const gameOverButtons = document.getElementById('gameOverButtons');
                    if (gameOverButtons) {
                        gameOverButtons.style.display = 'none';
                    }
                    ctx.fillStyle = WHITE;
                    ctx.fillText('Press SPACE to restart', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 60 * scaleFactor);
                    ctx.fillText('Press ESC to return to menu', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 100 * scaleFactor);
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
    if (background) {
        ctx.drawImage(background, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }
    
    if (logo) {
        ctx.drawImage(logo, 10, 10);
    }
    
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
    
    ctx.fillStyle = WHITE;
    ctx.font = bigFont;
    ctx.textAlign = 'center';
    ctx.fillText('SHOP', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 100);
    
    ctx.font = font;
    ctx.fillText('The shop is not open yet!', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
    ctx.fillText('Press ESC to return to menu', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 50);
    
    ctx.textAlign = 'left';
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
            stopBackgroundMusic();
            hideInterstitialAd();
            hideGameOverButtons();
            showLeaderboardButton();
        } else if (gameState === 'playing' && gameOver) {
            gameState = 'title';
            stopBackgroundMusic();
            hideInterstitialAd();
            hideGameOverButtons();
            showLeaderboardButton();
        }
    } else if (event.key === ' ' || event.key === 'Spacebar') {
        if (gameState === 'playing') {
            if (gameOver && !showNameInput) {
                hideInterstitialAd();
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
        if (startButtonRect && 
            x >= startButtonRect.x && x <= startButtonRect.x + startButtonRect.width &&
            y >= startButtonRect.y && y <= startButtonRect.y + startButtonRect.height) {
            startGame();
        } else if (shopButtonRect &&
            x >= shopButtonRect.x && x <= shopButtonRect.x + shopButtonRect.width &&
            y >= shopButtonRect.y && y <= shopButtonRect.y + shopButtonRect.height) {
            gameState = 'shop';
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

function handleTouchStart(event) {
    event.preventDefault();
    if (gameState === 'playing' && !gameOver && !paused) {
        if (player) {
            player.jump();
        }
    } else {
        // Handle UI clicks
        handleMouseClick(event);
    }
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Ad management
let bannerAdInitialized = false;
let interstitialAdInitialized = false;

function initializeBannerAd() {
    if (!bannerAdInitialized) {
        const bannerAdContainer = document.getElementById('bannerAd');
        if (bannerAdContainer) {
            try {
                (adsbygoogle = window.adsbygoogle || []).push({});
                bannerAdInitialized = true;
            } catch (e) {
                console.warn('Ad initialization error:', e);
            }
        }
    }
}

function initializeInterstitialAd() {
    if (!interstitialAdInitialized) {
        const interstitialAdContainer = document.getElementById('interstitialAd');
        if (interstitialAdContainer) {
            try {
                (adsbygoogle = window.adsbygoogle || []).push({});
                interstitialAdInitialized = true;
            } catch (e) {
                console.warn('Ad initialization error:', e);
            }
        }
    }
}

function showInterstitialAd() {
    const adContainer = document.getElementById('interstitialAd');
    if (adContainer) {
        adContainer.style.display = 'block';
        initializeInterstitialAd();
    }
}

function hideInterstitialAd() {
    const adContainer = document.getElementById('interstitialAd');
    if (adContainer) {
        adContainer.style.display = 'none';
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
    
    // Setup ad close button
    const closeAdBtn = document.getElementById('closeAd');
    if (closeAdBtn) {
        closeAdBtn.addEventListener('click', hideInterstitialAd);
    }
    
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
                hideInterstitialAd();
                startGame();
            }
        });
    }
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            if (gameState === 'playing' && gameOver) {
                gameState = 'title';
                stopBackgroundMusic();
                hideInterstitialAd();
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
    
    gameLoop();
}

// Start when page loads
window.addEventListener('load', init);
