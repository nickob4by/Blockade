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
} from '../lib/game/engine';
import { GameState, PlayerId } from '../lib/game/types';

test('Multiplayer Departure - 1 player leaving in 3-player match eliminates player and lets other 2 continue', () => {
  const players = [
    { id: 1 as PlayerId, name: 'Alice', emoji: '🐱' },
    { id: 2 as PlayerId, name: 'Bob', emoji: '🐶' },
    { id: 3 as PlayerId, name: 'Charlie', emoji: '🦊' },
  ];

  const state = createInitialSprintRaceState(players);
  assert.equal(getActivePlayerIds(state).length, 3);
  assert.equal(state.currentTurn, 1);
  assert.equal(state.status, 'playing');

  // Player 1 moves forward
  const p1Pos = state.players[1].position;
  const move1 = applyPawnMove(state, { r: p1Pos.r - 1, c: p1Pos.c });
  assert.equal(move1.success, true);
  const stateAfterP1 = move1.nextState;
  assert.equal(stateAfterP1.currentTurn, 2);

  // Bob (Player 2) leaves while it is his turn
  const departingPlayerId: PlayerId = 2;
  const updatedPlayers = {
    ...stateAfterP1.players,
    [departingPlayerId]: {
      ...stateAfterP1.players[departingPlayerId],
      isEliminated: true,
    },
  };

  // Verify turn advances clockwise to Charlie (Player 3), skipping eliminated Bob (Player 2)
  const nextTurn = getNextTurnPlayerId({
    ...stateAfterP1,
    players: updatedPlayers,
  });
  assert.equal(nextTurn, 3, 'Turn should skip eliminated Player 2 and advance to Player 3');

  const stateWithBobEliminated: GameState = {
    ...stateAfterP1,
    players: updatedPlayers,
    currentTurn: nextTurn,
  };

  // Active players should now be 2
  const activeIds = getActivePlayerIds(stateWithBobEliminated);
  assert.deepEqual(activeIds, [1, 3]);
  assert.equal(stateWithBobEliminated.status, 'playing');
  assert.equal(stateWithBobEliminated.winner, null);

  // Charlie (Player 3) can continue playing and make a move!
  const p3Pos = stateWithBobEliminated.players[3].position;
  const move3 = applyPawnMove(stateWithBobEliminated, { r: p3Pos.r - 1, c: p3Pos.c });
  assert.equal(move3.success, true);
  assert.equal(move3.nextState.currentTurn, 1, 'Turn should rotate back to Player 1');
});

test('Multiplayer Departure - 2 players leaving in 3-player match awards victory to sole survivor', () => {
  const players = [
    { id: 1 as PlayerId, name: 'Alice' },
    { id: 2 as PlayerId, name: 'Bob' },
    { id: 3 as PlayerId, name: 'Charlie' },
  ];

  let state = createInitialCoreRaceState(players);

  // First departure: Bob (P2) leaves
  const departedIds: PlayerId[] = [2];
  state = {
    ...state,
    players: {
      ...state.players,
      2: { ...state.players[2], isEliminated: true },
    },
    currentTurn: getNextTurnPlayerId({
      ...state,
      players: {
        ...state.players,
        2: { ...state.players[2], isEliminated: true },
      },
    }),
  };

  assert.equal(departedIds.length, 1);
  assert.equal(getActivePlayerIds(state).length, 2);
  assert.equal(state.status, 'playing');

  // Second departure: Charlie (P3) leaves
  departedIds.push(3);
  const remainingActive = getActivePlayerIds(state).filter((id) => id !== 3);
  assert.equal(remainingActive.length, 1);
  assert.equal(remainingActive[0], 1);

  // Sole survivor (Alice, P1) wins
  const finalState: GameState = {
    ...state,
    players: {
      ...state.players,
      3: { ...state.players[3], isEliminated: true },
    },
    status: 'player1_won',
    winner: 1,
  };

  assert.equal(finalState.status, 'player1_won');
  assert.equal(finalState.winner, 1);
});

test('Multiplayer Departure - 4-player game allows match to continue on 1st departure, ends match when 2 players left', () => {
  const players = [
    { id: 1 as PlayerId, name: 'P1' },
    { id: 2 as PlayerId, name: 'P2' },
    { id: 3 as PlayerId, name: 'P3' },
    { id: 4 as PlayerId, name: 'P4' },
  ];

  let state = createInitialSprintRaceState(players);
  assert.equal(getActivePlayerIds(state).length, 4);

  const departedPlayerIds: PlayerId[] = [];

  // P2 leaves: 1st departure
  departedPlayerIds.push(2);
  const activeAfterP2 = getActivePlayerIds(state).filter((id) => id !== 2);
  assert.equal(departedPlayerIds.length, 1);
  assert.equal(activeAfterP2.length, 3);

  // Under rule: 1 player left in 4-player match -> continue playing!
  const shouldContinueAfter1st = departedPlayerIds.length < 2 && activeAfterP2.length >= 2;
  assert.equal(shouldContinueAfter1st, true);

  state = {
    ...state,
    players: {
      ...state.players,
      2: { ...state.players[2], isEliminated: true },
    },
  };

  // Turn rotates across active players: 1 -> 3 -> 4 -> 1
  state.currentTurn = 1;
  assert.equal(getNextTurnPlayerId(state), 3);
  state.currentTurn = 3;
  assert.equal(getNextTurnPlayerId(state), 4);
  state.currentTurn = 4;
  assert.equal(getNextTurnPlayerId(state), 1);

  // P4 leaves: 2nd departure
  departedPlayerIds.push(4);
  const activeAfterP4 = getActivePlayerIds(state).filter((id) => id !== 4);
  assert.equal(departedPlayerIds.length, 2);
  assert.equal(activeAfterP4.length, 2);

  // Under rule: 2 players left the match -> room closes and match ends!
  const shouldContinueAfter2nd = departedPlayerIds.length < 2 && activeAfterP4.length >= 2;
  assert.equal(shouldContinueAfter2nd, false, 'Match must conclude once 2 players have left the match');
});
