/**
 * Main entry point for Maze Runner.
 *
 * Wires up game state, renderer, input handling, victory detection,
 * level progression, touch controls, and maze regeneration.
 */

import { createGameState, hasWon, levelToSize } from './state.js';
import { createRenderer } from './renderer.js';
import { setupInput, setupSwipe, movePlayer } from './input.js';
import { findPath } from './pathfinder.js';

const canvas = document.getElementById('maze-canvas');
const newMazeBtn = document.getElementById('new-maze-btn');
const showPathBtn = document.getElementById('show-path-btn');
const hintBtn = document.getElementById('hint-btn');
const levelIndicator = document.getElementById('level-indicator');

let currentLevel = 1;
let state = createGameState(currentLevel);
let renderer = createRenderer(canvas, state.maze.rows, state.maze.cols);

// Track the step-count element (refreshed after maze regeneration)
let stepCountEl = document.getElementById('step-count');

// Animation state
let _animating = false;
let _queuedDirection = null;

function updateStepDisplay() {
  const optimal = state.optimalPath ? state.optimalPath.length - 1 : '?';
  const counter = document.querySelector('.step-counter');
  counter.innerHTML = `Steps: <span id="step-count">${state.steps}</span> / Optimal: ${optimal}`;
  stepCountEl = document.getElementById('step-count');
}

function executeMove(direction) {
  if (state.won) return;
  if (_animating) {
    _queuedDirection = direction;
    return;
  }

  const fromRow = state.player.row;
  const fromCol = state.player.col;

  if (!movePlayer(state, direction)) return; // wall collision -- no animation

  _animating = true;
  renderer.startMoveAnimation(fromRow, fromCol, state.player.row, state.player.col, () => {
    _animating = false;
    onMove(); // existing post-move logic (hints, steps, victory)

    // Check for queued move
    if (_queuedDirection) {
      const next = _queuedDirection;
      _queuedDirection = null;
      executeMove(next);
    }
  });
}

function onMove() {
  state.hintCells = null;
  renderer.render(state);
  updateStepDisplay();

  if (hasWon(state)) {
    state.won = true;
    const isMaxLevel = levelToSize(currentLevel) >= 30;
    newMazeBtn.textContent = isMaxLevel ? 'New Maze' : 'Next Level';
    const optimal = state.optimalPath ? state.optimalPath.length - 1 : '?';
    document.querySelector('.step-counter').textContent = `Solved in ${state.steps} steps! (Optimal: ${optimal})`;
    renderer.render(state); // re-render to show victory overlay
    renderer.startCelebration(); // particles on top of victory overlay
  }
}

function startNewMaze() {
  // Increment level unless already at max size (30x30)
  const currentSize = levelToSize(currentLevel);
  if (currentSize < 30) {
    currentLevel++;
  }

  renderer.stopCelebration(); // cancel any active celebration before replacing renderer
  state = createGameState(currentLevel);
  renderer = createRenderer(canvas, state.maze.rows, state.maze.cols);
  _animating = false;
  _queuedDirection = null;
  renderer.render(state);

  // Reset UI
  newMazeBtn.textContent = 'New Maze';
  showPathBtn.textContent = 'Show Path';
  levelIndicator.textContent = 'Level ' + currentLevel;
  const optimal = state.optimalPath ? state.optimalPath.length - 1 : '?';
  const counter = document.querySelector('.step-counter');
  counter.innerHTML = `Steps: <span id="step-count">0</span> / Optimal: ${optimal}`;
  stepCountEl = document.getElementById('step-count');
}

// Initialize game
setupInput(() => state, executeMove);
setupSwipe(canvas, () => state, executeMove);
newMazeBtn.addEventListener('click', startNewMaze);

// Show Path toggle
showPathBtn.addEventListener('click', () => {
  if (state.won) return;
  state.showPath = !state.showPath;
  showPathBtn.textContent = state.showPath ? 'Hide Path' : 'Show Path';
  renderer.render(state);
});

// Hint: show next 3 steps from player position
hintBtn.addEventListener('click', () => {
  if (state.won) return;
  const mazeWithCurrentStart = {
    ...state.maze,
    start: { row: state.player.row, col: state.player.col },
  };
  const hintPath = findPath(mazeWithCurrentStart);
  if (hintPath && hintPath.length > 1) {
    state.hintCells = hintPath.slice(1, 4);
  } else {
    state.hintCells = [];
  }
  renderer.render(state);
});

// Touch device detection
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isTouchDevice) {
  document.body.classList.add('touch-detected');
}

// Wire D-pad buttons with long-press support (always visible)
const dpadDirections = {
  'dpad-up': 'up',
  'dpad-down': 'down',
  'dpad-left': 'left',
  'dpad-right': 'right',
};
for (const [id, direction] of Object.entries(dpadDirections)) {
  const btn = document.getElementById(id);
  let delayTimer = null;
  let repeatTimer = null;

  function stopRepeat() {
    clearTimeout(delayTimer);
    clearInterval(repeatTimer);
    delayTimer = null;
    repeatTimer = null;
  }

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    stopRepeat();
    executeMove(direction);
    delayTimer = setTimeout(() => {
      repeatTimer = setInterval(() => executeMove(direction), 150);
    }, 300);
  });

  btn.addEventListener('pointerup', stopRepeat);
  btn.addEventListener('pointerleave', stopRepeat);
  btn.addEventListener('pointercancel', stopRepeat);
}

renderer.render(state);
updateStepDisplay();
levelIndicator.textContent = 'Level ' + currentLevel;

// Adapt canvas to window resize
window.addEventListener('resize', () => {
  renderer.resize(state.maze.rows, state.maze.cols);
  renderer.render(state);
});
