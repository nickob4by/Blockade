import { Coordinate, GameMode, GameState, PlayerId, Wall, WallOrientation } from './types';

export const BOARD_SIZE = 9;
export const TOTAL_WALLS_PER_PLAYER = 10;

export const PLAYER_1_START: Coordinate = { r: 8, c: 4 };
export const PLAYER_2_START: Coordinate = { r: 0, c: 4 };
export const PLAYER_1_TARGET_ROW = 0;
export const PLAYER_2_TARGET_ROW = 8;

export function isWithinBoard(coord: Coordinate): boolean {
  return coord.r >= 0 && coord.r < BOARD_SIZE && coord.c >= 0 && coord.c < BOARD_SIZE;
}

export function isSameCoord(a: Coordinate, b: Coordinate): boolean {
  return a.r === b.r && a.c === b.c;
}

export function createInitialGameState(mode: GameMode = 'local'): GameState {
  return {
    players: {
      1: {
        id: 1,
        name: 'Player 1',
        position: { ...PLAYER_1_START },
        wallsLeft: TOTAL_WALLS_PER_PLAYER,
        targetRow: PLAYER_1_TARGET_ROW,
      },
      2: {
        id: 2,
        name: mode === 'ai' ? 'BlockBot (AI)' : 'Player 2',
        position: { ...PLAYER_2_START },
        wallsLeft: TOTAL_WALLS_PER_PLAYER,
        targetRow: PLAYER_2_TARGET_ROW,
      },
    },
    currentTurn: 1,
    walls: [],
    status: 'playing',
    winner: null,
    history: [],
    mode,
  };
}

/**
 * Checks whether an orthogonal step between adjacent coordinates is blocked by any placed wall.
 */
export function isStepBlockedByWall(from: Coordinate, to: Coordinate, walls: Wall[]): boolean {
  const dr = to.r - from.r;
  const dc = to.c - from.c;

  // Horizontal step
  if (dr === 0) {
    if (dc === 1) {
      // Moving Right from (r, c) to (r, c+1)
      const r = from.r;
      const c = from.c;
      return walls.some(
        (w) => w.orientation === 'V' && ((w.r === r && w.c === c) || (w.r === r - 1 && w.c === c))
      );
    }
    if (dc === -1) {
      // Moving Left from (r, c) to (r, c-1)
      const r = to.r;
      const c = to.c;
      return walls.some(
        (w) => w.orientation === 'V' && ((w.r === r && w.c === c) || (w.r === r - 1 && w.c === c))
      );
    }
  }

  // Vertical step
  if (dc === 0) {
    if (dr === 1) {
      // Moving Down from (r, c) to (r+1, c)
      const r = from.r;
      const c = from.c;
      return walls.some(
        (w) => w.orientation === 'H' && ((w.r === r && w.c === c) || (w.r === r && w.c === c - 1))
      );
    }
    if (dr === -1) {
      // Moving Up from (r, c) to (r-1, c)
      const r = to.r;
      const c = to.c;
      return walls.some(
        (w) => w.orientation === 'H' && ((w.r === r && w.c === c) || (w.r === r && w.c === c - 1))
      );
    }
  }

  return true; // Not an adjacent orthogonal step
}

/**
 * Checks if a candidate wall placement collides with existing walls or board boundaries.
 */
export function isWallCollision(
  walls: Wall[],
  candidate: { r: number; c: number; orientation: WallOrientation }
): boolean {
  // Intersection coordinates must be within 0..7
  if (candidate.r < 0 || candidate.r >= BOARD_SIZE - 1 || candidate.c < 0 || candidate.c >= BOARD_SIZE - 1) {
    return true;
  }

  // Cannot cross perpendicular wall at the exact same center
  if (
    walls.some(
      (w) =>
        w.r === candidate.r &&
        w.c === candidate.c &&
        w.orientation !== candidate.orientation
    )
  ) {
    return true;
  }

  if (candidate.orientation === 'H') {
    // Cannot overlap horizontally: (r, c), (r, c-1), (r, c+1)
    return walls.some(
      (w) =>
        w.orientation === 'H' &&
        w.r === candidate.r &&
        (w.c === candidate.c || w.c === candidate.c - 1 || w.c === candidate.c + 1)
    );
  } else {
    // Cannot overlap vertically: (r, c), (r-1, c), (r+1, c)
    return walls.some(
      (w) =>
        w.orientation === 'V' &&
        w.c === candidate.c &&
        (w.r === candidate.r || w.r === candidate.r - 1 || w.r === candidate.r + 1)
    );
  }
}
