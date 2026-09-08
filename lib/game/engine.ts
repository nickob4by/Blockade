import { Coordinate, GameState, PlayerId, Wall, WallOrientation } from './types';
import { isSameCoord, isWallCollision } from './board';
import { doesWallTrapAllPlayers, doesWallTrapAnyPlayer, getValidPawnMoves } from './pathfinding';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Returns the list of non-eliminated player IDs participating in this match.
 */
export function getActivePlayerIds(state: GameState): PlayerId[] {
  const allIds: PlayerId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  return allIds.filter((id) => {
    const p = state.players[id];
    return p && !p.isEliminated && p.id !== state.resignedPlayerId;
  });
}

/**
 * Returns the next player in clockwise turn order among active players.
 */
export function getNextTurnPlayerId(state: GameState): PlayerId {
  const active = getActivePlayerIds(state);
  if (active.length <= 1) return state.currentTurn;

  const currentIndex = active.indexOf(state.currentTurn);
  if (currentIndex === -1) return active[0];

  const nextIndex = (currentIndex + 1) % active.length;
  return active[nextIndex];
}

export function canPlaceWall(
  state: GameState,
  candidate: { r: number; c: number; orientation: WallOrientation }
): ValidationResult {
  if (state.status !== 'playing') {
    return { valid: false, reason: 'Game is not currently active.' };
  }

  const currentPlayer = state.players[state.currentTurn];
  if (!currentPlayer || currentPlayer.wallsLeft <= 0) {
    return { valid: false, reason: 'No walls remaining for this player.' };
  }

  const boardSize = state.boardSize || 9;

  // Check collision with existing walls or boundary
  if (isWallCollision(state.walls, candidate, boardSize)) {
    return { valid: false, reason: 'Wall collides with existing wall or board edge.' };
  }

  // Check if wall traps any player
  const candidateWall: Wall = {
    ...candidate,
    placedBy: state.currentTurn,
  };

  const activeIds = getActivePlayerIds(state);

  if (state.variant === 'sprint_race') {
    const playerGoals = activeIds.map((id) => {
      const p = state.players[id];
      return {
        pos: p.position,
        target: 0, // Target is row 0 for all sprint racers
      };
    });

    const traps = doesWallTrapAllPlayers(candidateWall, playerGoals, state.walls, boardSize);
    if (traps) {
      return { valid: false, reason: 'Wall would completely block a player from reaching the Finish Line!' };
    }
  } else if (state.variant === 'core_race' || activeIds.length > 2) {
    const playerGoals = activeIds.map((id) => {
      const p = state.players[id];
      const targets = p.targetCore || state.coreTargets || [{ r: Math.floor(boardSize / 2), c: Math.floor(boardSize / 2) }];
      return {
        pos: p.position,
        target: targets,
      };
    });

    const traps = doesWallTrapAllPlayers(candidateWall, playerGoals, state.walls, boardSize);
    if (traps) {
      return { valid: false, reason: 'Wall would completely block a player from reaching the Center Core!' };
    }
  } else {
    // Classic 1v1 path check
    const traps = doesWallTrapAnyPlayer(
      candidateWall,
      state.players[1].position,
      state.players[2].position,
      state.walls,
      state.players[1].targetRow ?? 0,
      state.players[2].targetRow ?? 8,
      boardSize
    );

    if (traps) {
      return { valid: false, reason: 'Wall would completely block a player from reaching the goal!' };
    }
  }

  return { valid: true };
}

export function applyPawnMove(
  state: GameState,
  target: Coordinate
): { success: boolean; nextState: GameState; error?: string } {
  if (state.status !== 'playing') {
    return { success: false, nextState: state, error: 'Game is not active.' };
  }

  const currentPId = state.currentTurn;
  const currentPlayer = state.players[currentPId];
  if (!currentPlayer) {
    return { success: false, nextState: state, error: 'Player not found.' };
  }

  const boardSize = state.boardSize || 9;

  // Collect positions of all other active opponents
  const opponentPositions = getActivePlayerIds(state)
    .filter((id) => id !== currentPId)
    .map((id) => state.players[id].position);

  const validMoves = getValidPawnMoves(currentPlayer.position, opponentPositions, state.walls, boardSize);
  const isValid = validMoves.some((m) => isSameCoord(m, target));

  if (!isValid) {
    return { success: false, nextState: state, error: 'Illegal pawn move.' };
  }

  const newPosition = { ...target };

  // Determine if this move triggers victory
  let hasWon = false;
  if (state.variant === 'core_race') {
    const coreTargets = currentPlayer.targetCore || state.coreTargets || [
      { r: Math.floor(boardSize / 2), c: Math.floor(boardSize / 2) },
    ];
    hasWon = coreTargets.some((t) => isSameCoord(t, newPosition));
  } else if (state.variant === 'sprint_race') {
    hasWon = newPosition.r === 0;
  } else {
    hasWon = newPosition.r === (currentPlayer.targetRow ?? 0);
  }

  const nextTurn = hasWon ? currentPId : getNextTurnPlayerId(state);

  const status = hasWon
    ? currentPId === 1
      ? 'player1_won'
      : currentPId === 2
      ? 'player2_won'
      : 'game_over'
    : 'playing';

  const nextState: GameState = {
    ...state,
    players: {
      ...state.players,
      [currentPId]: {
        ...currentPlayer,
        position: newPosition,
      },
    },
    currentTurn: nextTurn,
    status,
    winner: hasWon ? currentPId : null,
    history: [
      ...state.history,
      {
        player: currentPId,
        type: 'move',
        target: newPosition,
        timestamp: Date.now(),
      },
    ],
  };

  return { success: true, nextState };
}

export function applyWallPlacement(
  state: GameState,
  placement: { r: number; c: number; orientation: WallOrientation }
): { success: boolean; nextState: GameState; error?: string } {
  const check = canPlaceWall(state, placement);
  if (!check.valid) {
    return { success: false, nextState: state, error: check.reason };
  }

  const currentPId = state.currentTurn;
  const currentPlayer = state.players[currentPId];
  const nextTurn = getNextTurnPlayerId(state);

  const newWall: Wall = {
    ...placement,
    placedBy: currentPId,
  };

  const nextState: GameState = {
    ...state,
    players: {
      ...state.players,
      [currentPId]: {
        ...currentPlayer,
        wallsLeft: currentPlayer.wallsLeft - 1,
      },
    },
    walls: [...state.walls, newWall],
    currentTurn: nextTurn,
    history: [
      ...state.history,
      {
        player: currentPId,
        type: 'wall',
        target: { r: placement.r, c: placement.c },
        wallOrientation: placement.orientation,
        timestamp: Date.now(),
      },
    ],
  };

  return { success: true, nextState };
}
