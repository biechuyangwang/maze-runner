/**
 * Input handling for Maze Runner.
 *
 * Manages keyboard input, player movement with wall collision detection,
 * and key-to-direction mapping for Arrow keys and WASD controls.
 */

/**
 * Map a keyboard key to a movement direction.
 *
 * @param {string} key - The event.key value from a KeyboardEvent
 * @returns {string|null} Direction string ('up', 'down', 'left', 'right') or null
 */
export function keyToDirection(key) {
  const map = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    a: 'left',
    s: 'down',
    d: 'right',
  };
  return map[key] || null;
}

/**
 * Move the player in the given direction, checking for wall collisions
 * and boundary conditions.
 *
 * Mutates state.player and state.steps on valid moves.
 *
 * @param {{ maze: object, player: {row:number,col:number}, steps: number }} state
 * @param {string} direction - 'up', 'down', 'left', or 'right'
 * @returns {boolean} true if the move was valid and executed, false otherwise
 */
export function movePlayer(state, direction) {
  const { row, col } = state.player;
  const cell = state.maze.grid[row][col];

  // Wall check: each direction corresponds to a wall on the current cell
  const wallForDirection = {
    up: 'top',
    down: 'bottom',
    left: 'left',
    right: 'right',
  };

  const wall = wallForDirection[direction];
  if (cell.walls[wall]) {
    return false;
  }

  // Compute new position
  const delta = {
    up: { dr: -1, dc: 0 },
    down: { dr: 1, dc: 0 },
    left: { dr: 0, dc: -1 },
    right: { dr: 0, dc: 1 },
  };

  const { dr, dc } = delta[direction];
  const newRow = row + dr;
  const newCol = col + dc;

  // Bounds check
  if (newRow < 0 || newRow >= state.maze.rows || newCol < 0 || newCol >= state.maze.cols) {
    return false;
  }

  // Valid move: update state
  state.player.row = newRow;
  state.player.col = newCol;
  state.steps++;
  return true;
}

/**
 * Set up keyboard event listeners for game input.
 *
 * Uses a getState function to always read the current state
 * (handles maze regeneration where state object is replaced).
 *
 * @param {function} getState - Returns the current game state
 * @param {function} onMove - Callback invoked after a successful move
 */
export function setupInput(getState, onMove) {
  document.addEventListener('keydown', (e) => {
    const direction = keyToDirection(e.key);
    if (!direction) return;
    e.preventDefault(); // prevent page scroll for arrow keys
    const state = getState();
    if (state.won) return; // block movement after victory
    onMove(direction);
  });
}

/**
 * Set up swipe gesture detection on the canvas for touch/pointer input.
 *
 * Uses Pointer Events for unified mouse+touch+pen handling.
 * Detects swipe direction via pointerdown/pointerup coordinate delta
 * with a minimum distance threshold.
 *
 * @param {HTMLCanvasElement} canvas - The canvas element to listen on
 * @param {function} getState - Returns the current game state
 * @param {function} onMove - Callback invoked after a successful move
 */
export function setupSwipe(canvas, getState, onMove) {
  let startX = 0;
  let startY = 0;
  let isSwiping = false;

  canvas.addEventListener('pointerdown', (e) => {
    startX = e.clientX;
    startY = e.clientY;
    isSwiping = true;
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!isSwiping) return;
    isSwiping = false;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const SWIPE_THRESHOLD = 30;

    if (Math.max(absDx, absDy) < SWIPE_THRESHOLD) return;

    const state = getState();
    if (state.won) return;

    let direction;
    if (absDx > absDy) {
      direction = dx > 0 ? 'right' : 'left';
    } else {
      direction = dy > 0 ? 'down' : 'up';
    }

    onMove(direction);
  });

  canvas.addEventListener('pointerleave', () => { isSwiping = false; });
  canvas.addEventListener('pointercancel', () => { isSwiping = false; });
}
