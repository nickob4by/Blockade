import { Coordinate, Wall } from './types';
import { BOARD_SIZE, isSameCoord, isStepBlockedByWall, isWithinBoard } from './board';

const ORTHOGONAL_DIRS = [
  { r: -1, c: 0 }, // Up
  { r: 1, c: 0 },  // Down
  { r: 0, c: -1 }, // Left
  { r: 0, c: 1 },  // Right
];

/**
 * Returns all valid pawn destination coordinates for the current player.
 * Implements full Quoridor pawn movement including straight and diagonal jumps,
 * supporting single or multiple opponents on any board size.
 */
export function getValidPawnMoves(
  playerPos: Coordinate,
  opponentPos: Coordinate | Coordinate[],
  walls: Wall[],
  boardSize: number = BOARD_SIZE
): Coordinate[] {
  const opponents: Coordinate[] = Array.isArray(opponentPos) ? opponentPos : [opponentPos];
  const validMoves: Coordinate[] = [];

  for (const dir of ORTHOGONAL_DIRS) {
    const nextCoord: Coordinate = { r: playerPos.r + dir.r, c: playerPos.c + dir.c };

    if (!isWithinBoard(nextCoord, boardSize)) continue;
    if (isStepBlockedByWall(playerPos, nextCoord, walls)) continue;

    // Check if neighbor square is occupied by any opponent
    const blockingOpponent = opponents.find((opp) => isSameCoord(nextCoord, opp));

    if (!blockingOpponent) {
      // Empty square: standard move
      validMoves.push(nextCoord);
      continue;
    }

    // Neighbor square is occupied by an opponent: calculate multi-pawn straight and diagonal jumps
    const perpendicularDirs =
      dir.r !== 0
        ? [
            { r: 0, c: -1 },
            { r: 0, c: 1 },
          ]
        : [
            { r: -1, c: 0 },
            { r: 1, c: 0 },
          ];

    // Scan forward along `dir` across all consecutive pawns in line
    const pawnChain: Coordinate[] = [blockingOpponent];
    let curr = blockingOpponent;
    let straightBlocked = false;

    while (true) {
      const stepAhead: Coordinate = {
        r: curr.r + dir.r,
        c: curr.c + dir.c,
      };

      if (!isWithinBoard(stepAhead, boardSize)) {
        straightBlocked = true;
        break;
      }

      if (isStepBlockedByWall(curr, stepAhead, walls)) {
        straightBlocked = true;
        break;
      }

      const nextOpponent = opponents.find((opp) => isSameCoord(stepAhead, opp));
      if (nextOpponent) {
        // Another pawn in line: keep jumping forward through the chain
        pawnChain.push(nextOpponent);
        curr = nextOpponent;
      } else {
        // Unoccupied square found! Valid straight jump past the line of pawns
        validMoves.push(stepAhead);
        break;
      }
    }

    // Diagonal jumps:
    // 1. If straight jump is blocked by a wall or board edge (classic Quoridor flank jump)
    // 2. OR if there are 2 or more pawns in line (multiplayer flank evasion)
    if (straightBlocked || pawnChain.length > 1) {
      const pawnsToFlank =
        pawnChain.length > 1
          ? [pawnChain[0], pawnChain[pawnChain.length - 1]]
          : [blockingOpponent];

      for (const p of pawnsToFlank) {
        for (const pDir of perpendicularDirs) {
          const diagonalTarget: Coordinate = {
            r: p.r + pDir.r,
            c: p.c + pDir.c,
          };

          const isDiagOccupied = opponents.some((opp) => isSameCoord(diagonalTarget, opp));

          if (
            isWithinBoard(diagonalTarget, boardSize) &&
            !isStepBlockedByWall(p, diagonalTarget, walls) &&
            !isDiagOccupied &&
            !isSameCoord(diagonalTarget, playerPos)
          ) {
            validMoves.push(diagonalTarget);
          }
        }
      }
    }
  }

  // Deduplicate results
  const uniqueMoves: Coordinate[] = [];
  validMoves.forEach((m) => {
    if (!uniqueMoves.some((u) => isSameCoord(u, m))) {
      uniqueMoves.push(m);
    }
  });

  return uniqueMoves;
}

/**
 * BFS algorithm to find the shortest path from start to any cell in the target row.
 * Returns the path array (including start and goal), or null if no path exists.
 */
