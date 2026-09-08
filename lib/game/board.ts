import { Coordinate, GameMode, GameState, PlayerId, Wall, WallOrientation } from './types';

export const BOARD_SIZE = 9;
export const TOTAL_WALLS_PER_PLAYER = 10;

export const PLAYER_1_START: Coordinate = { r: 8, c: 4 };
export const PLAYER_2_START: Coordinate = { r: 0, c: 4 };
export const PLAYER_1_TARGET_ROW = 0;
export const PLAYER_2_TARGET_ROW = 8;

export function isWithinBoard(coord: Coordinate, boardSize: number = BOARD_SIZE): boolean {
  return coord.r >= 0 && coord.r < boardSize && coord.c >= 0 && coord.c < boardSize;
}

export const PLAYER_THEMES: Record<
  PlayerId,
  {
    color: 'blue' | 'rose' | 'emerald' | 'amber' | 'purple' | 'cyan';
    label: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
    wallBg: string;
    wallBorder: string;
    ringColor: string;
  }
> = {
  1: {
    color: 'blue',
    label: 'Player 1',
    bgClass: 'bg-blue-600 dark:bg-blue-500',
    borderClass: 'border-blue-400/60 dark:border-blue-300/40',
    textClass: 'text-blue-600 dark:text-blue-400',
    wallBg: 'bg-blue-600 dark:bg-blue-500',
    wallBorder: 'border-blue-400/60 dark:border-blue-300/40',
    ringColor: 'rgba(59, 130, 246, 0.6)',
  },
  2: {
    color: 'rose',
    label: 'Player 2',
    bgClass: 'bg-rose-600 dark:bg-rose-500',
    borderClass: 'border-rose-400/60 dark:border-rose-300/40',
    textClass: 'text-rose-600 dark:text-rose-400',
    wallBg: 'bg-rose-600 dark:bg-rose-500',
    wallBorder: 'border-rose-400/60 dark:border-rose-300/40',
    ringColor: 'rgba(244, 63, 94, 0.6)',
  },
  3: {
    color: 'emerald',
    label: 'Player 3',
    bgClass: 'bg-emerald-600 dark:bg-emerald-500',
    borderClass: 'border-emerald-400/60 dark:border-emerald-300/40',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    wallBg: 'bg-emerald-600 dark:bg-emerald-500',
    wallBorder: 'border-emerald-400/60 dark:border-emerald-300/40',
    ringColor: 'rgba(16, 185, 129, 0.6)',
  },
  4: {
    color: 'amber',
    label: 'Player 4',
    bgClass: 'bg-amber-600 dark:bg-amber-500',
    borderClass: 'border-amber-400/60 dark:border-amber-300/40',
    textClass: 'text-amber-600 dark:text-amber-400',
    wallBg: 'bg-amber-600 dark:bg-amber-500',
    wallBorder: 'border-amber-400/60 dark:border-amber-300/40',
    ringColor: 'rgba(245, 158, 11, 0.6)',
  },
  5: {
    color: 'purple',
    label: 'Player 5',
    bgClass: 'bg-purple-600 dark:bg-purple-500',
    borderClass: 'border-purple-400/60 dark:border-purple-300/40',
    textClass: 'text-purple-600 dark:text-purple-400',
    wallBg: 'bg-purple-600 dark:bg-purple-500',
    wallBorder: 'border-purple-400/60 dark:border-purple-300/40',
    ringColor: 'rgba(168, 85, 247, 0.6)',
  },
  6: {
    color: 'cyan',
    label: 'Player 6',
    bgClass: 'bg-cyan-600 dark:bg-cyan-500',
    borderClass: 'border-cyan-400/60 dark:border-cyan-300/40',
    textClass: 'text-cyan-600 dark:text-cyan-400',
    wallBg: 'bg-cyan-600 dark:bg-cyan-500',
    wallBorder: 'border-cyan-400/60 dark:border-cyan-300/40',
    ringColor: 'rgba(6, 182, 212, 0.6)',
  },
};

export interface CoreRaceConfig {
  boardSize: number;
  wallsPerPlayer: number;
  coreTargets: Coordinate[];
  spawns: Record<PlayerId, Coordinate>;
}

