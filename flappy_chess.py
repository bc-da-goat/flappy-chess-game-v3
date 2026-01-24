import pygame
import random
import math
import sys

# Initialize Pygame
pygame.init()

# Constants
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60
GRAVITY = 0.5
JUMP_STRENGTH = -8
SCROLL_SPEED = 3

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)

class JetpackMan:
    def __init__(self, x, y):
        self.x = x
        self.y = y
        self.velocity = 0
        self.width = 60
        self.height = 60
        
        # Load sprite sheet and split into 4 frames
        sprite_sheet = pygame.image.load("jetpack fly rough.png").convert_alpha()
        sheet_width, sheet_height = sprite_sheet.get_size()
        frame_width = sheet_width // 2
        frame_height = sheet_height // 2
        
        self.frames = []
        # Extract 4 frames from 2x2 grid
        for row in range(2):
            for col in range(2):
                frame = sprite_sheet.subsurface(
                    (col * frame_width, row * frame_height, frame_width, frame_height)
                )
                # Scale frame to desired size
                self.frames.append(pygame.transform.scale(frame, (self.width, self.height)))
        
        self.current_frame = 0
        self.animation_timer = 0
        self.animation_speed = 8  # Frames per animation cycle
        
    def update(self):
        # Apply gravity
        self.velocity += GRAVITY
        self.y += self.velocity
        
        # Keep player on screen
        if self.y < 0:
            self.y = 0
            self.velocity = 0
        if self.y > SCREEN_HEIGHT - self.height:
            self.y = SCREEN_HEIGHT - self.height
            self.velocity = 0
        
        # Animate
        self.animation_timer += 1
        if self.animation_timer >= self.animation_speed:
            self.animation_timer = 0
            self.current_frame = (self.current_frame + 1) % len(self.frames)
    
    def jump(self):
        self.velocity = JUMP_STRENGTH
    
    def draw(self, screen):
        screen.blit(self.frames[self.current_frame], (self.x, self.y))
    
    def get_rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)


