/**
 * Maze generation using iterative recursive backtracking.
 *
 * Produces a fully-connected grid where every cell is reachable from every
 * other cell. Each cell stores wall state for all four sides.
 *
 * Algorithm: O(V) time, O(V) space where V = rows * cols.
 */

/**
 * Generate a random maze of the given dimensions.
 *
 * @param {number} rows - Number of rows in the grid
 * @param {number} cols - Number of columns in the grid
 * @returns {{ rows: number, cols: number, grid: Cell[][], start: {row:number,col:number}, end: {row:number,col:number} }}
 */
export function generateMaze(rows, cols) {
  // Create grid with all walls intact
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = {
        walls: { top: true, right: true, bottom: true, left: true },
      };
    }
  }

  // Track visited cells
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

  // Iterative recursive backtracking with explicit stack
  const stack = [{ row: 0, col: 0 }];
  visited[0][0] = true;

  // Direction offsets: [dr, dc, wallFromCurrent, wallFromNeighbor]
  const directions = [
    { dr: -1, dc: 0, from: 'top', to: 'bottom' },
    { dr: 0, dc: 1, from: 'right', to: 'left' },
    { dr: 1, dc: 0, from: 'bottom', to: 'top' },
    { dr: 0, dc: -1, from: 'left', to: 'right' },
  ];

  while (stack.length > 0) {
    const current = stack[stack.length - 1]; // peek, do NOT pop

    // Find unvisited neighbors
    const unvisited = [];
    for (const { dr, dc } of directions) {
      const nr = current.row + dr;
      const nc = current.col + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
        unvisited.push({ row: nr, col: nc });
      }
    }

    if (unvisited.length > 0) {
      // Pick a random unvisited neighbor
      const chosen = unvisited[Math.floor(Math.random() * unvisited.length)];

      // Determine wall direction between current and chosen
      const dr = chosen.row - current.row;
      const dc = chosen.col - current.col;
      let wallFrom, wallTo;
      if (dr === -1) { wallFrom = 'top'; wallTo = 'bottom'; }
      else if (dr === 1) { wallFrom = 'bottom'; wallTo = 'top'; }
      else if (dc === 1) { wallFrom = 'right'; wallTo = 'left'; }
      else { wallFrom = 'left'; wallTo = 'right'; }

      // Remove walls between current and chosen
      grid[current.row][current.col].walls[wallFrom] = false;
      grid[chosen.row][chosen.col].walls[wallTo] = false;

      // Mark chosen as visited and push onto stack
      visited[chosen.row][chosen.col] = true;
      stack.push({ row: chosen.row, col: chosen.col });
    } else {
      // No unvisited neighbors -- backtrack
      stack.pop();
    }
  }

  return {
    rows,
    cols,
    grid,
    start: { row: 0, col: 0 },
    end: { row: rows - 1, col: cols - 1 },
  };
}