export function findShortestPath(
  start: Coordinate,
  targetRow: number,
  walls: Wall[],
  boardSize: number = BOARD_SIZE
): Coordinate[] | null {
  if (start.r === targetRow) {
    return [start];
  }

  const queue: Coordinate[] = [start];
  const visited: boolean[][] = Array.from({ length: boardSize }, () =>
    Array(boardSize).fill(false)
  );
  visited[start.r][start.c] = true;

  // Track parent for path reconstruction: parent[r][c] = Coordinate
  const parent: (Coordinate | null)[][] = Array.from({ length: boardSize }, () =>
    Array(boardSize).fill(null)
  );

  let targetFound: Coordinate | null = null;

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.r === targetRow) {
      targetFound = current;
      break;
    }

    for (const dir of ORTHOGONAL_DIRS) {
      const next: Coordinate = { r: current.r + dir.r, c: current.c + dir.c };

      if (!isWithinBoard(next, boardSize) || visited[next.r][next.c]) continue;
      if (isStepBlockedByWall(current, next, walls)) continue;

      visited[next.r][next.c] = true;
      parent[next.r][next.c] = current;
      queue.push(next);
    }
  }

  if (!targetFound) return null;

  // Reconstruct path
  const path: Coordinate[] = [];
  let curr: Coordinate | null = targetFound;
  while (curr !== null) {
    path.unshift(curr);
    curr = parent[curr.r][curr.c];
  }

  return path;
}

/**
 * BFS algorithm to find the shortest path from start to any cell in a set of target coordinates
 * (e.g. Center Core in King of the Core mode).
 */
export function findShortestPathToTargets(
  start: Coordinate,
  targets: Coordinate[],
  walls: Wall[],
  boardSize: number = BOARD_SIZE
): Coordinate[] | null {
  if (targets.some((t) => isSameCoord(start, t))) {
    return [start];
  }

  const queue: Coordinate[] = [start];
  const visited: boolean[][] = Array.from({ length: boardSize }, () =>
    Array(boardSize).fill(false)
  );
  visited[start.r][start.c] = true;

  const parent: (Coordinate | null)[][] = Array.from({ length: boardSize }, () =>
    Array(boardSize).fill(null)
  );

  let targetFound: Coordinate | null = null;

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (targets.some((t) => isSameCoord(current, t))) {
      targetFound = current;
      break;
    }

    for (const dir of ORTHOGONAL_DIRS) {
      const next: Coordinate = { r: current.r + dir.r, c: current.c + dir.c };

      if (!isWithinBoard(next, boardSize) || visited[next.r][next.c]) continue;
      if (isStepBlockedByWall(current, next, walls)) continue;

      visited[next.r][next.c] = true;
      parent[next.r][next.c] = current;
      queue.push(next);
    }
  }

  if (!targetFound) return null;

  const path: Coordinate[] = [];
  let curr: Coordinate | null = targetFound;
  while (curr !== null) {
    path.unshift(curr);
    curr = parent[curr.r][curr.c];
  }

  return path;
}

/**
 * Checks if a player has at least one valid path to their goal row or targets.
 */
export function hasValidPathToGoal(
  start: Coordinate,
  target: number | Coordinate[],
  walls: Wall[],
  boardSize: number = BOARD_SIZE
): boolean {
  if (typeof target === 'number') {
    return findShortestPath(start, target, walls, boardSize) !== null;
  }
  return findShortestPathToTargets(start, target, walls, boardSize) !== null;
}

/**
 * Verifies that placing a candidate wall does not trap either player in 1v1.
 */
export function doesWallTrapAnyPlayer(
  candidateWall: Wall,
  p1Pos: Coordinate,
  p2Pos: Coordinate,
  currentWalls: Wall[],
  p1TargetRow: number = 0,
  p2TargetRow: number = 8,
  boardSize: number = BOARD_SIZE
): boolean {
  const simulatedWalls = [...currentWalls, candidateWall];

  const p1HasPath = hasValidPathToGoal(p1Pos, p1TargetRow, simulatedWalls, boardSize);
  if (!p1HasPath) return true;

  const p2HasPath = hasValidPathToGoal(p2Pos, p2TargetRow, simulatedWalls, boardSize);
  return !p2HasPath;
}

/**
 * Verifies that placing a candidate wall does not trap ANY active player in a multi-player game.
 * Returns true if ANY player's path to their destination is completely blocked.
 */
export function doesWallTrapAnyPlayerInMultiplayer(
  candidateWall: Wall,
  players: Array<{ pos: Coordinate; target: number | Coordinate[] }>,
  currentWalls: Wall[],
  boardSize: number = BOARD_SIZE
): boolean {
  const simulatedWalls = [...currentWalls, candidateWall];

  for (const p of players) {
    const hasPath = hasValidPathToGoal(p.pos, p.target, simulatedWalls, boardSize);
    if (!hasPath) return true; // At least one player is trapped!
  }

  return false;
}

/**
 * Backward-compatible alias for doesWallTrapAnyPlayerInMultiplayer.
 */
export const doesWallTrapAllPlayers = doesWallTrapAnyPlayerInMultiplayer;