class ChessPiece:
    def __init__(self, piece_type, x, y):
        self.piece_type = piece_type
        self.x = x
        self.y = y
        self.width = 50
        self.height = 50
        
        # Load appropriate chess piece image
        # Note: King size will be set in setup_movement(), so we'll load image after
        color = random.choice(['W', 'B'])
        self.piece_color = color
        self.piece_image_path = f"{color}_{piece_type}.png"
        
        # Movement properties based on piece type (sets width/height for King)
        self.setup_movement()
        
        # Now load and scale image with correct size
        try:
            self.image = pygame.image.load(self.piece_image_path).convert_alpha()
            self.image = pygame.transform.scale(self.image, (self.width, self.height))
        except:
            # Fallback if image not found
            self.image = pygame.Surface((self.width, self.height))
            self.image.fill((100, 100, 100))
        
        # Initial movement state
        self.move_timer = 0
        self.spawn_age = 0  # Track how long piece has been on screen
        
        # Horizontal speed: will be set by setup_movement() based on piece type
        # Default for most pieces: random between 3.5-14 pixels per frame to cross screen in 1-4 seconds
        # Screen is 800px wide, pieces spawn at 850px, so need to travel 850px
        # At 60 FPS: 1 second = 60 frames (850/60 = 14.2), 4 seconds = 240 frames (850/240 = 3.5)
        # Reduced by 20% (multiply by 0.8)
        if not hasattr(self, 'horizontal_speed'):
            self.horizontal_speed = random.uniform(3.5, 14.0) * 0.8
        
        # Vertical movement direction (1 for down, -1 for up)
        self.vertical_direction = random.choice([1, -1])
        
        # Note: vertical_speed is set by setup_movement() based on piece type
        # For Bishop: diagonal horizontal component (also set by setup_movement)
        # For Knight: L-shape movement state
        self.knight_state = None
        self.knight_target_y = None
        self.knight_target_x = None
        self.knight_move_speed = 0
        
    def setup_movement(self):
        """Setup movement speeds based on chess piece type"""
        if self.piece_type == "Pawn":
            # Pawn: only leftward movement (no vertical)
            self.vertical_speed = 0
            self.diagonal_horizontal = 0
            self.horizontal_speed = random.uniform(3.5, 14.0) * 0.8 * (2/3)  # 1/3 slower
            
        elif self.piece_type == "Rook":
            # Rook: fast vertical movement, slow leftward movement
            # Moves from top to bottom in 2 seconds
            # Screen height is 600px, piece is 50px, so travel ~550px in 120 frames (2 seconds at 60 FPS)
            # Speed needed: 550 / 120 = ~4.6 pixels per frame
            self.vertical_speed = 4.6 * (2/3)  # 1/3 slower
            self.diagonal_horizontal = 0
            # Slow horizontal movement (half of normal speed)
            self.horizontal_speed = random.uniform(3.5, 14.0) * 0.8 * 0.5 * (2/3)  # 1/3 slower
            
        elif self.piece_type == "Knight":
            # Knight: L-shape movement (discrete jumps, not fluid)
            # Moves 2 squares vertically, then 1 square horizontally left
            # Using 60 pixels per "square"
            self.square_size = 60
            self.vertical_jump = 2 * self.square_size  # 120 pixels
            self.horizontal_jump = 1 * self.square_size  # 60 pixels
            self.knight_state = "vertical"  # "vertical" or "horizontal"
            self.knight_target_y = None
            self.knight_target_x = None
            self.knight_move_speed = 8 * (2/3)  # pixels per frame for the jump (1/3 slower)
            self.vertical_speed = 0  # Not used for knight
            self.diagonal_horizontal = 0
            self.horizontal_speed = random.uniform(3.5, 14.0) * 0.8 * (2/3)  # 1/3 slower
            
        elif self.piece_type == "Bishop":
            # Bishop: equal vertical and leftward movement (diagonal)
            # Set both to same value for true 45-degree diagonal
            self.vertical_speed = 5 * (2/3)  # 1/3 slower
            self.diagonal_horizontal = 0
            # Horizontal speed should equal vertical speed for true diagonal
            self.horizontal_speed = 5 * (2/3)  # 1/3 slower
            
        elif self.piece_type == "Queen":
            # Queen: randomly selects movement from any piece type with probabilities
            movement_types = ['rook', 'bishop', 'knight', 'pawn']
            self.queen_movement_type = random.choice(movement_types)
            
            if self.queen_movement_type == 'rook':
                # Fast vertical, slow horizontal
                self.vertical_speed = 4.6
                self.diagonal_horizontal = 0
                self.horizontal_speed = random.uniform(3.5, 14.0) * 0.8 * 0.5
            elif self.queen_movement_type == 'bishop':
                # Equal vertical and horizontal
                self.vertical_speed = 5
                self.diagonal_horizontal = 0
                self.horizontal_speed = 5
            elif self.queen_movement_type == 'knight':
                # L-shape (handled separately in update)
                # Initialize knight movement variables
                self.square_size = 60
                self.vertical_jump = 2 * self.square_size  # 120 pixels
                self.horizontal_jump = 1 * self.square_size  # 60 pixels
                self.knight_state = None  # Will be initialized in update
                self.knight_target_y = None
                self.knight_target_x = None
                self.knight_move_speed = 8  # pixels per frame for the jump
                self.vertical_speed = 0  # Not used for knight
                self.diagonal_horizontal = 0
                self.horizontal_speed = random.uniform(3.5, 14.0) * 0.8
            else:  # pawn
                # Only leftward
                self.vertical_speed = 0
                self.diagonal_horizontal = 0
                self.horizontal_speed = random.uniform(3.5, 14.0) * 0.8
            
        elif self.piece_type == "King":
            # King: slow leftward movement, no vertical movement, larger size
            self.vertical_speed = 0
            self.diagonal_horizontal = 0
            # Slow horizontal movement (half of normal speed)
            self.horizontal_speed = random.uniform(3.5, 14.0) * 0.8 * 0.5 * (2/3)  # 1/3 slower
            # Make King larger
            self.width = 70
            self.height = 70
        else:
            # Default: simple forward movement
            self.vertical_speed = 0
            self.diagonal_horizontal = 0
            self.horizontal_speed = random.uniform(3.5, 14.0) * 0.8 * (2/3)  # 1/3 slower
    
    def update(self, speed_multiplier=1.0):
        # Increment age (for safety removal of stuck pieces)
        self.spawn_age += 1
        
        # Apply speed multiplier to all movement
        effective_horizontal_speed = self.horizontal_speed * speed_multiplier
        effective_vertical_speed = self.vertical_speed * speed_multiplier
        effective_knight_move_speed = self.knight_move_speed * speed_multiplier
        
        # Knight has special L-shape movement (discrete jumps)
        # Queen can also use Knight movement when queen_movement_type == 'knight'
        if self.piece_type == "Knight" or (self.piece_type == "Queen" and hasattr(self, 'queen_movement_type') and self.queen_movement_type == 'knight'):
            # Knight does NOT have continuous leftward movement - only moves left during L-shape
            
            # Initialize knight movement if needed
            if self.knight_state is None:
                self.knight_state = "vertical"
                # Choose initial vertical direction (up or down)
                self.vertical_direction = random.choice([1, -1])
                self.knight_target_y = self.y + (self.vertical_jump * self.vertical_direction)
                # Clamp target to screen bounds
                if self.knight_target_y < 0:
                    self.knight_target_y = 0
                    self.vertical_direction = 1
                elif self.knight_target_y > SCREEN_HEIGHT - self.height:
                    self.knight_target_y = SCREEN_HEIGHT - self.height
                    self.vertical_direction = -1
            
            if self.knight_state == "vertical":
                # Move toward vertical target (2 squares up or down)
                distance_to_target = abs(self.knight_target_y - self.y)
                if distance_to_target > effective_knight_move_speed:
                    # Move toward target
                    if self.y < self.knight_target_y:
                        self.y += effective_knight_move_speed
                    else:
                        self.y -= effective_knight_move_speed
                else:
                    # Reached target, switch to horizontal movement
                    self.y = self.knight_target_y
                    self.knight_state = "horizontal"
                    # Set target for 1 square left (in addition to continuous leftward movement)
                    self.knight_target_x = self.x - self.horizontal_jump
            
            elif self.knight_state == "horizontal":
                # Move toward horizontal target (1 square left) - this is the ONLY leftward movement
                distance_to_target = abs(self.knight_target_x - self.x)
                if distance_to_target > effective_knight_move_speed:
                    # Move toward target (leftward movement for the L-shape)
                    if self.x > self.knight_target_x:
                        self.x -= effective_knight_move_speed
                else:
                    # Reached target, switch back to vertical movement
                    self.x = self.knight_target_x
                    self.knight_state = "vertical"
                    # Choose next vertical direction (reverse if at boundary, otherwise random)
                    if self.y <= 0:
                        self.vertical_direction = 1  # Must go down
                    elif self.y >= SCREEN_HEIGHT - self.height:
                        self.vertical_direction = -1  # Must go up
                    else:
                        # Randomly choose up or down
                        self.vertical_direction = random.choice([1, -1])
                    self.knight_target_y = self.y + (self.vertical_jump * self.vertical_direction)
                    # Clamp target to screen bounds
                    if self.knight_target_y < 0:
                        self.knight_target_y = 0
                    elif self.knight_target_y > SCREEN_HEIGHT - self.height:
                        self.knight_target_y = SCREEN_HEIGHT - self.height
        
        else:
            # Other pieces: normal movement
            # Move horizontally (each piece type has its own horizontal_speed set in setup_movement)
            self.x -= effective_horizontal_speed
            
            # Move vertically based on piece type and direction
            vertical_movement = effective_vertical_speed * self.vertical_direction
            self.y += vertical_movement
        
        # For Queen, occasionally change movement type
        if self.piece_type == "Queen" and random.random() < 0.05:
            movement_types = ['rook', 'bishop', 'knight', 'pawn']
            self.queen_movement_type = random.choice(movement_types)
            
            if self.queen_movement_type == 'rook':
                # Fast vertical, slow horizontal
                self.vertical_speed = 4.6 * (2/3)  # 1/3 slower
                self.diagonal_horizontal = 0
                self.horizontal_speed = random.uniform(3.5, 14.0) * 0.8 * 0.5 * (2/3)  # 1/3 slower
            elif self.queen_movement_type == 'bishop':
                # Equal vertical and horizontal
                self.vertical_speed = 5 * (2/3)  # 1/3 slower
                self.diagonal_horizontal = 0
                self.horizontal_speed = 5 * (2/3)  # 1/3 slower
            elif self.queen_movement_type == 'knight':
                # L-shape (handled separately in update)
                # Initialize knight movement variables
                self.square_size = 60
                self.vertical_jump = 2 * self.square_size  # 120 pixels
                self.horizontal_jump = 1 * self.square_size  # 60 pixels
                self.knight_state = None  # Will be initialized in update
                self.knight_target_y = None
                self.knight_target_x = None
                self.knight_move_speed = 8 * (2/3)  # pixels per frame for the jump (1/3 slower)
                self.vertical_speed = 0  # Not used for knight
                self.diagonal_horizontal = 0
                self.horizontal_speed = random.uniform(3.5, 14.0) * 0.8 * (2/3)  # 1/3 slower
            else:  # pawn
                # Only leftward
                self.vertical_speed = 0
                self.diagonal_horizontal = 0
                self.horizontal_speed = random.uniform(3.5, 14.0) * 0.8 * (2/3)  # 1/3 slower
        
        # Only change vertical direction when hitting top or bottom boundary (not for Knight or Queen in knight mode, they have their own logic)
        is_knight_movement = (self.piece_type == "Knight" or 
                             (self.piece_type == "Queen" and hasattr(self, 'queen_movement_type') and self.queen_movement_type == 'knight'))
        if not is_knight_movement:
            if self.y <= 0:
                self.y = 0
                self.vertical_direction = 1  # Change to moving down
            elif self.y >= SCREEN_HEIGHT - self.height:
                self.y = SCREEN_HEIGHT - self.height
                self.vertical_direction = -1  # Change to moving up
    
    def draw(self, screen):
        screen.blit(self.image, (self.x, self.y))
    
    def get_rect(self):
        # Make hitbox smaller (80% of original size, centered)
        hitbox_width = int(self.width * 0.8)
        hitbox_height = int(self.height * 0.8)
        hitbox_x = self.x + (self.width - hitbox_width) // 2
        hitbox_y = self.y + (self.height - hitbox_height) // 2
        return pygame.Rect(hitbox_x, hitbox_y, hitbox_width, hitbox_height)


