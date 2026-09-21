import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialGameState, createInitialCoreRaceState } from '../lib/game/board';
import { computeAIMove } from '../lib/game/ai';
import { applyPawnMove, applyWallPlacement } from '../lib/game/engine';

test('AI computes valid opening move', () => {
  const state = createInitialGameState('ai');
  // Set turn to AI (Player 2)
  state.currentTurn = 2;

  const action = computeAIMove(state);
  assert.ok(action);

  if (action.type === 'move') {
    const res = applyPawnMove(state, action.target);
    assert.ok(res.success, `AI move failed: ${res.error}`);
    assert.equal(res.nextState.players[2].position.r, 1); // Should step forward towards row 8
  } else {
    const res = applyWallPlacement(state, action);
    assert.ok(res.success, `AI wall failed: ${res.error}`);
  }
});

test('AI Core Race - Computes move towards center core and seizes win', () => {
  const state = createInitialCoreRaceState([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'AI Bot' },
    { id: 3, name: 'Charlie' },
  ]);
  state.currentTurn = 2;
  // Test pawn pathfinding when moving along shortest path to core
  state.players[2].wallsLeft = 0;

  // Initial spawn of P2 on 9x9 (3 players) is West at (4, 0), core is (4, 4)
  const initialAction = computeAIMove(state);
  assert.equal(initialAction.type, 'move');
  if (initialAction.type === 'move') {
    // Should move closer to center core (step East from column 0 to column 1 at row 4)
    assert.equal(initialAction.target.r, 4);
    assert.equal(initialAction.target.c, 1);
  }

  // Adjacent to core test: place P2 at (3, 4) with walls available
  state.players[2].wallsLeft = 5;
  state.players[2].position = { r: 3, c: 4 };
  const winAction = computeAIMove(state);
  assert.equal(winAction.type, 'move');
  if (winAction.type === 'move') {
    assert.deepEqual(winAction.target, { r: 4, c: 4 }, 'AI must immediately seize win at core (4,4)');
  }
});

