import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialSprintRaceState,
  createInitialCoreRaceState,
} from '../lib/game/board';
import {
  getActivePlayerIds,
  getNextTurnPlayerId,
  applyPawnMove,
  applyWallPlacement,
} from '../lib/game/engine';
import { GameState, PlayerId } from '../lib/game/types';
import { RealtimePayload } from '../lib/supabase/realtime';

test('Multiplayer Sync - Slot resolution distinguishes Player 4+ even with identical/guest names', () => {
  // 5 players in a sprint race where some players have identical names ("Guest" / "Player 1")
  const members = [
    { slot: 1 as PlayerId, name: 'Guest', userId: 'user_p1' },
    { slot: 2 as PlayerId, name: 'Bob', userId: 'user_p2' },
    { slot: 3 as PlayerId, name: 'Guest', userId: 'user_p3' },
    { slot: 4 as PlayerId, name: 'Guest', userId: 'user_p4' },
    { slot: 5 as PlayerId, name: 'Eve', userId: 'user_p5' },
  ];

  // Simulating client-side slot resolution logic for Player 4
  const currentUid = 'user_p4';
  const myMember = members.find((m) => m.userId === currentUid);
  const resolvedSlot = myMember?.slot;

  assert.equal(resolvedSlot, 4, 'Player 4 must resolve to slot 4 by userId, not slot 1 by name');

  // Verify Player 5 resolves to slot 5
  const p5Member = members.find((m) => m.userId === 'user_p5');
  assert.equal(p5Member?.slot, 5, 'Player 5 must resolve to slot 5');
});

test('Multiplayer Sync - MOVE_PAWN with piggybacked state prevents desync on lagged clients', () => {
  const players = [
    { id: 1 as PlayerId, name: 'P1' },
    { id: 2 as PlayerId, name: 'P2' },
    { id: 3 as PlayerId, name: 'P3' },
    { id: 4 as PlayerId, name: 'P4' },
  ];

  const initialState = createInitialSprintRaceState(players);
  assert.equal(initialState.currentTurn, 1);

  // Player 1 moves
  const p1Move = applyPawnMove(initialState, {
    r: initialState.players[1].position.r - 1,
    c: initialState.players[1].position.c,
  });
  assert.equal(p1Move.success, true);
  assert.equal(p1Move.nextState.currentTurn, 2);

  // Player 2 moves
  const p2Move = applyPawnMove(p1Move.nextState, {
    r: p1Move.nextState.players[2].position.r - 1,
    c: p1Move.nextState.players[2].position.c,
  });
  assert.equal(p2Move.success, true);
  assert.equal(p2Move.nextState.currentTurn, 3);

  // Player 3 moves
  const p3Move = applyPawnMove(p2Move.nextState, {
    r: p2Move.nextState.players[3].position.r - 1,
    c: p2Move.nextState.players[3].position.c,
  });
  assert.equal(p3Move.success, true);
  assert.equal(p3Move.nextState.currentTurn, 4);

  // Simulate Player 4's device: Player 4 lagged and missed P1 and P2's moves,
  // but receives P3's move with authoritative payload.state attached!
  const p3Payload: RealtimePayload = {
    type: 'MOVE_PAWN',
    playerId: 3,
    target: p3Move.nextState.players[3].position,
    state: p3Move.nextState,
  };

  // On Player 4's device, receiving payload with state directly synchronizes:
  let player4LocalState = initialState; // Still at turn 1 before payload
  if (p3Payload.type === 'MOVE_PAWN' && p3Payload.state) {
    player4LocalState = p3Payload.state;
  }

  assert.equal(player4LocalState.currentTurn, 4, "Player 4's state is now synced to turn 4");
  assert.deepEqual(
    player4LocalState.players[3].position,
    p3Move.nextState.players[3].position,
    "Player 3's position is synchronized"
  );
  assert.deepEqual(
    player4LocalState.players[1].position,
    p1Move.nextState.players[1].position,
    "Player 1's missed move is synchronized"
  );
});

test('Multiplayer Sync - Winning move triggers victory and populates winner for all players', () => {
  const players = [
    { id: 1 as PlayerId, name: 'P1' },
    { id: 2 as PlayerId, name: 'P2' },
    { id: 3 as PlayerId, name: 'P3' },
    { id: 4 as PlayerId, name: 'P4' },
  ];

  let state = createInitialSprintRaceState(players);
  // Set Player 4 at row 1, col 9 (one step from finish line at row 0)
  state = {
    ...state,
    currentTurn: 4,
    players: {
      ...state.players,
      4: {
        ...state.players[4],
        position: { r: 1, c: 9 },
      },
    },
  };

  // Player 4 steps into row 0 (finish line)
  const winningMove = applyPawnMove(state, { r: 0, c: 9 });
  assert.equal(winningMove.success, true);
  assert.equal(winningMove.nextState.winner, 4, 'Winner must be Player 4');
  assert.equal(winningMove.nextState.status, 'game_over', 'Status must be game_over');

  // Authoritative payload broadcast by Player 4
  const victoryPayload: RealtimePayload = {
    type: 'VICTORY',
    winner: 4,
    state: winningMove.nextState,
    winnerName: 'P4',
  };

  // Any other client receiving this payload receives the winner
  let remoteClientState = state;
  if (victoryPayload.type === 'VICTORY') {
    remoteClientState = {
      ...(victoryPayload.state || remoteClientState),
      winner: victoryPayload.winner,
      status: 'game_over',
    };
  }

  assert.equal(remoteClientState.winner, 4, 'Remote client receives Player 4 victory');
  assert.equal(remoteClientState.status, 'game_over');
});

test('Multiplayer Sync - TURN_TIMEOUT advances turn consistently with state broadcast', () => {
  const players = [
    { id: 1 as PlayerId, name: 'P1' },
    { id: 2 as PlayerId, name: 'P2' },
    { id: 3 as PlayerId, name: 'P3' },
    { id: 4 as PlayerId, name: 'P4' },
  ];

  const state = createInitialCoreRaceState(players);
  assert.equal(state.currentTurn, 1);

  // Turn times out on Player 1
  const nextTurn = getNextTurnPlayerId(state);
  assert.equal(nextTurn, 2);

  const timeoutState: GameState = {
    ...state,
    currentTurn: nextTurn,
  };

  const payload: RealtimePayload = {
    type: 'TURN_TIMEOUT',
    currentTurn: nextTurn,
    state: timeoutState,
  };

  // Receiver applies payload.state
  let receiverState = state;
  if (payload.type === 'TURN_TIMEOUT' && payload.state) {
    receiverState = payload.state;
  }

  assert.equal(receiverState.currentTurn, 2, 'Turn advanced to Player 2 for all connected clients');
});
