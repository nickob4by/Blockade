import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PartyLobbyMember,
  ActiveLobbyInfo,
} from '../lib/groups/partyLobbyService';
import { PlayerId } from '../lib/game/types';
import {
  createInitialSprintRaceState,
  createInitialCoreRaceState,
} from '../lib/game/board';

test('Party Lobby - Slot Assignment Stability and Non-Trapping', () => {
  const maxPlayers = 4;
  let members: PartyLobbyMember[] = [
    {
      id: 'host_1',
      name: 'Nicko',
      slot: 1,
      isReady: true,
      isHost: true,
    },
  ];

  const handleMemberJoin = (id: string, name: string, emoji?: string) => {
    const existingIndex = members.findIndex((m) => m.id === id);
    if (existingIndex !== -1) {
      members = members.map((m) => (m.id === id ? { ...m, name, emoji } : m));
      return true;
    }
    if (members.length >= maxPlayers) return false;

    const takenSlots = new Set(members.map((m) => m.slot));
    let assignedSlot: PlayerId = 2;
    for (let s = 1; s <= maxPlayers; s++) {
      if (!takenSlots.has(s as PlayerId)) {
        assignedSlot = s as PlayerId;
        break;
      }
    }

    members = [
      ...members,
      {
        id,
        name,
        emoji,
        slot: assignedSlot,
        isReady: false,
        isHost: false,
      },
    ];
    return true;
  };

  // Join player 2
  assert.equal(handleMemberJoin('user_p2', 'Alice', '🦊'), true);
  assert.equal(members.length, 2);
  assert.equal(members[1].slot, 2);
  assert.equal(members[1].isReady, false);

  // Re-joining same user updates info without slot duplication
  assert.equal(handleMemberJoin('user_p2', 'Alice Updated', '👑'), true);
  assert.equal(members.length, 2);
  assert.equal(members[1].name, 'Alice Updated');
  assert.equal(members[1].emoji, '👑');
  assert.equal(members[1].slot, 2);

  // Join player 3 and 4
  assert.equal(handleMemberJoin('user_p3', 'Charlie'), true);
  assert.equal(handleMemberJoin('user_p4', 'Dave'), true);
  assert.equal(members.length, 4);
  assert.equal(members[2].slot, 3);
  assert.equal(members[3].slot, 4);

  // Lobby is now full
  assert.equal(handleMemberJoin('user_p5', 'Eve'), false);
  assert.equal(members.length, 4);
});

test('Party Lobby - Ready State Preservation and Toggle', () => {
  let members: PartyLobbyMember[] = [
    { id: 'host_1', name: 'Nicko', slot: 1, isReady: true, isHost: true },
    { id: 'user_p2', name: 'Alice', slot: 2, isReady: false, isHost: false },
    { id: 'user_p3', name: 'Bob', slot: 3, isReady: false, isHost: false },
  ];

  const handleMemberReady = (id: string, isReady: boolean) => {
    members = members.map((m) => (m.id === id ? { ...m, isReady } : m));
  };

  // P2 readies up
  handleMemberReady('user_p2', true);
  assert.equal(members.find((m) => m.id === 'user_p2')?.isReady, true);
  assert.equal(members.find((m) => m.id === 'user_p3')?.isReady, false);

  // P3 readies up
  handleMemberReady('user_p3', true);
  assert.equal(members.find((m) => m.id === 'user_p3')?.isReady, true);

  // All 3 players are ready -> can start
  const canStart = members.length >= 3 && members.every((m) => m.isReady);
  assert.equal(canStart, true);

  // P2 unreadies
  handleMemberReady('user_p2', false);
  assert.equal(members.find((m) => m.id === 'user_p2')?.isReady, false);
  const canStartAfterUnready = members.length >= 3 && members.every((m) => m.isReady);
  assert.equal(canStartAfterUnready, false);
});

test('Party Lobby - Lobby Closed vs Match Started Distinction', () => {
  let activeLobby: ActiveLobbyInfo | null = {
    hostId: 'host_1',
    hostName: 'Nicko',
    variant: 'sprint_race',
    maxPlayers: 4,
    currentPlayers: 3,
    members: [],
    updatedAt: Date.now(),
  };

  let closedNoticeShown = false;

  const handleLobbyClosed = (payload: { hostId: string; reason?: string }) => {
    // If reason is match_started, do NOT treat as cancellation or show closed alert!
    if (payload.reason === 'match_started') {
      return;
    }
    activeLobby = null;
    closedNoticeShown = true;
  };

  // Match started broadcast arrives
  handleLobbyClosed({ hostId: 'host_1', reason: 'match_started' });
  assert.notEqual(activeLobby, null, 'Active lobby must not be wiped out by match_started');
  assert.equal(closedNoticeShown, false, 'No cancellation alert on match_started');

  // Actual cancellation arrives
  handleLobbyClosed({ hostId: 'host_1', reason: 'host_cancelled' });
  assert.equal(activeLobby, null, 'Active lobby must be cleared on host cancellation');
  assert.equal(closedNoticeShown, true, 'Cancellation alert shown');
});

