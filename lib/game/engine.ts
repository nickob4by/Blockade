import { Coordinate, GameState, PlayerId, Wall, WallOrientation } from './types';
import { isSameCoord } from './board';
import { doesWallTrapAnyPlayer, getValidPawnMoves } from './pathfinding';
import { isWallCollision } from './board';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export function canPlaceWall(
  state: GameState,
  candidate: { r: number; c: number; orientation: WallOrientation }
): ValidationResult {
  if (state.status !== 'playing') {
    return { valid: false, reason: 'Game is not currently active.' };
  }

  const currentPlayer = state.players[state.currentTurn];
  if (currentPlayer.wallsLeft <= 0) {
    return { valid: false, reason: 'No walls remaining for this player.' };
  }

  // Check collision with existing walls or boundary
  if (isWallCollision(state.walls, candidate)) {
    return { valid: false, reason: 'Wall collides with existing wall or board edge.' };
  }

  // Check if wall traps either player
  const candidateWall: Wall = {
    ...candidate,
    placedBy: state.currentTurn,
  };

  const traps = doesWallTrapAnyPlayer(
    candidateWall,
    state.players[1].position,
    state.players[2].position,
    state.walls,
    state.players[1].targetRow,
    state.players[2].targetRow
  );

  if (traps) {
    return { valid: false, reason: 'Wall would completely block a player from reaching the goal!' };
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
  const opponentPId: PlayerId = currentPId === 1 ? 2 : 1;
  const currentPlayer = state.players[currentPId];
  const opponent = state.players[opponentPId];

  const validMoves = getValidPawnMoves(currentPlayer.position, opponent.position, state.walls);
  const isValid = validMoves.some((m) => isSameCoord(m, target));

  if (!isValid) {
    return { success: false, nextState: state, error: 'Illegal pawn move.' };
  }

  const newPosition = { ...target };
  const hasWon = newPosition.r === currentPlayer.targetRow;

  const nextState: GameState = {
    ...state,
    players: {
      ...state.players,
      [currentPId]: {
        ...currentPlayer,
        position: newPosition,
      },
    },
    currentTurn: hasWon ? currentPId : opponentPId,
    status: hasWon ? (currentPId === 1 ? 'player1_won' : 'player2_won') : 'playing',
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
  const opponentPId: PlayerId = currentPId === 1 ? 2 : 1;
  const currentPlayer = state.players[currentPId];

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
    currentTurn: opponentPId,
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
