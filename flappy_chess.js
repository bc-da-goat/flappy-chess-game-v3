// Flappy Chess - Web Version
// Constants
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
const FPS = 60;
const GRAVITY = 0.5;
const JUMP_STRENGTH = -8;

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

// Load all images
async function loadImages() {
    const imageFiles = {
        background: 'Background.png',
        logo: 'citadell games logo.png',
        startButton: 'start game button.png',
        shopButton: 'shop button.png',
        jetpackFly: 'jetpack fly rough.png',
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
            img.onload = () => {
                images[key] = img;
                resolve();
            };
            img.onerror = () => {
                console.warn(`Failed to load image: ${path}`);
                resolve(); // Continue even if image fails
            };
            img.src = path;
        });
    });

    await Promise.all(loadPromises);
    
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
    
    // Process jetpack animation frames
    if (images.jetpackFly) {
        processJetpackFrames(images.jetpackFly);
    }
    
    gameState = 'title';
    document.getElementById('loading').style.display = 'none';
    document.getElementById('gameCanvas').style.display = 'block';
}

function processJetpackFrames(spriteSheet) {
    // Split 2x2 sprite sheet into 4 frames
    const frameWidth = spriteSheet.width / 2;
    const frameHeight = spriteSheet.height / 2;
    images.jetpackFrames = [];
    
    for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = frameWidth;
            frameCanvas.height = frameHeight;
            const frameCtx = frameCanvas.getContext('2d');
            frameCtx.drawImage(
                spriteSheet,
                col * frameWidth, row * frameHeight,
                frameWidth, frameHeight,
                0, 0,
                frameWidth, frameHeight
            );
            images.jetpackFrames.push(frameCanvas);
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
            ctx.drawImage(this.frames[this.currentFrame], this.x, this.y, this.width, this.height);
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
        
        if (!this.horizontalSpeed) {
            this.horizontalSpeed = (Math.random() * (14.0 - 3.5) + 3.5) * 0.8;
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
        
        // Apply speed multiplier to all movement
        const effectiveHorizontalSpeed = (this.horizontalSpeed || 0) * speedMultiplier;
        const effectiveVerticalSpeed = (this.verticalSpeed || 0) * speedMultiplier;
        const effectiveKnightMoveSpeed = (this.knightMoveSpeed || 0) * speedMultiplier;
        
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
                if (distanceToTarget > effectiveKnightMoveSpeed) {
                    if (this.y < this.knightTargetY) {
                        this.y += effectiveKnightMoveSpeed;
                    } else {
                        this.y -= effectiveKnightMoveSpeed;
                    }
                } else {
                    this.y = this.knightTargetY;
                    this.knightState = 'horizontal';
                    this.knightTargetX = this.x - this.horizontalJump;
                }
            } else if (this.knightState === 'horizontal') {
                const distanceToTarget = Math.abs(this.knightTargetX - this.x);
                if (distanceToTarget > effectiveKnightMoveSpeed) {
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
                    this.knightTargetY = this.y + (this.verticalJump * this.verticalDirection);
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
    player = new JetpackMan(100, SCREEN_HEIGHT / 2);
    chessPieces = [];
    score = 0;
    gameOver = false;
    paused = false;
    spawnTimer = 0;
    gameState = 'playing';
    // Don't reset music timer, speed, or index - keep music playing
    
    // Start background music only if not already playing
    if (!musicPlaying) {
        playBackgroundMusic();
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
            ctx.fillText(`Score: ${score}`, 10, 30);
            
            // Draw pause button
            const pauseButtonX = SCREEN_WIDTH - 100;
            const pauseButtonY = 10;
            const pauseButtonWidth = 90;
            const pauseButtonHeight = 30;
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
                ctx.fillText('Press P or click PAUSE to resume', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20);
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
            ctx.fillText('Press SPACE to restart', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 40);
            ctx.fillText('Press ESC to return to menu', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 80);
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
    
    ctx.textAlign = 'left';
    
    // Show banner ad on title screen
    const bannerAd = document.getElementById('bannerAd');
    if (bannerAd && gameState === 'title') {
        bannerAd.style.display = 'block';
        initializeBannerAd();
    } else if (bannerAd && gameState !== 'title') {
        bannerAd.style.display = 'none';
    }
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
    if (event.key === 'Escape') {
        if (gameState === 'game_over' || gameState === 'shop') {
            gameState = 'title';
            stopBackgroundMusic();
            hideInterstitialAd();
        } else if (gameState === 'playing' && gameOver) {
            gameState = 'title';
            stopBackgroundMusic();
            hideInterstitialAd();
        }
    } else if (event.key === ' ' || event.key === 'Spacebar') {
        if (gameState === 'playing') {
            if (gameOver) {
                hideInterstitialAd();
                startGame();
            } else if (!paused && player) {
                player.jump();
            }
        }
    } else if (event.key === 'p' || event.key === 'P') {
        // Toggle pause
        if (gameState === 'playing' && !gameOver) {
            paused = !paused;
        }
    }
}

function handleMouseClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
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
            const pauseButtonX = SCREEN_WIDTH - 100;
            const pauseButtonY = 10;
            const pauseButtonWidth = 90;
            const pauseButtonHeight = 30;
            
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

// Initialize
async function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    await loadImages();
    loadAudio();
    
    canvas.addEventListener('click', handleMouseClick);
    window.addEventListener('keydown', handleKeyDown);
    
    // Setup ad close button
    const closeAdBtn = document.getElementById('closeAd');
    if (closeAdBtn) {
        closeAdBtn.addEventListener('click', hideInterstitialAd);
    }
    
    // Show banner ad on title screen
    if (gameState === 'title') {
        const bannerAd = document.getElementById('bannerAd');
        if (bannerAd) {
            bannerAd.style.display = 'block';
            initializeBannerAd();
        }
    }
    
    gameLoop();
}

// Start when page loads
window.addEventListener('load', init);