test('Party Lobby - Stale Lobby Expiration Threshold', () => {
  const isLobbyStale = (lobby: ActiveLobbyInfo | null, now: number, thresholdMs = 12000) => {
    if (!lobby) return true;
    return now - lobby.updatedAt > thresholdMs;
  };

  const now = 100000;
  const freshLobby: ActiveLobbyInfo = {
    hostId: 'host_1',
    hostName: 'Host',
    variant: 'sprint_race',
    maxPlayers: 4,
    currentPlayers: 1,
    members: [],
    updatedAt: now - 3000, // 3s ago (normal heartbeat)
  };

  const slowNetworkLobby: ActiveLobbyInfo = {
    hostId: 'host_1',
    hostName: 'Host',
    variant: 'sprint_race',
    maxPlayers: 4,
    currentPlayers: 1,
    members: [],
    updatedAt: now - 8000, // 8s ago (brief network delay)
  };

  const deadLobby: ActiveLobbyInfo = {
    hostId: 'host_1',
    hostName: 'Host',
    variant: 'sprint_race',
    maxPlayers: 4,
    currentPlayers: 1,
    members: [],
    updatedAt: now - 15000, // 15s ago (host abandoned)
  };

  assert.equal(isLobbyStale(freshLobby, now), false, 'Fresh lobby is not stale');
  assert.equal(isLobbyStale(slowNetworkLobby, now), false, '8s delay is within 12s threshold (no flickering!)');
  assert.equal(isLobbyStale(deadLobby, now), true, '15s delay is considered stale');
});

test('Party Lobby - Custom Wall Count Overrides in Sprint Race and Core Race', () => {
  const players: Array<{ id: PlayerId; name: string }> = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
    { id: 4, name: 'Dave' },
  ];

  // Default walls (no custom override): 4 players get 6 walls in sprint race
  const defaultSprintState = createInitialSprintRaceState(players);
  assert.equal(defaultSprintState.players[1].wallsLeft, 6);
  assert.equal(defaultSprintState.players[2].wallsLeft, 6);
  assert.equal(defaultSprintState.players[3].wallsLeft, 6);
  assert.equal(defaultSprintState.players[4].wallsLeft, 6);

  // Custom walls: Blitz (4)
  const blitzSprintState = createInitialSprintRaceState(players, 'party', 4);
  assert.equal(blitzSprintState.players[1].wallsLeft, 4);
  assert.equal(blitzSprintState.players[4].wallsLeft, 4);

  // Custom walls: Plentiful (10)
  const plentifulSprintState = createInitialSprintRaceState(players, 'party', 10);
  assert.equal(plentifulSprintState.players[1].wallsLeft, 10);
  assert.equal(plentifulSprintState.players[3].wallsLeft, 10);

  // Custom walls: Mayhem (14)
  const mayhemSprintState = createInitialSprintRaceState(players, 'party', 14);
  assert.equal(mayhemSprintState.players[1].wallsLeft, 14);
  assert.equal(mayhemSprintState.players[2].wallsLeft, 14);

  // Core Race with custom walls
  const defaultCoreState = createInitialCoreRaceState(players);
  assert.equal(defaultCoreState.players[1].wallsLeft, 6);

  const customCoreState = createInitialCoreRaceState(players, 12);
  assert.equal(customCoreState.players[1].wallsLeft, 12);
  assert.equal(customCoreState.players[2].wallsLeft, 12);
  assert.equal(customCoreState.players[3].wallsLeft, 12);
  assert.equal(customCoreState.players[4].wallsLeft, 12);
});

test('Party Lobby - Stepper and Preset Clamping Logic', () => {
  const clampWalls = (val: number) => Math.max(3, Math.min(20, val));

  // Below min
  assert.equal(clampWalls(1), 3);
  assert.equal(clampWalls(2), 3);
  assert.equal(clampWalls(3), 3);

  // Normal range
  assert.equal(clampWalls(7), 7);
  assert.equal(clampWalls(15), 15);

  // Above max
  assert.equal(clampWalls(20), 20);
  assert.equal(clampWalls(25), 20);
  assert.equal(clampWalls(99), 20);
});

test('Party Lobby - Realtime Payload Carries customWalls', () => {
  const lobby: ActiveLobbyInfo = {
    hostId: 'host_1',
    hostName: 'Nicko',
    variant: 'sprint_race',
    maxPlayers: 4,
    currentPlayers: 2,
    members: [],
    updatedAt: Date.now(),
    customWalls: 12,
  };

  assert.equal(lobby.customWalls, 12);
});

