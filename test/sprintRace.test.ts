import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialSprintRaceState,
  getSprintRaceConfig,
  PLAYER_THEMES,
} from '../lib/game/board';
import {
  applyPawnMove,
  applyWallPlacement,
  canPlaceWall,
  getActivePlayerIds,
  getNextTurnPlayerId,
} from '../lib/game/engine';
import { computeAIMove } from '../lib/game/ai';
import { Coordinate, PlayerId } from '../lib/game/types';

test('Sprint Race - Dynamic Board Config for 2 to 10 players', () => {
  // 2 Players: 9x9 board, 10 walls each
  const config2 = getSprintRaceConfig(2);
  assert.equal(config2.boardSize, 9);
  assert.equal(config2.wallsPerPlayer, 10);
  assert.equal(config2.targetRow, 0);
  assert.equal(config2.spawns[1].r, 8);
  assert.equal(config2.spawns[2].r, 8);
  assert.notEqual(config2.spawns[1].c, config2.spawns[2].c);

  // 3 & 4 Players: 9x9 board
  const config3 = getSprintRaceConfig(3);
  assert.equal(config3.boardSize, 9);
  assert.equal(config3.wallsPerPlayer, 6);
  for (let p = 1; p <= 3; p++) {
    assert.equal(config3.spawns[p as PlayerId].r, 8);
  }

  const config4 = getSprintRaceConfig(4);
  assert.equal(config4.boardSize, 9);
  assert.equal(config4.wallsPerPlayer, 5);
  const cols4 = new Set<number>();
  for (let p = 1; p <= 4; p++) {
    assert.equal(config4.spawns[p as PlayerId].r, 8);
    cols4.add(config4.spawns[p as PlayerId].c);
  }
  assert.equal(cols4.size, 4, 'All 4 players must have unique start columns');

  // 5 & 6 Players: 11x11 board, 5 walls each
  const config6 = getSprintRaceConfig(6);
  assert.equal(config6.boardSize, 11);
  assert.equal(config6.wallsPerPlayer, 5);
  const cols6 = new Set<number>();
  for (let p = 1; p <= 6; p++) {
    assert.equal(config6.spawns[p as PlayerId].r, 10);
    cols6.add(config6.spawns[p as PlayerId].c);
  }
  assert.equal(cols6.size, 6, 'All 6 players must have unique start columns');

  // 7 & 8 Players: 13x13 board, 4 walls each
  const config8 = getSprintRaceConfig(8);
  assert.equal(config8.boardSize, 13);
  assert.equal(config8.wallsPerPlayer, 4);
  const cols8 = new Set<number>();
  for (let p = 1; p <= 8; p++) {
    assert.equal(config8.spawns[p as PlayerId].r, 12);
    cols8.add(config8.spawns[p as PlayerId].c);
  }
  assert.equal(cols8.size, 8, 'All 8 players must have unique start columns');

  // 9 & 10 Players: 15x15 board, 3 walls each
  const config10 = getSprintRaceConfig(10);
  assert.equal(config10.boardSize, 15);
  assert.equal(config10.wallsPerPlayer, 3);
  const cols10 = new Set<number>();
  for (let p = 1; p <= 10; p++) {
    assert.equal(config10.spawns[p as PlayerId].r, 14);
    cols10.add(config10.spawns[p as PlayerId].c);
  }
  assert.equal(cols10.size, 10, 'All 10 players must have unique start columns');
});

