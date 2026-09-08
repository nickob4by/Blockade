import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialCoreRaceState,
  getCoreRaceConfig,
  isSameCoord,
  PLAYER_THEMES,
} from '../lib/game/board';
import {
  applyPawnMove,
  applyWallPlacement,
  canPlaceWall,
  getNextTurnPlayerId,
} from '../lib/game/engine';
import {
  findShortestPathToTargets,
  getValidPawnMoves,
} from '../lib/game/pathfinding';
import { Coordinate, PlayerId, Wall } from '../lib/game/types';

test('Core Race - Dynamic Board Config for 3 Players (9x9, 8 walls, distance 4)', () => {
  const config = getCoreRaceConfig(3);
  assert.equal(config.boardSize, 9);
  assert.equal(config.wallsPerPlayer, 8);
  assert.equal(config.coreTargets.length, 1);
  assert.deepEqual(config.coreTargets[0], { r: 4, c: 4 });

  const core = config.coreTargets[0];
  const p1Dist = Math.abs(config.spawns[1].r - core.r) + Math.abs(config.spawns[1].c - core.c);
  const p2Dist = Math.abs(config.spawns[2].r - core.r) + Math.abs(config.spawns[2].c - core.c);
  const p3Dist = Math.abs(config.spawns[3].r - core.r) + Math.abs(config.spawns[3].c - core.c);

  assert.equal(p1Dist, 4, 'P1 distance to core must be 4');
  assert.equal(p2Dist, 4, 'P2 distance to core must be 4');
  assert.equal(p3Dist, 4, 'P3 distance to core must be 4');
});

test('Core Race - Dynamic Board Config for 4 and 6 Players (9x9 and 11x11, distance 4 and 5)', () => {
  const config4 = getCoreRaceConfig(4);
  assert.equal(config4.boardSize, 9);
  assert.equal(config4.wallsPerPlayer, 6);
  assert.deepEqual(config4.coreTargets[0], { r: 4, c: 4 });

  const core4 = config4.coreTargets[0];
  for (let p = 1; p <= 4; p++) {
    const spawn = config4.spawns[p as PlayerId];
    const dist = Math.abs(spawn.r - core4.r) + Math.abs(spawn.c - core4.c);
    assert.equal(dist, 4, `Player ${p} distance to core on 9x9 must be exactly 4`);
  }

  const config6 = getCoreRaceConfig(6);
  assert.equal(config6.boardSize, 11);
  assert.equal(config6.wallsPerPlayer, 6);
  const core6 = config6.coreTargets[0];
  for (let p = 1; p <= 6; p++) {
    const spawn = config6.spawns[p as PlayerId];
    const dist = Math.abs(spawn.r - core6.r) + Math.abs(spawn.c - core6.c);
    assert.equal(dist, 5, `Player ${p} distance to core in 6-player match must be exactly 5`);
  }
});

test('Core Race - State Initialization with 3 Players', () => {
  const state = createInitialCoreRaceState([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
  ]);

  assert.equal(state.variant, 'core_race');
  assert.equal(state.mode, 'party');
  assert.equal(state.boardSize, 9);
  assert.equal(state.players[1].name, 'Alice');
  assert.equal(state.players[2].name, 'Bob');
  assert.equal(state.players[3].name, 'Charlie');
  assert.equal(state.players[1].wallsLeft, 8);
  assert.equal(state.players[2].wallsLeft, 8);
  assert.equal(state.players[3].wallsLeft, 8);
  assert.equal(state.players[4].isEliminated, true);
  assert.equal(state.status, 'playing');
});

test('Core Race - Multi-Pawn Jumping Mechanics', () => {
  const boardSize = 13;
  const p1Pos: Coordinate = { r: 6, c: 5 };
  const p2Pos: Coordinate = { r: 6, c: 6 }; // P2 blocks P1 straight step East
  const p3Pos: Coordinate = { r: 6, c: 7 }; // P3 is behind P2!
  const walls: Wall[] = [];

  // With P3 standing behind P2, straight jump to (6, 7) is occupied.
  // P1 should be able to jump diagonally to (5, 6) and (7, 6) around P2!
  const validMoves = getValidPawnMoves(p1Pos, [p2Pos, p3Pos], walls, boardSize);

  assert.ok(validMoves.some((m) => m.r === 5 && m.c === 6), 'Can jump diagonal North around P2');
  assert.ok(validMoves.some((m) => m.r === 7 && m.c === 6), 'Can jump diagonal South around P2');
  assert.ok(!validMoves.some((m) => m.r === 6 && m.c === 7), 'Cannot land on occupied square P3');
});

test('Core Race - Clockwise Turn Rotation', () => {
  const state = createInitialCoreRaceState([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
  ]);

  assert.equal(state.currentTurn, 1);
  assert.equal(getNextTurnPlayerId(state), 2);

  const turn2State = { ...state, currentTurn: 2 as PlayerId };
  assert.equal(getNextTurnPlayerId(turn2State), 3);

  const turn3State = { ...state, currentTurn: 3 as PlayerId };
  assert.equal(getNextTurnPlayerId(turn3State), 1);
});

test('Core Race - Win Condition by Stepping into Center Core', () => {
  const state = createInitialCoreRaceState([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
  ]);

  // Position Player 1 adjacent to center core (4, 4)
  const preWinState = {
    ...state,
    players: {
      ...state.players,
      1: {
        ...state.players[1],
        position: { r: 5, c: 4 }, // 1 step South of core (4, 4)
      },
    },
    currentTurn: 1 as PlayerId,
  };

  const moveRes = applyPawnMove(preWinState, { r: 4, c: 4 });
  assert.equal(moveRes.success, true);
  assert.equal(moveRes.nextState.winner, 1);
  assert.ok(moveRes.nextState.status !== 'playing');
});

test('Core Race - BFS Center Core Pathfinding & Anti-Trapping', () => {
  const boardSize = 9;
  const coreTargets = [{ r: 4, c: 4 }];
  const walls: Wall[] = [];

  const path = findShortestPathToTargets({ r: 8, c: 4 }, coreTargets, walls, boardSize);
  assert.ok(path !== null);
  assert.equal(path.length, 5); // Start + 4 steps = 5 nodes

  // Construct state and verify that a wall placement operates on the board
  const state = createInitialCoreRaceState([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
  ]);

  const wallCheck = canPlaceWall(state, { r: 4, c: 4, orientation: 'H' });
  assert.equal(wallCheck.valid, true);
});