class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Flappy Chess")
        self.clock = pygame.time.Clock()
        
        # Initialize audio mixer
        pygame.mixer.init()
        
        # Game state: "title", "playing", "game_over", "shop", "paused"
        self.state = "title"
        self.paused = False
        
        # Load background music files in specific order
        self.music_files = [
            "stadium bites 134.mp3",
            "booyeah 120.mp3",
            "trinity 150.mp3",
            "beautiful fields 138.mp3"
        ]
        self.current_music_index = 0
        self.music_playing = False
        self.music_timer = 0
        self.music_switch_interval = 90 * FPS  # 90 seconds in frames
        self.music_speed = 1.0  # Playback speed multiplier
        
        # Load sound effects
        try:
            self.point_sound = pygame.mixer.Sound("SFX-06.wav")
        except:
            self.point_sound = None
        
        # Load background
        try:
            self.background = pygame.image.load("Background.png").convert()
            self.background = pygame.transform.scale(self.background, (SCREEN_WIDTH, SCREEN_HEIGHT))
        except:
            self.background = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
            self.background.fill((135, 206, 235))  # Sky blue fallback
        
        # Load title screen assets
        try:
            self.logo = pygame.image.load("citadell games logo.png").convert_alpha()
            # Scale logo to fit in corner (about 150px wide)
            logo_width = 150
            logo_height = int(self.logo.get_height() * (logo_width / self.logo.get_width()))
            self.logo = pygame.transform.scale(self.logo, (logo_width, logo_height))
        except:
            self.logo = None
        
        try:
            start_button_full = pygame.image.load("start game button.png").convert_alpha()
            # Cut the image in half horizontally (take the top half)
            button_width = start_button_full.get_width()
            button_height = start_button_full.get_height() // 2
            # Extract top half of the image
            self.start_button = start_button_full.subsurface((0, 0, button_width, button_height))
            # Scale button to reasonable size
            scaled_width = 200
            scaled_height = int(button_height * (scaled_width / button_width))
            self.start_button = pygame.transform.scale(self.start_button, (scaled_width, scaled_height))
            self.start_button_rect = self.start_button.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 50))
        except:
            self.start_button = None
            self.start_button_rect = pygame.Rect(SCREEN_WIDTH // 2 - 100, SCREEN_HEIGHT // 2 - 50, 200, 50)
        
        try:
            self.shop_button = pygame.image.load("shop button.png").convert_alpha()
            # Scale button to match start button size
            if self.start_button:
                button_width = self.start_button.get_width()
                button_height = int(self.shop_button.get_height() * (button_width / self.shop_button.get_width()))
            else:
                button_width = 200
                button_height = 50
            self.shop_button = pygame.transform.scale(self.shop_button, (button_width, button_height))
            self.shop_button_rect = self.shop_button.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 50))
        except:
            self.shop_button = None
            self.shop_button_rect = pygame.Rect(SCREEN_WIDTH // 2 - 100, SCREEN_HEIGHT // 2 + 50, 200, 50)
        
        # Game objects (initialized when game starts)
        self.player = None
        self.chess_pieces = []
        self.score = 0
        self.game_over = False
        self.font = pygame.font.Font(None, 36)
        self.big_font = pygame.font.Font(None, 72)
        
        # Spawn timer
        self.spawn_timer = 0
        self.spawn_delay = 90  # Frames between spawns (~1.5 seconds at 60 FPS for one piece every 1-2 seconds)
    
    def start_game(self):
        """Initialize and start a new game"""
        self.player = JetpackMan(100, SCREEN_HEIGHT // 2)
        self.chess_pieces = []
        self.score = 0
        self.game_over = False
        self.paused = False
        self.spawn_timer = 0
        self.state = "playing"
        # Don't reset music timer - keep music playing
        
        # Start background music only if not already playing
        if not self.music_playing:
            self.play_background_music()
    
    def play_background_music(self):
        """Play background music in the specified order"""
        if len(self.music_files) > 0:
            try:
                pygame.mixer.music.load(self.music_files[self.current_music_index])
                # Note: pygame.mixer.music doesn't support speed control directly
                # We'll use a workaround by adjusting the switch interval
                pygame.mixer.music.play()
                self.music_playing = True
            except:
                pass
    
    def check_music(self):
        """Check if music ended and play next track"""
        if self.state == "playing" and not self.game_over:
            if self.music_playing:
                # Only switch when current track ends (let songs play in their entirety)
                if not pygame.mixer.music.get_busy():
                    # Move to next track in order
                    self.current_music_index = (self.current_music_index + 1) % len(self.music_files)
                    self.play_background_music()
        elif self.state != "playing":
            # Stop music when not playing
            if self.music_playing:
                pygame.mixer.music.stop()
                self.music_playing = False
                self.music_timer = 0
        
    def spawn_chess_piece(self):
        """Spawn a random chess piece at a random position"""
        piece_types = ["Pawn", "Rook", "Knight", "Bishop", "Queen", "King"]
        piece_type = random.choice(piece_types)
        
        # Spawn off-screen to the right
        x = SCREEN_WIDTH + 50
        y = random.randint(50, SCREEN_HEIGHT - 50)
        
        self.chess_pieces.append(ChessPiece(piece_type, x, y))
    
    def check_collisions(self):
        """Check for collisions between player and chess pieces"""
        player_rect = self.player.get_rect()
        
        for piece in self.chess_pieces:
            if player_rect.colliderect(piece.get_rect()):
                return True
        return False
    
    def update(self):
        if self.state != "playing":
            return
        
        if self.game_over:
            return
        
        # Update player
        self.player.update()
        
        # Spawn chess pieces (limit to 5 pieces on screen max to prevent overcrowding)
        self.spawn_timer += 1
        if self.spawn_timer >= self.spawn_delay and len(self.chess_pieces) < 5:
            self.spawn_timer = 0
            self.spawn_chess_piece()
        
        # Calculate speed multiplier based on score (gradually increase)
        # Speed increases by 0.1 for every 10 points, max 2.0x speed
        speed_multiplier = 1.0 + (self.score // 10) * 0.1
        speed_multiplier = min(speed_multiplier, 2.0)  # Cap at 2x speed
        
        # Update chess pieces
        for piece in self.chess_pieces[:]:
            piece.update(speed_multiplier)
            
            # Remove pieces that are far off-screen (left side)
            if piece.x < -150:
                self.chess_pieces.remove(piece)
                self.score += 1
                # Play point sound effect
                if self.point_sound:
                    self.point_sound.play()
            # Remove pieces that somehow went too far right (shouldn't happen, but safety check)
            elif piece.x > SCREEN_WIDTH + 200:
                self.chess_pieces.remove(piece)
            # Safety: Remove pieces that have been on screen too long (10 seconds at 60 FPS = 600 frames)
            # This prevents pieces from getting stuck and blocking new spawns
            elif piece.spawn_age > 600:
                self.chess_pieces.remove(piece)
                self.score += 1
                # Play point sound effect
                if self.point_sound:
                    self.point_sound.play()
        
        # Check if music needs to continue
        self.check_music()
        
        # Check collisions
        if self.check_collisions():
            self.game_over = True
            # Keep state as "playing" so game over screen shows
    
    def draw(self):
        # Draw background
        self.screen.blit(self.background, (0, 0))
        
        if self.state == "title":
            self.draw_title_screen()
        elif self.state == "shop":
            self.draw_shop_screen()
        elif self.state == "playing":
            if not self.game_over:
                # Draw chess pieces
                for piece in self.chess_pieces:
                    piece.draw(self.screen)
                
                # Draw player
                self.player.draw(self.screen)
                
                # Draw score
                score_text = self.font.render(f"Score: {self.score}", True, WHITE)
                self.screen.blit(score_text, (10, 10))
                
                # Draw pause button
                pause_button = pygame.Rect(SCREEN_WIDTH - 100, 10, 90, 30)
                pygame.draw.rect(self.screen, (100, 100, 100), pause_button)
                pygame.draw.rect(self.screen, WHITE, pause_button, 2)
                pause_text = self.font.render("PAUSE", True, WHITE)
                pause_text_rect = pause_text.get_rect(center=pause_button.center)
                self.screen.blit(pause_text, pause_text_rect)
                
                # Draw pause overlay if paused
                if self.paused:
                    overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT))
                    overlay.set_alpha(180)
                    overlay.fill(BLACK)
                    self.screen.blit(overlay, (0, 0))
                    
                    pause_title = self.big_font.render("PAUSED", True, WHITE)
                    pause_title_rect = pause_title.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 50))
                    self.screen.blit(pause_title, pause_title_rect)
                    
                    resume_text = self.font.render("Press P or click PAUSE to resume", True, WHITE)
                    resume_text_rect = resume_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 20))
                    self.screen.blit(resume_text, resume_text_rect)
            else:
                # Game over screen
                game_over_text = self.big_font.render("GAME OVER", True, RED)
                score_text = self.font.render(f"Final Score: {self.score}", True, WHITE)
                restart_text = self.font.render("Press SPACE to restart", True, WHITE)
                escape_text = self.font.render("Press ESC to return to menu", True, WHITE)
                
                text_rect = game_over_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 80))
                score_rect = score_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 20))
                restart_rect = restart_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 40))
                escape_rect = escape_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 80))
                
                self.screen.blit(game_over_text, text_rect)
                self.screen.blit(score_text, score_rect)
                self.screen.blit(restart_text, restart_rect)
                self.screen.blit(escape_text, escape_rect)
        
        pygame.display.flip()
    
    def draw_title_screen(self):
        """Draw the title screen with logo and buttons"""
        # Draw logo in top-left corner
        if self.logo:
            self.screen.blit(self.logo, (10, 10))
        
        # Draw title text
        title_text = self.big_font.render("FLAPPY CHESS", True, WHITE)
        title_rect = title_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 150))
        self.screen.blit(title_text, title_rect)
        
        # Draw buttons
        if self.start_button:
            self.screen.blit(self.start_button, self.start_button_rect)
        else:
            # Fallback button
            pygame.draw.rect(self.screen, (0, 150, 0), self.start_button_rect)
            start_text = self.font.render("START GAME", True, WHITE)
            start_text_rect = start_text.get_rect(center=self.start_button_rect.center)
            self.screen.blit(start_text, start_text_rect)
        
        if self.shop_button:
            self.screen.blit(self.shop_button, self.shop_button_rect)
        else:
            # Fallback button
            pygame.draw.rect(self.screen, (150, 100, 0), self.shop_button_rect)
            shop_text = self.font.render("SHOP", True, WHITE)
            shop_text_rect = shop_text.get_rect(center=self.shop_button_rect.center)
            self.screen.blit(shop_text, shop_text_rect)
    
    def draw_shop_screen(self):
        """Draw the shop screen"""
        # Draw logo in top-left corner
        if self.logo:
            self.screen.blit(self.logo, (10, 10))
        
        # Draw "Shop" title
        shop_title = self.big_font.render("SHOP", True, WHITE)
        shop_title_rect = shop_title.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 100))
        self.screen.blit(shop_title, shop_title_rect)
        
        # Draw "Not open yet" message
        message_text = self.font.render("The shop is not open yet!", True, WHITE)
        message_rect = message_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2))
        self.screen.blit(message_text, message_rect)
        
        # Draw back instruction
        back_text = self.font.render("Press ESC to return to menu", True, WHITE)
        back_rect = back_text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 50))
        self.screen.blit(back_text, back_rect)
    
    def restart(self):
        """Restart the game"""
        self.start_game()
    
    def run(self):
        running = True
        
        while running:
            self.clock.tick(FPS)
            
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        # Return to title screen from game over or shop
                        if self.state == "game_over" or self.state == "shop":
                            self.state = "title"
                        elif self.state == "playing" and self.game_over:
                            self.state = "title"
                    elif event.key == pygame.K_SPACE:
                        if self.state == "playing":
                            if self.game_over:
                                self.restart()
                            elif not self.paused:
                                if self.player:
                                    self.player.jump()
                    elif event.key == pygame.K_p:
                        # Toggle pause
                        if self.state == "playing" and not self.game_over:
                            self.paused = not self.paused
                
                if event.type == pygame.MOUSEBUTTONDOWN:
                    if event.button == 1:  # Left mouse button
                        mouse_pos = pygame.mouse.get_pos()
                        
                        if self.state == "title":
                            # Check if start button was clicked
                            if self.start_button_rect.collidepoint(mouse_pos):
                                self.start_game()
                            # Check if shop button was clicked
                            elif self.shop_button_rect.collidepoint(mouse_pos):
                                self.state = "shop"
                        elif self.state == "playing":
                            if not self.game_over:
                                # Check if pause button was clicked
                                pause_button = pygame.Rect(SCREEN_WIDTH - 100, 10, 90, 30)
                                if pause_button.collidepoint(mouse_pos):
                                    self.paused = not self.paused
                                elif not self.paused:
                                    # Click to jump (anywhere on screen during gameplay)
                                    if self.player:
                                        self.player.jump()
            
            self.update()
            self.draw()
        
        pygame.quit()
        sys.exit()


if __name__ == "__main__":
    game = Game()
    game.run()
