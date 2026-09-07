import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialGameState } from '../lib/game/board';
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
