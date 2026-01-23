# Flappy Chess - Web Version

This is the web version of Flappy Chess, playable on GitHub Pages.

## Setup for GitHub Pages

1. **Create a GitHub repository** and upload all files:
   - `index.html`
   - `flappy_chess.js`
   - All image files (`.png` files)

2. **Enable GitHub Pages**:
   - Go to your repository Settings
   - Scroll to "Pages" section
   - Under "Source", select "main" branch (or your default branch)
   - Click "Save"

3. **Access your game**:
   - Your game will be available at: `https://[your-username].github.io/[repository-name]/`
   - It may take a few minutes for GitHub Pages to deploy

## File Structure

```
flappy-chess/
├── index.html          # Main HTML file
├── flappy_chess.js    # Game logic (JavaScript)
├── Background.png      # Background image
├── citadell games logo.png
├── start game button.png
├── shop button.png
├── jetpack fly rough.png
├── W_Pawn.png, W_Rook.png, etc. (all chess piece images)
└── B_Pawn.png, B_Rook.png, etc. (all chess piece images)
```

## How to Play

- **Title Screen**: Click "Start Game" to begin or "Shop" to view shop (not open yet)
- **In Game**: Press SPACE to make the jetpack man jump
- **Game Over**: Press SPACE to restart or ESC to return to menu
- **Shop**: Press ESC to return to menu

## Notes

- All images must be in the same directory as `index.html`
- The game uses HTML5 Canvas for rendering
- Works in modern browsers (Chrome, Firefox, Safari, Edge)
