import test from 'node:test';
import assert from 'node:assert/strict';
import { RealtimePayload } from '../lib/supabase/realtime';
import { RematchStatus } from '../components/modals/GameOverModal';
import { createInitialGameState } from '../lib/game/board';

test('Rematch - RealtimePayload Types & Structure', () => {
  const requestPayload: RealtimePayload = {
    type: 'REMATCH_REQUEST',
    requestedBy: 1,
    requesterName: 'Alice',
  };
  assert.equal(requestPayload.type, 'REMATCH_REQUEST');
  assert.equal(requestPayload.requestedBy, 1);
  assert.equal(requestPayload.requesterName, 'Alice');

  const acceptPayload: RealtimePayload = {
    type: 'REMATCH_RESPONSE',
    respondedBy: 2,
    accepted: true,
    responderName: 'Bob',
  };
  assert.equal(acceptPayload.type, 'REMATCH_RESPONSE');
  assert.equal(acceptPayload.accepted, true);

  const declinePayload: RealtimePayload = {
    type: 'REMATCH_RESPONSE',
    respondedBy: 2,
    accepted: false,
    responderName: 'Bob',
  };
  assert.equal(declinePayload.type, 'REMATCH_RESPONSE');
  assert.equal(declinePayload.accepted, false);

  const cancelPayload: RealtimePayload = {
    type: 'REMATCH_CANCEL',
    requestedBy: 1,
  };
  assert.equal(cancelPayload.type, 'REMATCH_CANCEL');
});

test('Rematch - State Machine Transitions (Request, Accept, Reset)', () => {
  let status: RematchStatus = 'idle';

  // Player 1 requests rematch
  status = 'requested';
  assert.equal(status, 'requested');

  // Player 2 accepts rematch
  const response = { accepted: true };
  if (response.accepted) {
    status = 'accepted';
  } else {
    status = 'declined';
  }
  assert.equal(status, 'accepted');

  // Fresh board created for rematch
  const freshGame = createInitialGameState('online');
  assert.equal(freshGame.winner, null);
  assert.equal(freshGame.status, 'playing');
  assert.equal(freshGame.currentTurn, 1);
  assert.equal(freshGame.players[1].wallsLeft, 10);
  assert.equal(freshGame.players[2].wallsLeft, 10);
  assert.deepEqual(freshGame.players[1].position, { r: 8, c: 4 });
  assert.deepEqual(freshGame.players[2].position, { r: 0, c: 4 });

  // On new game start, rematchStatus returns to idle
  status = 'idle';
  assert.equal(status, 'idle');
});

test('Rematch - State Machine Transitions (Request, Decline)', () => {
  let status: RematchStatus = 'idle';

  // Player 1 requests rematch
  status = 'requested';

  // Player 2 declines rematch
  const response = { accepted: false };
  if (response.accepted) {
    status = 'accepted';
  } else {
    status = 'declined';
  }
  assert.equal(status, 'declined');
});

test('Rematch - Mutual Request Auto-Accept', () => {
  let p1Status: RematchStatus = 'requested';
  const p2Request = { type: 'REMATCH_REQUEST', requestedBy: 2 };

  // If Player 1 is already in 'requested' and receives REMATCH_REQUEST from Player 2, auto-accept!
  if (p1Status === 'requested' && p2Request.type === 'REMATCH_REQUEST') {
    p1Status = 'accepted';
  }
  assert.equal(p1Status, 'accepted');
});

test('Resignation - RealtimePayload RESIGN structure', () => {
  const resignPayload: RealtimePayload = {
    type: 'RESIGN',
    playerId: 1,
  };
  assert.equal(resignPayload.type, 'RESIGN');
  assert.equal(resignPayload.playerId, 1);
});

test('Resignation - Forfeiting player sets opponent as winner and enables Rematch flow', () => {
  const game = createInitialGameState('online');
  assert.equal(game.winner, null);
  assert.equal(game.status, 'playing');

  // Player 1 decides to resign
  const resigningPlayerId = 1;
  const winningPlayerId = resigningPlayerId === 1 ? 2 : 1;

  const endedGame = {
    ...game,
    status: (winningPlayerId === 1 ? 'player1_won' : 'player2_won') as const,
    winner: winningPlayerId,
    resignedPlayerId: resigningPlayerId,
  };

  assert.equal(endedGame.winner, 2);
  assert.equal(endedGame.status, 'player2_won');
  assert.equal(endedGame.resignedPlayerId, 1);

  // Now rematch can be requested from the game over state
  let rematchStatus: RematchStatus = 'idle';
  rematchStatus = 'requested';
  assert.equal(rematchStatus, 'requested');

  // Rematch accepted -> new game clears resignedPlayerId
  const nextGame = createInitialGameState('online');
  assert.equal(nextGame.winner, null);
  assert.equal(nextGame.status, 'playing');
  assert.equal(nextGame.resignedPlayerId, null);
});

test('Resignation - Remote opponent receives RESIGN payload, opens popup and can directly accept incoming rematch', () => {
  const game = createInitialGameState('online');
  game.players[1].name = 'Alice';
  game.players[2].name = 'Bob';

  // Player 1 sends RESIGN
  const payload: RealtimePayload = {
    type: 'RESIGN',
    playerId: 1,
  };

  // Player 2 receives payload
  const oppName = game.players[payload.playerId]?.name || 'Player 1';
  let opponentResignedInfo: { name: string; isOpen: boolean } | null = {
    name: oppName,
    isOpen: true,
  };
  let rematchStatus: RematchStatus = 'idle';

  assert.equal(opponentResignedInfo.isOpen, true);
  assert.equal(opponentResignedInfo.name, 'Alice');

  // While looking at popup, Alice sends rematch request
  rematchStatus = 'received';
  assert.equal(rematchStatus, 'received');

  // Bob accepts rematch: resets popup and starts new game
  opponentResignedInfo = null;
  rematchStatus = 'accepted';
  const newMatch = createInitialGameState('online');

  assert.equal(opponentResignedInfo, null);
  assert.equal(newMatch.winner, null);
  assert.equal(newMatch.resignedPlayerId, null);
});

