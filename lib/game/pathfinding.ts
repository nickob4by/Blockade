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
 * Implements full Quoridor pawn movement including straight and diagonal jumps.
 */
export function getValidPawnMoves(
  playerPos: Coordinate,
  opponentPos: Coordinate,
  walls: Wall[]
): Coordinate[] {
  const validMoves: Coordinate[] = [];

  for (const dir of ORTHOGONAL_DIRS) {
    const nextCoord: Coordinate = { r: playerPos.r + dir.r, c: playerPos.c + dir.c };

    if (!isWithinBoard(nextCoord)) continue;
    if (isStepBlockedByWall(playerPos, nextCoord, walls)) continue;

    // If neighbor square is empty, standard move
    if (!isSameCoord(nextCoord, opponentPos)) {
      validMoves.push(nextCoord);
      continue;
    }

    // Neighbor square is occupied by opponent: calculate jump options
    const straightJump: Coordinate = {
      r: opponentPos.r + dir.r,
      c: opponentPos.c + dir.c,
    };

    const canStraightJump =
      isWithinBoard(straightJump) && !isStepBlockedByWall(opponentPos, straightJump, walls);

    if (canStraightJump) {
      validMoves.push(straightJump);
    } else {
      // Straight jump is blocked by a wall or board edge:
      // Player can jump diagonally to either flank of the opponent
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

      for (const pDir of perpendicularDirs) {
        const diagonalTarget: Coordinate = {
          r: opponentPos.r + pDir.r,
          c: opponentPos.c + pDir.c,
        };

        if (
          isWithinBoard(diagonalTarget) &&
          !isStepBlockedByWall(opponentPos, diagonalTarget, walls)
        ) {
          validMoves.push(diagonalTarget);
        }
      }
    }
  }

  return validMoves;
}

/**
 * BFS algorithm to find the shortest path from start to any cell in the target row.
 * Returns the path array (including start and goal), or null if no path exists.
 */
export function findShortestPath(
  start: Coordinate,
  targetRow: number,
  walls: Wall[]
): Coordinate[] | null {
  if (start.r === targetRow) {
    return [start];
  }

  const queue: Coordinate[] = [start];
  const visited: boolean[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(false)
  );
  visited[start.r][start.c] = true;

  // Track parent for path reconstruction: parent[r][c] = Coordinate
  const parent: (Coordinate | null)[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(null)
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

      if (!isWithinBoard(next) || visited[next.r][next.c]) continue;
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
 * Checks if a player has at least one valid path to their goal row.
 */
export function hasValidPathToGoal(
  start: Coordinate,
  targetRow: number,
  walls: Wall[]
): boolean {
  return findShortestPath(start, targetRow, walls) !== null;
}

/**
 * Verifies that placing a candidate wall does not trap either player.
 * (Quoridor rule: each player must always have at least one valid path to finish).
 */
export function doesWallTrapAnyPlayer(
  candidateWall: Wall,
  p1Pos: Coordinate,
  p2Pos: Coordinate,
  currentWalls: Wall[],
  p1TargetRow: number = 0,
  p2TargetRow: number = 8
): boolean {
  const simulatedWalls = [...currentWalls, candidateWall];

  const p1HasPath = hasValidPathToGoal(p1Pos, p1TargetRow, simulatedWalls);
  if (!p1HasPath) return true;

  const p2HasPath = hasValidPathToGoal(p2Pos, p2TargetRow, simulatedWalls);
  return !p2HasPath;
}
