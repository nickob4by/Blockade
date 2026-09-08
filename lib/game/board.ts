import { Coordinate, GameMode, GameState, PlayerId, PlayerState, Wall, WallOrientation } from './types';

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
    color: PlayerState['color'];
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
  7: {
    color: 'lime',
    label: 'Player 7',
    bgClass: 'bg-lime-600 dark:bg-lime-500',
    borderClass: 'border-lime-400/60 dark:border-lime-300/40',
    textClass: 'text-lime-600 dark:text-lime-400',
    wallBg: 'bg-lime-600 dark:bg-lime-500',
    wallBorder: 'border-lime-400/60 dark:border-lime-300/40',
    ringColor: 'rgba(132, 204, 22, 0.6)',
  },
  8: {
    color: 'fuchsia',
    label: 'Player 8',
    bgClass: 'bg-fuchsia-600 dark:bg-fuchsia-500',
    borderClass: 'border-fuchsia-400/60 dark:border-fuchsia-300/40',
    textClass: 'text-fuchsia-600 dark:text-fuchsia-400',
    wallBg: 'bg-fuchsia-600 dark:bg-fuchsia-500',
    wallBorder: 'border-fuchsia-400/60 dark:border-fuchsia-300/40',
    ringColor: 'rgba(217, 70, 239, 0.6)',
  },
  9: {
    color: 'orange',
    label: 'Player 9',
    bgClass: 'bg-orange-600 dark:bg-orange-500',
    borderClass: 'border-orange-400/60 dark:border-orange-300/40',
    textClass: 'text-orange-600 dark:text-orange-400',
    wallBg: 'bg-orange-600 dark:bg-orange-500',
    wallBorder: 'border-orange-400/60 dark:border-orange-300/40',
    ringColor: 'rgba(249, 115, 22, 0.6)',
  },
  10: {
    color: 'indigo',
    label: 'Player 10',
    bgClass: 'bg-indigo-600 dark:bg-indigo-500',
    borderClass: 'border-indigo-400/60 dark:border-indigo-300/40',
    textClass: 'text-indigo-600 dark:text-indigo-400',
    wallBg: 'bg-indigo-600 dark:bg-indigo-500',
    wallBorder: 'border-indigo-400/60 dark:border-indigo-300/40',
    ringColor: 'rgba(99, 102, 241, 0.6)',
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
        7: { r: 12, c: 0 },
        8: { r: 0, c: 12 },
        9: { r: 6, c: 6 },
        10: { r: 0, c: 0 },
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
        7: { r: 3, c: 10 },
        8: { r: 11, c: 4 },
        9: { r: 0, c: 0 },
        10: { r: 14, c: 14 },
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
      7: { r: 7, c: 0 },
      8: { r: 7, c: 14 },
      9: { r: 0, c: 0 },
      10: { r: 14, c: 14 },
    },
  };
}

export interface SprintRaceConfig {
  boardSize: number;
  wallsPerPlayer: number;
  targetRow: number;
  spawns: Record<PlayerId, Coordinate>;
}

/**
 * Computes dynamic map dimensions, wall counts, and symmetric starting positions
 * for the Sprint Race mode where all players start on the bottom row and sprint to row 0.
 */
