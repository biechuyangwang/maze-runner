/**
 * BFS pathfinding for Maze Runner.
 *
 * Finds the shortest path through a generated maze using Breadth-First Search.
 * Operates on the maze data structure returned by generateMaze() from maze.js.
 *
 * Algorithm: O(V+E) time, O(V) space where V = rows * cols.
 */

/**
 * Find the shortest path from start to end in a maze using BFS.
 *
 * @param {{ grid: Array<Array<{walls:{top:boolean,right:boolean,bottom:boolean,left:boolean}}>>, rows: number, cols: number, start: {row:number,col:number}, end: {row:number,col:number} }} maze
 *   The maze object as returned by generateMaze().
 * @returns {Array<{row:number,col:number}>} Shortest path from start to end (inclusive).
 */
export function findPath(maze) {
  const { grid, rows, cols, start, end } = maze;

  // Visited tracker and parent map for path reconstruction
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const parent = Array.from({ length: rows }, () => Array(cols).fill(null));

  // Direction offsets matching wall names in maze.js grid structure
  const directions = [
    { dr: -1, dc: 0, wall: 'top' },
    { dr: 0, dc: 1, wall: 'right' },
    { dr: 1, dc: 0, wall: 'bottom' },
    { dr: 0, dc: -1, wall: 'left' },
  ];

  // BFS initialization
  const queue = [{ row: start.row, col: start.col }];
  visited[start.row][start.col] = true;

  // BFS loop
  while (queue.length > 0) {
    const curr = queue.shift();

    // Reached the end
    if (curr.row === end.row && curr.col === end.col) {
      break;
    }

    // Explore neighbors
    for (const { dr, dc, wall } of directions) {
      const nr = curr.row + dr;
      const nc = curr.col + dc;

      // Bounds check
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      // Skip already visited
      if (visited[nr][nc]) continue;
      // Check wall on current cell (matches input.js collision pattern)
      if (grid[curr.row][curr.col].walls[wall]) continue;

      visited[nr][nc] = true;
      parent[nr][nc] = { row: curr.row, col: curr.col };
      queue.push({ row: nr, col: nc });
    }
  }

  // Guard: if end was never reached by BFS, there is no path
  if (!visited[end.row][end.col]) {
    return [];
  }

  // Reconstruct path from end back to start
  const path = [];
  let current = { row: end.row, col: end.col };
  while (current) {
    path.unshift(current);
    current = parent[current.row][current.col];
  }

  return path;
}