export function getCoreRaceConfig(playerCount: number): CoreRaceConfig {
  if (playerCount <= 3) {
    const boardSize = 13;
    const center = 6;
    return {
      boardSize,
      wallsPerPlayer: 6,
      coreTargets: [{ r: center, c: center }],
      spawns: {
        1: { r: 12, c: 6 }, // South (dist 6)
        2: { r: 6, c: 0 },  // West (dist 6)
        3: { r: 6, c: 12 }, // East (dist 6)
        4: { r: 0, c: 6 },  // Fallback
        5: { r: 0, c: 0 },
        6: { r: 12, c: 12 },
      },
    };
  }

  // 4, 5, or 6 players: 15x15 board, center is (7, 7)
  const boardSize = 15;
  const center = 7;
  const coreTargets = [{ r: center, c: center }];

  if (playerCount === 4) {
    return {
      boardSize,
      wallsPerPlayer: 7,
      coreTargets,
      spawns: {
        1: { r: 14, c: 7 }, // South (dist 7)
        2: { r: 0, c: 7 },  // North (dist 7)
        3: { r: 7, c: 0 },  // West (dist 7)
        4: { r: 7, c: 14 }, // East (dist 7)
        5: { r: 3, c: 4 },
        6: { r: 11, c: 10 },
      },
    };
  }

  // 5 or 6 players: 6 equidistant spawns on distance-7 perimeter
  return {
    boardSize,
    wallsPerPlayer: 6,
    coreTargets,
    spawns: {
      1: { r: 14, c: 7 },  // South (dist 7)
      2: { r: 0, c: 7 },   // North (dist 7)
      3: { r: 3, c: 4 },   // North-West (dist 7)
      4: { r: 3, c: 10 },  // North-East (dist 7)
      5: { r: 11, c: 4 },  // South-West (dist 7)
      6: { r: 11, c: 10 }, // South-East (dist 7)
    },
  };
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
        color: 'blue',
      },
      2: {
        id: 2,
        name: mode === 'ai' ? 'BlockBot (AI)' : 'Player 2',
        position: { ...PLAYER_2_START },
        wallsLeft: TOTAL_WALLS_PER_PLAYER,
        targetRow: PLAYER_2_TARGET_ROW,
        color: 'rose',
      },
      3: { id: 3, name: 'Player 3', position: { r: 4, c: 0 }, wallsLeft: 0, targetRow: 8, isEliminated: true },
      4: { id: 4, name: 'Player 4', position: { r: 4, c: 8 }, wallsLeft: 0, targetRow: 0, isEliminated: true },
      5: { id: 5, name: 'Player 5', position: { r: 0, c: 0 }, wallsLeft: 0, targetRow: 8, isEliminated: true },
      6: { id: 6, name: 'Player 6', position: { r: 8, c: 8 }, wallsLeft: 0, targetRow: 0, isEliminated: true },
    },
    currentTurn: 1,
    walls: [],
    status: 'playing',
    winner: null,
    history: [],
    mode,
    variant: 'classic',
    boardSize: BOARD_SIZE,
    resignedPlayerId: null,
  };
}

export function createInitialCoreRaceState(
  playerInfos: Array<{ id: PlayerId; name: string; emoji?: string }>
): GameState {
  const count = Math.max(3, Math.min(6, playerInfos.length));
  const config = getCoreRaceConfig(count);

  const players: Record<PlayerId, any> = {
    1: { id: 1, name: 'Player 1', position: config.spawns[1], wallsLeft: config.wallsPerPlayer, targetCore: config.coreTargets, color: 'blue', isEliminated: count < 1 },
    2: { id: 2, name: 'Player 2', position: config.spawns[2], wallsLeft: config.wallsPerPlayer, targetCore: config.coreTargets, color: 'rose', isEliminated: count < 2 },
    3: { id: 3, name: 'Player 3', position: config.spawns[3], wallsLeft: config.wallsPerPlayer, targetCore: config.coreTargets, color: 'emerald', isEliminated: count < 3 },
    4: { id: 4, name: 'Player 4', position: config.spawns[4], wallsLeft: config.wallsPerPlayer, targetCore: config.coreTargets, color: 'amber', isEliminated: count < 4 },
    5: { id: 5, name: 'Player 5', position: config.spawns[5], wallsLeft: config.wallsPerPlayer, targetCore: config.coreTargets, color: 'purple', isEliminated: count < 5 },
    6: { id: 6, name: 'Player 6', position: config.spawns[6], wallsLeft: config.wallsPerPlayer, targetCore: config.coreTargets, color: 'cyan', isEliminated: count < 6 },
  };

  playerInfos.forEach((info) => {
    if (players[info.id]) {
      players[info.id].name = info.name;
      players[info.id].emoji = info.emoji;
      players[info.id].isEliminated = false;
    }
  });

  return {
    players,
    currentTurn: playerInfos[0]?.id || 1,
    walls: [],
    status: 'playing',
    winner: null,
    history: [],
    mode: 'party',
    variant: 'core_race',
    boardSize: config.boardSize,
    coreTargets: config.coreTargets,
    turnTimeLimit: 15,
    resignedPlayerId: null,
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
  candidate: { r: number; c: number; orientation: WallOrientation },
  boardSize: number = BOARD_SIZE
): boolean {
  // Intersection coordinates must be within 0..(boardSize - 2)
  if (candidate.r < 0 || candidate.r >= boardSize - 1 || candidate.c < 0 || candidate.c >= boardSize - 1) {
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
