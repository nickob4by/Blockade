import { Coordinate, GameState, PlayerId, Wall, WallOrientation } from './types';
import { canPlaceWall } from './engine';
import { findShortestPath, findShortestPathToTargets, getValidPawnMoves } from './pathfinding';
import { isSameCoord } from './board';

export type AIAction =
  | { type: 'move'; target: Coordinate }
  | { type: 'wall'; r: number; c: number; orientation: WallOrientation };

/**
 * Computes the best move for Player 2 (AI).
 * Balances moving along the shortest path to goal (row 8 or center core in King of the Core)
 * with placing strategic walls to impede opponents when they are closer to winning.
 */
export function computeAIMove(state: GameState): AIAction {
  const aiId: PlayerId = 2;
  const humanId: PlayerId = 1;
  const aiState = state.players[aiId];
  const humanState = state.players[humanId] || Object.values(state.players).find((p) => p.id !== aiId && !p.isEliminated) || state.players[1];

  const boardSize = state.boardSize || 9;
  const isCoreRace = state.variant === 'core_race';
  const defaultCore = { r: Math.floor(boardSize / 2), c: Math.floor(boardSize / 2) };
  const targetCores: Coordinate[] = aiState.targetCore || state.coreTargets || [defaultCore];

  const aiTargetRow = aiState.targetRow !== undefined ? aiState.targetRow : (state.variant === 'sprint_race' ? 0 : 8);
  const humanTargetRow = humanState.targetRow !== undefined ? humanState.targetRow : 0;

  const getPath = (pos: Coordinate, targetRow: number, walls: Wall[] = state.walls): Coordinate[] | null => {
    if (isCoreRace) {
      return findShortestPathToTargets(pos, targetCores, walls, boardSize);
    }
    return findShortestPath(pos, targetRow, walls, boardSize);
  };

  const isWinningCoord = (coord: Coordinate, targetRow: number): boolean => {
    if (isCoreRace) {
      return targetCores.some((t) => isSameCoord(coord, t));
    }
    return coord.r === targetRow;
  };

  const aiPath = getPath(aiState.position, aiTargetRow);
  const humanPath = getPath(humanState.position, humanTargetRow);

  const aiDist = aiPath ? aiPath.length - 1 : 99;
  const humanDist = humanPath ? humanPath.length - 1 : 99;

  // Gather other active pawns on the board
  const otherPawnPositions = Object.values(state.players)
    .filter((p) => p.id !== aiId && !p.isEliminated)
    .map((p) => p.position);

  const validMoves = getValidPawnMoves(aiState.position, otherPawnPositions, state.walls, boardSize);

  // If AI can win this turn, do it immediately!
  const winningMove = validMoves.find((m) => isWinningCoord(m, aiTargetRow));
  if (winningMove) {
    return { type: 'move', target: winningMove };
  }

  // Determine if AI should evaluate placing a wall:
  // Usually if opponent is leading or close to winning, and AI has walls remaining
  const shouldConsiderWall = aiState.wallsLeft > 0 && (humanDist <= aiDist || humanDist <= 4);

  if (shouldConsiderWall && humanPath && humanPath.length > 2) {
    let bestWall: { r: number; c: number; orientation: WallOrientation; score: number } | null = null;

    // Check candidate wall positions near the human player's planned path
    const candidateIntersections: { r: number; c: number }[] = [];

    // Focus candidates around human's next 3 steps
    for (let i = 0; i < Math.min(4, humanPath.length - 1); i++) {
      const step = humanPath[i];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = step.r + dr;
          const c = step.c + dc;
          if (r >= 0 && r < boardSize - 1 && c >= 0 && c < boardSize - 1) {
            if (!candidateIntersections.some((coord) => coord.r === r && coord.c === c)) {
              candidateIntersections.push({ r, c });
            }
          }
        }
      }
    }

    const orientations: WallOrientation[] = ['H', 'V'];

    for (const coord of candidateIntersections) {
      for (const orientation of orientations) {
        const candidate = { r: coord.r, c: coord.c, orientation };
        const check = canPlaceWall(state, candidate);
        if (!check.valid) continue;

        // Simulate wall placement
        const simWalls = [...state.walls, { ...candidate, placedBy: aiId }];
        const newHumanPath = getPath(humanState.position, humanTargetRow, simWalls);
        const newAiPath = getPath(aiState.position, aiTargetRow, simWalls);

        if (!newHumanPath || !newAiPath) continue;

        const newHumanDist = newHumanPath.length - 1;
        const newAiDist = newAiPath.length - 1;

        const humanPenalty = newHumanDist - humanDist;
        const aiPenalty = newAiDist - aiDist;

        // Score: want high penalty for human, low penalty for AI
        const score = humanPenalty * 2 - aiPenalty * 1.5;

        // Wall must delay the human significantly (by at least 2 steps) without heavily hurting AI
        if (humanPenalty >= 2 && score > 0) {
          if (!bestWall || score > bestWall.score) {
            bestWall = { ...candidate, score };
          }
        }
      }
    }

    if (bestWall && bestWall.score >= 2) {
      return {
        type: 'wall',
        r: bestWall.r,
        c: bestWall.c,
        orientation: bestWall.orientation,
      };
    }
  }

  // Default: Choose the pawn move that minimizes AI distance to target
  let bestPawnMove = validMoves[0];
  let minDistance = 999;

  for (const move of validMoves) {
    const pathFromMove = getPath(move, aiTargetRow, state.walls);
    const dist = pathFromMove ? pathFromMove.length - 1 : 999;
    if (dist < minDistance) {
      minDistance = dist;
      bestPawnMove = move;
    }
  }

  return { type: 'move', target: bestPawnMove };
}
