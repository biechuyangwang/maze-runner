/**
 * Canvas renderer for Maze Runner.
 *
 * Draws maze walls, start/end markers, and the player on an HTML5 canvas
 * with HiDPI/Retina display support via devicePixelRatio scaling.
 *
 * Wall lines are batched into a single path for performance.
 */

/**
 * Create a renderer bound to a canvas element.
 *
 * @param {HTMLCanvasElement} canvas - The canvas element to draw on
 * @param {number} rows - Number of maze rows
 * @param {number} cols - Number of maze columns
 * @returns {{ render: function, resize: function }}
 */
export function createRenderer(canvas, rows, cols) {
  let numRows = rows;
  let numCols = cols;
  const dpr = window.devicePixelRatio || 1;
  const displaySize = Math.min(600, window.innerWidth - 24);
  canvas.style.width = displaySize + 'px';
  canvas.style.height = displaySize + 'px';
  canvas.width = displaySize * dpr;
  canvas.height = displaySize * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  let cellSize = displaySize / Math.max(numRows, numCols);

  // Move animation state
  let _moveAnim = null; // { fromRow, fromCol, toRow, toCol, startTime, duration: 120, progress: 0 }
  let _lastState = null;

  // Celebration particle system state
  let _particles = [];
  let _celebrationRaf = null;
  const CELEBRATION_COLORS = ['#ECC94B', '#4299E1', '#48BB78', '#ED64A6'];

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Render the full maze frame from game state.
   *
   * @param {{ maze: object, player: {row:number,col:number}, steps: number }} state
   */
  function render(state) {
    _lastState = state;
    const { grid, start, end } = state.maze;

    // 1. Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, displaySize, displaySize);

    // 2. Start cell marker
    ctx.fillStyle = 'rgba(72, 187, 120, 0.3)';
    ctx.fillRect(start.col * cellSize, start.row * cellSize, cellSize, cellSize);

    // 3. End cell marker
    ctx.fillStyle = 'rgba(245, 101, 101, 0.3)';
    ctx.fillRect(end.col * cellSize, end.row * cellSize, cellSize, cellSize);

    // 3.5. Path overlay (dashed amber line through cell centers)
    if (state.showPath && state.optimalPath && state.optimalPath.length > 1) {
      ctx.save();
      ctx.strokeStyle = 'rgba(236, 201, 75, 0.7)';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(
        state.optimalPath[0].col * cellSize + cellSize / 2,
        state.optimalPath[0].row * cellSize + cellSize / 2
      );
      for (let i = 1; i < state.optimalPath.length; i++) {
        ctx.lineTo(
          state.optimalPath[i].col * cellSize + cellSize / 2,
          state.optimalPath[i].row * cellSize + cellSize / 2
        );
      }
      ctx.stroke();
      ctx.restore();
    }

    // 3.6. Hint cell highlights
    if (state.hintCells && state.hintCells.length > 0) {
      ctx.fillStyle = 'rgba(236, 201, 75, 0.35)';
      for (const cell of state.hintCells) {
        ctx.fillRect(cell.col * cellSize, cell.row * cellSize, cellSize, cellSize);
      }
    }

    // 4. Walls — batched into a single path for performance
    ctx.strokeStyle = '#2D3748';
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const x = c * cellSize;
        const y = r * cellSize;
        const walls = grid[r][c].walls;

        if (walls.top) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + cellSize, y);
        }
        if (walls.right) {
          ctx.moveTo(x + cellSize, y);
          ctx.lineTo(x + cellSize, y + cellSize);
        }
        if (walls.bottom) {
          ctx.moveTo(x, y + cellSize);
          ctx.lineTo(x + cellSize, y + cellSize);
        }
        if (walls.left) {
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + cellSize);
        }
      }
    }

    ctx.stroke();

    // 5. Player (with animation support)
    let px, py;
    if (_moveAnim) {
      const currentRow = _moveAnim.fromRow + (_moveAnim.toRow - _moveAnim.fromRow) * _moveAnim.progress;
      const currentCol = _moveAnim.fromCol + (_moveAnim.toCol - _moveAnim.fromCol) * _moveAnim.progress;
      px = currentCol * cellSize + cellSize / 2;
      py = currentRow * cellSize + cellSize / 2;
    } else {
      px = state.player.col * cellSize + cellSize / 2;
      py = state.player.row * cellSize + cellSize / 2;
    }
    const radius = cellSize * 0.3;

    ctx.fillStyle = '#4299E1';
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();

    // 6. Victory overlay
    if (state.won) {
      ctx.fillStyle = 'rgba(45, 55, 72, 0.6)';
      ctx.fillRect(0, 0, displaySize, displaySize);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Level Complete!', displaySize / 2, displaySize * 0.42);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = '400 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const optimal = state.optimalPath ? state.optimalPath.length - 1 : '?';
      ctx.fillText(`Solved in ${state.steps} steps (Optimal: ${optimal})`, displaySize / 2, displaySize * 0.55);
    }
  }

  /**
   * Resize the renderer for a new maze.
   *
   * @param {number} newRows - New row count
   * @param {number} newCols - New column count
   */
  function resize(newRows, newCols) {
    const newDpr = window.devicePixelRatio || 1;
    const newDisplaySize = Math.min(600, window.innerWidth - 24);
    canvas.style.width = newDisplaySize + 'px';
    canvas.style.height = newDisplaySize + 'px';
    canvas.width = newDisplaySize * newDpr;
    canvas.height = newDisplaySize * newDpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(newDpr, newDpr);
    numRows = newRows;
    numCols = newCols;
    cellSize = newDisplaySize / Math.max(numRows, numCols);
  }

  /**
   * Start a smooth move animation from one cell to another.
   * Uses requestAnimationFrame with ease-out easing over 120ms.
   *
   * @param {number} fromRow - Source row
   * @param {number} fromCol - Source column
   * @param {number} toRow - Destination row
   * @param {number} toCol - Destination column
   * @param {function} onComplete - Callback when animation finishes
   */
  function startMoveAnimation(fromRow, fromCol, toRow, toCol, onComplete) {
    _moveAnim = {
      fromRow, fromCol, toRow, toCol,
      startTime: null,
      duration: 120,
      progress: 0,
    };

    function step(timestamp) {
      if (!_moveAnim) return; // animation was cancelled
      if (!_moveAnim.startTime) _moveAnim.startTime = timestamp;
      const elapsed = timestamp - _moveAnim.startTime;
      const t = Math.min(elapsed / _moveAnim.duration, 1);
      _moveAnim.progress = easeOutCubic(t);

      render(_lastState);

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        _moveAnim = null;
        onComplete();
      }
    }

    requestAnimationFrame(step);
  }

  /**
   * Check if a move animation is currently in progress.
   *
   * @returns {boolean} True if animating
   */
  function isAnimating() {
    return _moveAnim !== null;
  }

  /**
   * Start a victory celebration particle burst from canvas center.
   * Creates 50 colorful particles that shoot outward, arc with gravity,
   * and fade over ~1.5 seconds. Drawn on top of the victory overlay
   * via a one-shot rAF loop that self-terminates when all particles die.
   */
  function startCelebration() {
    // Cancel any existing celebration
    if (_celebrationRaf) {
      cancelAnimationFrame(_celebrationRaf);
      _celebrationRaf = null;
    }

    _particles = [];
    const cx = displaySize / 2;
    const cy = displaySize / 2;

    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      _particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // slight upward bias for firework effect
        gravity: 0.08,
        opacity: 1,
        fadeRate: 0.01 + Math.random() * 0.005,
        color: CELEBRATION_COLORS[Math.floor(Math.random() * CELEBRATION_COLORS.length)],
        radius: 2 + Math.random() * 3
      });
    }

    function updateParticles() {
      // Update physics
      for (const p of _particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99; // slight air resistance
        p.opacity -= p.fadeRate;
      }

      // Remove dead particles
      _particles = _particles.filter(p => p.opacity > 0);

      // Redraw full frame (maze + victory overlay)
      render(_lastState);

      // Draw particles on top of everything
      for (const p of _particles) {
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (_particles.length > 0) {
        _celebrationRaf = requestAnimationFrame(updateParticles);
      } else {
        _celebrationRaf = null;
      }
    }

    _celebrationRaf = requestAnimationFrame(updateParticles);
  }

  /**
   * Stop any active celebration particle animation.
   * Called when starting a new maze to prevent orphaned rAF callbacks.
   */
  function stopCelebration() {
    if (_celebrationRaf) {
      cancelAnimationFrame(_celebrationRaf);
      _celebrationRaf = null;
    }
    _particles = [];
  }

  return { render, resize, startMoveAnimation, isAnimating, startCelebration, stopCelebration };
}