export function getSprintRaceConfig(playerCount: number): SprintRaceConfig {
  const count = Math.max(2, Math.min(10, playerCount));
  let boardSize = 9;
  let wallsPerPlayer = 10;

  if (count === 2) {
    boardSize = 9;
    wallsPerPlayer = 10;
  } else if (count <= 4) {
    boardSize = 11;
    wallsPerPlayer = 6;
  } else if (count <= 6) {
    boardSize = 15;
    wallsPerPlayer = 5;
  } else if (count <= 8) {
    boardSize = 17;
    wallsPerPlayer = 4;
  } else {
    boardSize = 21;
    wallsPerPlayer = 4;
  }

  const startRow = boardSize - 1;
  const spawns: Record<PlayerId, Coordinate> = {
    1: { r: startRow, c: 0 },
    2: { r: startRow, c: 0 },
    3: { r: startRow, c: 0 },
    4: { r: startRow, c: 0 },
    5: { r: startRow, c: 0 },
    6: { r: startRow, c: 0 },
    7: { r: startRow, c: 0 },
    8: { r: startRow, c: 0 },
    9: { r: startRow, c: 0 },
    10: { r: startRow, c: 0 },
  };

  if (count === 2) {
    // 9x9 Grid: spaced symmetrically
    spawns[1] = { r: startRow, c: 2 };
    spawns[2] = { r: startRow, c: 6 };
  } else if (count === 3) {
    // 11x11 Grid
    spawns[1] = { r: startRow, c: 2 };
    spawns[2] = { r: startRow, c: 5 };
    spawns[3] = { r: startRow, c: 8 };
  } else if (count === 4) {
    // 11x11 Grid
    spawns[1] = { r: startRow, c: 1 };
    spawns[2] = { r: startRow, c: 4 };
    spawns[3] = { r: startRow, c: 6 };
    spawns[4] = { r: startRow, c: 9 };
  } else if (count === 5) {
    // 15x15 Grid
    spawns[1] = { r: startRow, c: 1 };
    spawns[2] = { r: startRow, c: 4 };
    spawns[3] = { r: startRow, c: 7 };
    spawns[4] = { r: startRow, c: 10 };
    spawns[5] = { r: startRow, c: 13 };
  } else if (count === 6) {
    // 15x15 Grid
    spawns[1] = { r: startRow, c: 1 };
    spawns[2] = { r: startRow, c: 3 };
    spawns[3] = { r: startRow, c: 6 };
    spawns[4] = { r: startRow, c: 8 };
    spawns[5] = { r: startRow, c: 11 };
    spawns[6] = { r: startRow, c: 13 };
  } else if (count === 7) {
    // 17x17 Grid
    spawns[1] = { r: startRow, c: 1 };
    spawns[2] = { r: startRow, c: 3 };
    spawns[3] = { r: startRow, c: 6 };
    spawns[4] = { r: startRow, c: 8 };
    spawns[5] = { r: startRow, c: 10 };
    spawns[6] = { r: startRow, c: 13 };
    spawns[7] = { r: startRow, c: 15 };
  } else if (count === 8) {
    // 17x17 Grid
    spawns[1] = { r: startRow, c: 1 };
    spawns[2] = { r: startRow, c: 3 };
    spawns[3] = { r: startRow, c: 5 };
    spawns[4] = { r: startRow, c: 7 };
    spawns[5] = { r: startRow, c: 9 };
    spawns[6] = { r: startRow, c: 11 };
    spawns[7] = { r: startRow, c: 13 };
    spawns[8] = { r: startRow, c: 15 };
  } else if (count === 9) {
    // 21x21 Grid
    spawns[1] = { r: startRow, c: 2 };
    spawns[2] = { r: startRow, c: 4 };
    spawns[3] = { r: startRow, c: 6 };
    spawns[4] = { r: startRow, c: 8 };
    spawns[5] = { r: startRow, c: 10 };
    spawns[6] = { r: startRow, c: 12 };
    spawns[7] = { r: startRow, c: 14 };
    spawns[8] = { r: startRow, c: 16 };
    spawns[9] = { r: startRow, c: 18 };
  } else {
    // 10 players on 21x21 Grid: Alternating odd columns
    for (let i = 1; i <= 10; i++) {
      spawns[i as PlayerId] = { r: startRow, c: 2 * i - 1 };
    }
  }

  return {
    boardSize,
    wallsPerPlayer,
    targetRow: 0,
    spawns,
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
      7: { id: 7, name: 'Player 7', position: { r: 0, c: 8 }, wallsLeft: 0, targetRow: 8, isEliminated: true },
      8: { id: 8, name: 'Player 8', position: { r: 8, c: 0 }, wallsLeft: 0, targetRow: 0, isEliminated: true },
      9: { id: 9, name: 'Player 9', position: { r: 4, c: 4 }, wallsLeft: 0, targetRow: 8, isEliminated: true },
      10: { id: 10, name: 'Player 10', position: { r: 4, c: 4 }, wallsLeft: 0, targetRow: 0, isEliminated: true },
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
    7: { id: 7, name: 'Player 7', position: config.spawns[7], wallsLeft: config.wallsPerPlayer, targetCore: config.coreTargets, color: 'lime', isEliminated: true },
    8: { id: 8, name: 'Player 8', position: config.spawns[8], wallsLeft: config.wallsPerPlayer, targetCore: config.coreTargets, color: 'fuchsia', isEliminated: true },
    9: { id: 9, name: 'Player 9', position: config.spawns[9], wallsLeft: config.wallsPerPlayer, targetCore: config.coreTargets, color: 'orange', isEliminated: true },
    10: { id: 10, name: 'Player 10', position: config.spawns[10], wallsLeft: config.wallsPerPlayer, targetCore: config.coreTargets, color: 'indigo', isEliminated: true },
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

export function createInitialSprintRaceState(
  playerInfos: Array<{ id: PlayerId; name: string; emoji?: string }>,
  mode: GameMode = 'party'
): GameState {
  const count = Math.max(2, Math.min(10, playerInfos.length));
  const config = getSprintRaceConfig(count);

  const players: Record<PlayerId, any> = {
    1: { id: 1, name: 'Player 1', position: config.spawns[1], wallsLeft: config.wallsPerPlayer, targetRow: 0, color: 'blue', isEliminated: count < 1 },
    2: { id: 2, name: 'Player 2', position: config.spawns[2], wallsLeft: config.wallsPerPlayer, targetRow: 0, color: 'rose', isEliminated: count < 2 },
    3: { id: 3, name: 'Player 3', position: config.spawns[3], wallsLeft: config.wallsPerPlayer, targetRow: 0, color: 'emerald', isEliminated: count < 3 },
    4: { id: 4, name: 'Player 4', position: config.spawns[4], wallsLeft: config.wallsPerPlayer, targetRow: 0, color: 'amber', isEliminated: count < 4 },
    5: { id: 5, name: 'Player 5', position: config.spawns[5], wallsLeft: config.wallsPerPlayer, targetRow: 0, color: 'purple', isEliminated: count < 5 },
    6: { id: 6, name: 'Player 6', position: config.spawns[6], wallsLeft: config.wallsPerPlayer, targetRow: 0, color: 'cyan', isEliminated: count < 6 },
    7: { id: 7, name: 'Player 7', position: config.spawns[7], wallsLeft: config.wallsPerPlayer, targetRow: 0, color: 'lime', isEliminated: count < 7 },
    8: { id: 8, name: 'Player 8', position: config.spawns[8], wallsLeft: config.wallsPerPlayer, targetRow: 0, color: 'fuchsia', isEliminated: count < 8 },
    9: { id: 9, name: 'Player 9', position: config.spawns[9], wallsLeft: config.wallsPerPlayer, targetRow: 0, color: 'orange', isEliminated: count < 9 },
    10: { id: 10, name: 'Player 10', position: config.spawns[10], wallsLeft: config.wallsPerPlayer, targetRow: 0, color: 'indigo', isEliminated: count < 10 },
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
    mode,
    variant: 'sprint_race',
    boardSize: config.boardSize,
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
