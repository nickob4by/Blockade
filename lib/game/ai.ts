import { Coordinate, GameState, PlayerId, WallOrientation } from './types';
import { canPlaceWall } from './engine';
import { findShortestPath, getValidPawnMoves } from './pathfinding';

export type AIAction =
  | { type: 'move'; target: Coordinate }
  | { type: 'wall'; r: number; c: number; orientation: WallOrientation };

/**
 * Computes the best move for Player 2 (AI).
 * Balances moving along the shortest path to goal (row 8) with placing strategic walls
 * to impede Player 1 when Player 1 is closer to winning.
 */
export function computeAIMove(state: GameState): AIAction {
  const aiId: PlayerId = 2;
  const humanId: PlayerId = 1;
  const aiState = state.players[aiId];
  const humanState = state.players[humanId];

  const aiPath = findShortestPath(aiState.position, aiState.targetRow, state.walls);
  const humanPath = findShortestPath(humanState.position, humanState.targetRow, state.walls);

  const aiDist = aiPath ? aiPath.length - 1 : 99;
  const humanDist = humanPath ? humanPath.length - 1 : 99;

  const validMoves = getValidPawnMoves(aiState.position, humanState.position, state.walls);

  // If AI can win this turn, do it immediately!
  const winningMove = validMoves.find((m) => m.r === aiState.targetRow);
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
          if (r >= 0 && r < 8 && c >= 0 && c < 8) {
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
        const newHumanPath = findShortestPath(humanState.position, humanState.targetRow, simWalls);
        const newAiPath = findShortestPath(aiState.position, aiState.targetRow, simWalls);

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

  // Default: Choose the pawn move that minimizes AI distance to target row
  let bestPawnMove = validMoves[0];
  let minDistance = 999;

  for (const move of validMoves) {
    const pathFromMove = findShortestPath(move, aiState.targetRow, state.walls);
    const dist = pathFromMove ? pathFromMove.length - 1 : 999;
    if (dist < minDistance) {
      minDistance = dist;
      bestPawnMove = move;
    }
  }

  return { type: 'move', target: bestPawnMove };
}
