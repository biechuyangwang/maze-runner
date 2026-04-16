/**
 * Game state management for Maze Runner.
 *
 * Creates and manages the game state object containing the maze,
 * player position, and step counter.
 */

import { generateMaze } from './maze.js';
import { findPath } from './pathfinder.js';

const STARTING_SIZE = 8;
const SIZE_INCREMENT = 2;
const MAX_SIZE = 30;

/**
 * Compute maze size (rows and columns) from a level number.
 *
 * @param {number} level - Level number (1-based)
 * @returns {number} Maze size (width and height in cells)
 */
export function levelToSize(level) {
  return Math.min(STARTING_SIZE + (level - 1) * SIZE_INCREMENT, MAX_SIZE);
}

/**
 * Create a new game state with a freshly generated maze.
 *
 * @param {number} [level=1] - Level number (determines maze size)
 * @returns {{ maze: object, player: {row:number,col:number}, steps: number, won: boolean, optimalPath: Array<{row:number,col:number}>, showPath: boolean, hintCells: Array<{row:number,col:number}>|null, level: number }}
 */
export function createGameState(level = 1) {
  const size = levelToSize(level);
  const maze = generateMaze(size, size);
  return {
    maze,
    player: { row: 0, col: 0 },
    steps: 0,
    won: false,
    optimalPath: findPath(maze),
    showPath: false,
    hintCells: null,
    level,
  };
}

/**
 * Check whether the player has reached the maze exit.
 *
 * @param {{ maze: object, player: {row:number,col:number}, steps: number }} state
 * @returns {boolean}
 */
export function hasWon(state) {
  return (
    state.player.row === state.maze.end.row &&
    state.player.col === state.maze.end.col
  );
}