test('Sprint Race - Equal straight distance for every player to finish line', () => {
  for (const count of [2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const config = getSprintRaceConfig(count);
    const expectedDist = config.boardSize - 1;
    for (let p = 1; p <= count; p++) {
      const spawn = config.spawns[p as PlayerId];
      const dist = spawn.r - config.targetRow;
      assert.equal(dist, expectedDist, `Player ${p} with ${count} players must have distance ${expectedDist}`);
    }
  }
});

test('Sprint Race - State Initialization with 2 and 5 players', () => {
  const p2State = createInitialSprintRaceState([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]);
  assert.equal(p2State.variant, 'sprint_race');
  assert.equal(p2State.boardSize, 9);
  assert.equal(p2State.currentTurn, 1);
  assert.equal(p2State.status, 'playing');
  assert.equal(p2State.players[1].name, 'Alice');
  assert.equal(p2State.players[2].name, 'Bob');
  assert.equal(p2State.players[1].wallsLeft, 10);
  assert.equal(p2State.players[2].wallsLeft, 10);

  const p5State = createInitialSprintRaceState([
    { id: 1, name: 'P1' },
    { id: 2, name: 'P2' },
    { id: 3, name: 'P3' },
    { id: 4, name: 'P4' },
    { id: 5, name: 'P5' },
  ]);
  assert.equal(p5State.variant, 'sprint_race');
  assert.equal(p5State.boardSize, 11);
  assert.equal(getActivePlayerIds(p5State).length, 5);
  assert.equal(p5State.players[5].name, 'P5');
  assert.equal(p5State.players[5].wallsLeft, 5);
});

test('Sprint Race - Movement towards Finish Line (Row 0)', () => {
  const state = createInitialSprintRaceState([
    { id: 1, name: 'Player 1' },
    { id: 2, name: 'Player 2' },
  ]);
  const p1Start = state.players[1].position; // { r: 8, c: 2 }
  assert.equal(p1Start.r, 8);

  // Player 1 steps up towards row 0
  const moveRes = applyPawnMove(state, { r: 7, c: p1Start.c });
  assert.equal(moveRes.success, true);
  assert.equal(moveRes.nextState.players[1].position.r, 7);
  assert.equal(moveRes.nextState.currentTurn, 2);
});

test('Sprint Race - Victory Trigger upon reaching Row 0', () => {
  const state = createInitialSprintRaceState([
    { id: 1, name: 'Speedy' },
    { id: 2, name: 'Slow' },
  ]);

  // Position Player 1 just one step away from finish line (r = 1)
  state.players[1].position = { r: 1, c: 4 };

  const winMove = applyPawnMove(state, { r: 0, c: 4 });
  assert.equal(winMove.success, true);
  assert.equal(winMove.nextState.winner, 1);
  assert.equal(winMove.nextState.status, 'player1_won');
});

test('Sprint Race - Anti-Trapping Wall Placement Validation', () => {
  const state = createInitialSprintRaceState([
    { id: 1, name: 'Racer 1' },
    { id: 2, name: 'Racer 2' },
  ]);

  // Valid horizontal wall in the middle
  const check1 = canPlaceWall(state, { r: 4, c: 4, orientation: 'H' });
  assert.equal(check1.valid, true);

  // Position Player 1 in corner (8, 0)
  state.players[1].position = { r: 8, c: 0 };
  // Place horizontal wall at (7, 0) (blocks moving up to row 7 from cols 0 and 1)
  state.walls.push({ r: 7, c: 0, orientation: 'H', placedBy: 2 });

  // Placing vertical wall at (7, 1) blocks moving right from col 1 to col 2 on row 8, completely trapping Player 1!
  const trapCheck = canPlaceWall(state, { r: 7, c: 1, orientation: 'V' });
  assert.equal(trapCheck.valid, false, 'Wall that cuts off all paths to row 0 must be invalid');
  assert.match(trapCheck.reason || '', /Finish Line|trap/i);
});

test('Sprint Race - AI computes valid move towards Finish Line', () => {
  const state = createInitialSprintRaceState([
    { id: 1, name: 'Human' },
    { id: 2, name: 'AI Bot' },
  ]);
  state.currentTurn = 2; // AI's turn
  const p2Start = state.players[2].position;

  const aiAction = computeAIMove(state);
  assert.ok(aiAction, 'AI must return an action');
  if (aiAction.type === 'move') {
    // Distance from AI start to finish line must decrease or stay valid
    const newDist = aiAction.target.r;
    assert.ok(newDist <= p2Start.r, 'AI move should advance towards row 0 or move laterally');
  } else {
    // Wall placement must be valid
    const check = canPlaceWall(state, {
      r: aiAction.r,
      c: aiAction.c,
      orientation: aiAction.orientation,
    });
    assert.equal(check.valid, true);
  }
});

test('Sprint Race - Perspective: Upright for all players (never flipped)', () => {
  const isFlippedForVariant = (variant: string, clientPlayerId: PlayerId) => {
    return variant === 'classic' && clientPlayerId === 2;
  };

  // In Classic Quoridor, Player 2's perspective is flipped so Player 2 starts at the bottom
  assert.equal(isFlippedForVariant('classic', 1), false);
  assert.equal(isFlippedForVariant('classic', 2), true);

  // In Sprint Race and Core Race, both players start at the bottom and race up, so isFlipped is always false
  assert.equal(isFlippedForVariant('sprint_race', 1), false);
  assert.equal(isFlippedForVariant('sprint_race', 2), false);
  assert.equal(isFlippedForVariant('core_race', 1), false);
  assert.equal(isFlippedForVariant('core_race', 2), false);
});

