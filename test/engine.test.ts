import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialGameState,
} from '../lib/game/board';
import {
  getValidPawnMoves,
  doesWallTrapAnyPlayer,
} from '../lib/game/pathfinding';
import {
  applyPawnMove,
  applyWallPlacement,
  canPlaceWall,
} from '../lib/game/engine';

test('Initial Game State', () => {
  const state = createInitialGameState('local');
  assert.equal(state.currentTurn, 1);
  assert.deepEqual(state.players[1].position, { r: 8, c: 4 });
  assert.deepEqual(state.players[2].position, { r: 0, c: 4 });
  assert.equal(state.players[1].wallsLeft, 10);
  assert.equal(state.players[2].wallsLeft, 10);
  assert.equal(state.walls.length, 0);
  assert.equal(state.status, 'playing');
});

test('Valid Pawn Moves - Initial Position', () => {
  const state = createInitialGameState('local');
  const validMoves = getValidPawnMoves(
    state.players[1].position,
    state.players[2].position,
    state.walls
  );

  // From (8, 4), can move Up (7, 4), Left (8, 3), Right (8, 5)
  assert.equal(validMoves.length, 3);
  assert.ok(validMoves.some((m) => m.r === 7 && m.c === 4));
  assert.ok(validMoves.some((m) => m.r === 8 && m.c === 3));
  assert.ok(validMoves.some((m) => m.r === 8 && m.c === 5));
});

test('Wall Placement and Movement Blocking', () => {
  let state = createInitialGameState('local');

  // Place horizontal wall at (7, 4): blocks (7, 4)-(8, 4) and (7, 5)-(8, 5)
  const wallRes = applyWallPlacement(state, { r: 7, c: 4, orientation: 'H' });
  assert.ok(wallRes.success);
  state = wallRes.nextState;

  assert.equal(state.walls.length, 1);
  assert.equal(state.players[1].wallsLeft, 9);
  assert.equal(state.currentTurn, 2);

  // Player 1 now at (8, 4) should NOT be able to move Up to (7, 4)
  const validP1Moves = getValidPawnMoves(
    state.players[1].position,
    state.players[2].position,
    state.walls
  );
  assert.ok(!validP1Moves.some((m) => m.r === 7 && m.c === 4));
  assert.ok(validP1Moves.some((m) => m.r === 8 && m.c === 3)); // Left still open
  assert.ok(validP1Moves.some((m) => m.r === 8 && m.c === 5)); // Right still open
});

test('Wall Overlap and Intersection Prevention', () => {
  const state = createInitialGameState('local');
  // Place initial wall at (3, 3) Horizontal
  const res = applyWallPlacement(state, { r: 3, c: 3, orientation: 'H' });
  const s2 = res.nextState;

  // Attempt to place Vertical wall at same center (3, 3) -> should fail
  const vCross = canPlaceWall(s2, { r: 3, c: 3, orientation: 'V' });
  assert.equal(vCross.valid, false);

  // Attempt to place overlapping Horizontal wall at (3, 2) -> should fail (overlaps right half)
  const hOverlapLeft = canPlaceWall(s2, { r: 3, c: 2, orientation: 'H' });
  assert.equal(hOverlapLeft.valid, false);

  // Attempt to place overlapping Horizontal wall at (3, 4) -> should fail (overlaps left half)
  const hOverlapRight = canPlaceWall(s2, { r: 3, c: 4, orientation: 'H' });
  assert.equal(hOverlapRight.valid, false);

  // Non-overlapping Horizontal wall at (3, 5) -> should succeed
  const hClear = canPlaceWall(s2, { r: 3, c: 5, orientation: 'H' });
  assert.equal(hClear.valid, true);
});

test('Pawn Jump Mechanics', () => {
  // Setup pawns face-to-face: P1 at (4, 4), P2 at (3, 4)
  const state = createInitialGameState('local');
  state.players[1].position = { r: 4, c: 4 };
  state.players[2].position = { r: 3, c: 4 };

  // Straight jump test: P1 jumps over P2 to (2, 4)
  const movesStraight = getValidPawnMoves(
    state.players[1].position,
    state.players[2].position,
    state.walls
  );
  assert.ok(movesStraight.some((m) => m.r === 2 && m.c === 4));

  // If a wall is placed behind P2 blocking (2, 4) - (3, 4):
  // Horizontal wall at (2, 4) blocks (2, 4)-(3, 4)
  state.walls.push({ r: 2, c: 4, orientation: 'H', placedBy: 2 });

  const movesDiagonal = getValidPawnMoves(
    state.players[1].position,
    state.players[2].position,
    state.walls
  );
  // Straight jump to (2, 4) is blocked, so diagonal jumps to (3, 3) and (3, 5) should be allowed!
  assert.ok(!movesDiagonal.some((m) => m.r === 2 && m.c === 4));
  assert.ok(movesDiagonal.some((m) => m.r === 3 && m.c === 3));
  assert.ok(movesDiagonal.some((m) => m.r === 3 && m.c === 5));
});

test('Path Trapping Prohibition (Quoridor rule)', () => {
  // Build a trap wall around P1
  const state = createInitialGameState('local');
  state.players[1].position = { r: 8, c: 0 }; // Corner

  // Place wall above: H at (7, 0)
  state.walls.push({ r: 7, c: 0, orientation: 'H', placedBy: 2 });
  // Place wall to the right: V at (7, 0) -> this seals off (8,0) completely!
  const trapWall = { r: 7, c: 0, orientation: 'V' };

  // Check if placing this wall traps P1
  const traps = doesWallTrapAnyPlayer(
    { ...trapWall, placedBy: 2 },
    state.players[1].position,
    state.players[2].position,
    state.walls,
    0,
    8
  );

  assert.equal(traps, true);
});

test('Win Condition Detection', () => {
  const state = createInitialGameState('local');
  // Move Player 2 away from (0, 4)
  state.players[2].position = { r: 5, c: 5 };
  state.players[1].position = { r: 1, c: 4 };

  const winMove = applyPawnMove(state, { r: 0, c: 4 });
  assert.ok(winMove.success);
  assert.equal(winMove.nextState.status, 'player1_won');
  assert.equal(winMove.nextState.winner, 1);
});
