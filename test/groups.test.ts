import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getUserGroups,
  getInitialStarterGroups,
  createGroup,
  joinGroupByCode,
  joinGroupByCodeAsync,
  leaveGroup,
} from '../lib/groups/groupService';
import {
  getRememberedAccounts,
  getLatestRememberedAccount,
  saveRememberedAccount,
  removeRememberedAccount,
  RememberedAccount,
} from '../lib/auth/utils';

// Mock localStorage in Node test environment
const storage: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, val: string) => {
    storage[key] = val;
  },
  removeItem: (key: string) => {
    delete storage[key];
  },
  clear: () => {
    Object.keys(storage).forEach((k) => delete storage[k]);
  },
  length: 0,
  key: () => null,
};
(global as any).window = {};

test('Friend Groups - No Default Groups on Start', () => {
  global.localStorage.clear();
  const groups = getUserGroups('user_test_1', 'Nicko');
  assert.equal(groups.length, 0, 'Should have no default mock groups on fresh start');

  const starters = getInitialStarterGroups('user_test_1', 'Nicko');
  assert.equal(starters.length, 0, 'Starter groups helper should return empty array');
});

test('Friend Groups - Create Group with Real Creator', () => {
  global.localStorage.clear();
  const created = createGroup('user_test_1', 'Nicko', 'Friday Quoridor Club', '👑');
  assert.equal(created.name, 'Friday Quoridor Club');
  assert.ok(created.code.startsWith('FRIDAY'));
  assert.equal(created.members.length, 1);
  assert.equal(created.members[0].role, 'leader');
  assert.equal(created.members[0].name, 'Nicko');
  assert.equal(created.members[0].emoji, '👑');
  assert.equal(created.members[0].isYou, true);
});

test('Friend Groups - Join Group Reflects Group Name and Only Real Members', () => {
  global.localStorage.clear();

  // User 1 creates group
  const created = createGroup('user_test_1', 'Nicko', 'Strategy Squad', '🦊');
  assert.equal(created.name, 'Strategy Squad');

  // User 2 joins group using the invite code
  const joinRes = joinGroupByCode('user_test_2', 'Sarah', created.code, '⚡');
  assert.ok(joinRes.success, 'Join should succeed');
  assert.ok(joinRes.group, 'Group should be returned');

  // Verify group name is reflected, NOT 'Squad: CODE'
  assert.equal(joinRes.group.name, 'Strategy Squad', 'Group name must be reflected, not code');
  assert.equal(joinRes.group.code, created.code);

  // Verify members: only real users (Nicko and Sarah), NO random dummy users
  assert.equal(joinRes.group.members.length, 2, 'Should only contain the 2 real users');
  const nicko = joinRes.group.members.find((m) => m.id === 'user_test_1');
  const sarah = joinRes.group.members.find((m) => m.id === 'user_test_2');

  assert.ok(nicko, 'Creator Nicko must be in members');
  assert.equal(nicko.name, 'Nicko');
  assert.equal(nicko.role, 'leader');
  assert.equal(nicko.emoji, '🦊');

  assert.ok(sarah, 'Joining user Sarah must be in members');
  assert.equal(sarah.name, 'Sarah');
  assert.equal(sarah.role, 'member');
  assert.equal(sarah.emoji, '⚡');
  assert.equal(sarah.isYou, true);

  // Non-existent code returns friendly error
  const invalidJoin = joinGroupByCode('user_test_2', 'Sarah', 'NONEXISTENT-99');
  assert.equal(invalidJoin.success, false);
  assert.ok(invalidJoin.error?.includes('No group found'));
});

test('Friend Groups - Leave Group', () => {
  global.localStorage.clear();
  const created = createGroup('user_test_1', 'Nicko', 'Temporary Circle');
  assert.equal(getUserGroups('user_test_1', 'Nicko').length, 1);

  const remaining = leaveGroup('user_test_1', 'Nicko', created.id);
  assert.equal(remaining.length, 0);
  assert.equal(getUserGroups('user_test_1', 'Nicko').length, 0);
});

test('Friend Groups - Member Persistence When Offline or Disconnected', () => {
  global.localStorage.clear();
  const created = createGroup('user_test_1', 'Nicko', 'Diamond Circle');
  
  // A second member is discovered via presence or join
  const { persistMemberIntoGroup } = require('../lib/groups/groupService');
  persistMemberIntoGroup(
    created.id,
    {
      id: 'user_test_2',
      name: 'Karyl',
      emoji: '👑',
      role: 'member',
      status: 'offline',
      lastActive: '5m ago',
    },
    'user_test_1',
    'Nicko'
  );

  const groups = getUserGroups('user_test_1', 'Nicko');
  const group = groups.find((g) => g.id === created.id);
  assert.ok(group);
  assert.equal(group.members.length, 2, 'Must retain all members even when offline');
  
  const karyl = group.members.find((m) => m.id === 'user_test_2');
  assert.ok(karyl, 'Karyl must remain in the group members list when offline');
  assert.equal(karyl.name, 'Karyl');
});

test('Friend Groups - Deduplicate Guest and Real Account by Username', () => {
  global.localStorage.clear();
  const created = createGroup('user_real_1', 'karyl', 'Alpha Team');

  const { persistMemberIntoGroup } = require('../lib/groups/groupService');
  // Simulate an old guest entry with same name
  persistMemberIntoGroup(
    created.id,
    {
      id: 'guest_old123',
      name: 'karyl',
      role: 'member',
      status: 'offline',
      lastActive: '1d ago',
    },
    'user_real_1',
    'karyl'
  );

  const groups = getUserGroups('user_real_1', 'karyl');
  const group = groups.find((g) => g.id === created.id);
  assert.ok(group);

  const karylMembers = group.members.filter((m) => m.name.toLowerCase() === 'karyl');
  assert.equal(karylMembers.length, 1, 'Should deduplicate member entries having the same username');
  assert.equal(karylMembers[0].id, 'user_real_1', 'Should retain the real user ID rather than guest ID');
});

test('Friend Groups - Safe Channel Registry Reference Counting', () => {
  const { subscribeToGroupPresence } = require('../lib/groups/groupService');
  const sub1 = subscribeToGroupPresence(
    'GRP-99',
    { id: 'user_1', name: 'User 1', status: 'online' },
    () => {}
  );
  const sub2 = subscribeToGroupPresence(
    'GRP-99',
    { id: 'user_1', name: 'User 1', status: 'online' },
    () => {}
  );

  assert.ok(sub1, 'First subscription must succeed');
  assert.ok(sub2, 'Second subscription must succeed and share connection');

  // Unsubscribing sub2 should not throw or break sub1
  assert.doesNotThrow(() => sub2.unsubscribe());
  assert.doesNotThrow(() => sub1.unsubscribe());
});

test('Friend Groups - Guests Cannot Create Groups', () => {
  global.localStorage.clear();

  // Starting with guest_
  assert.throws(
    () => createGroup('guest_12345', 'Guest Player', 'Secret Club'),
    /You must be signed in to create a group/,
    'Should throw error when guest_ attempts to create a group'
  );

  // guest_user
  assert.throws(
    () => createGroup('guest_user', 'Guest Player', 'Secret Club'),
    /You must be signed in to create a group/,
    'Should throw error when guest_user attempts to create a group'
  );

  // Empty userId
  assert.throws(
    () => createGroup('', 'Guest Player', 'Secret Club'),
    /You must be signed in to create a group/,
    'Should throw error when empty userId attempts to create a group'
  );
});

test('Friend Groups - Guests Cannot Join Groups', async () => {
  global.localStorage.clear();

  // Create group with real authenticated user first
  const group = createGroup('user_real_leader', 'Leader', 'Championship Clan');
  assert.ok(group.code);

  // Synchronous join attempt with guest ID
  const guestSyncRes = joinGroupByCode('guest_abc', 'Guesty', group.code);
  assert.equal(guestSyncRes.success, false);
  assert.equal(guestSyncRes.error, 'You must be signed in to join a group.');

  // Async join attempt with guest ID
  const guestAsyncRes = await joinGroupByCodeAsync('guest_abc', 'Guesty', group.code);
  assert.equal(guestAsyncRes.success, false);
  assert.equal(guestAsyncRes.error, 'You must be signed in to join a group.');

  // Verify group still only has the leader and no guests were added
  const currentGroups = getUserGroups('user_real_leader', 'Leader');
  const storedGroup = currentGroups.find((g) => g.id === group.id);
  assert.ok(storedGroup);
  assert.equal(storedGroup.members.length, 1);
  assert.equal(storedGroup.members[0].id, 'user_real_leader');
});

test('Active Lobby - Slot Allocation & Max Player Constraints', () => {
  type PlayerId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  interface PartyMember {
    id: string;
    name: string;
    slot: PlayerId;
    isReady: boolean;
    isHost: boolean;
  }

  const maxPlayers = 4;
  let members: PartyMember[] = [
    { id: 'host_1', name: 'Nicko', slot: 1, isReady: true, isHost: true },
  ];

  function addMember(id: string, name: string): boolean {
    if (members.length >= maxPlayers) return false;
    const taken = new Set(members.map((m) => m.slot));
    let assigned: PlayerId = 2;
    for (let s = 1; s <= maxPlayers; s++) {
      if (!taken.has(s as PlayerId)) {
        assigned = s as PlayerId;
        break;
      }
    }
    members.push({ id, name, slot: assigned, isReady: false, isHost: false });
    return true;
  }

  assert.equal(addMember('user_2', 'Alice'), true);
  assert.equal(members.length, 2);
  assert.equal(members[1].slot, 2);

  assert.equal(addMember('user_3', 'Bob'), true);
  assert.equal(members.length, 3);
  assert.equal(members[2].slot, 3);

  assert.equal(addMember('user_4', 'Charlie'), true);
  assert.equal(members.length, 4);
  assert.equal(members[3].slot, 4);

  // 5th member cannot join because lobby is full (max 4)
  assert.equal(addMember('user_5', 'Dave'), false);
  assert.equal(members.length, 4);

  // When member 2 leaves, slot 2 frees up
  members = members.filter((m) => m.id !== 'user_2');
  assert.equal(members.length, 3);

  // Next joiner receives the freed slot 2
  assert.equal(addMember('user_5', 'Dave'), true);
  assert.equal(members.find((m) => m.id === 'user_5')?.slot, 2);
});

test('Active Lobby - Ready State & Minimum Player Start Condition', () => {
  type PlayerId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  interface PartyMember {
    id: string;
    name: string;
    slot: PlayerId;
    isReady: boolean;
    isHost: boolean;
  }

  let members: PartyMember[] = [
    { id: 'host_1', name: 'Nicko', slot: 1, isReady: true, isHost: true },
    { id: 'user_2', name: 'Alice', slot: 2, isReady: false, isHost: false },
  ];

  const canStart = (m: PartyMember[]) => m.length >= 3 && m.every((p) => p.isReady);

  // 2 players: cannot start
  assert.equal(canStart(members), false, 'Cannot start with only 2 players');

  // Add 3rd player
  members.push({ id: 'user_3', name: 'Bob', slot: 3, isReady: false, isHost: false });
  assert.equal(canStart(members), false, 'Cannot start when players are not ready');

  // Alice readies up, Bob still unready
  members[1].isReady = true;
  assert.equal(canStart(members), false, 'Cannot start when Bob is not ready');

  // Bob readies up
  members[2].isReady = true;
  assert.equal(canStart(members), true, 'Can start when all 3 players are ready');
});

test('Remembered Accounts - Returns empty array when storage is empty', () => {
  localStorage.clear();
  assert.deepEqual(getRememberedAccounts(), []);
  assert.equal(getLatestRememberedAccount(), null);
});

test('Remembered Accounts - Saves and retrieves a single remembered account', () => {
  localStorage.clear();

  const account1: RememberedAccount = {
    username: 'Nicko',
    displayName: 'Nicko B',
    emoji: '👑',
    lastLoginAt: 1000,
  };

  saveRememberedAccount(account1);

  const stored = getRememberedAccounts();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].username, 'Nicko');
  assert.equal(stored[0].displayName, 'Nicko B');
  assert.equal(stored[0].emoji, '👑');

  assert.deepEqual(getLatestRememberedAccount(), account1);
});

test('Remembered Accounts - Updates existing account and moves to front without duplicating', () => {
  localStorage.clear();

  saveRememberedAccount({
    username: 'Nicko',
    displayName: 'Nicko B',
    emoji: '👑',
    lastLoginAt: 1000,
  });

  saveRememberedAccount({
    username: 'Alice',
    displayName: 'Alice Fox',
    emoji: '🦊',
    lastLoginAt: 2000,
  });

  // Re-login Nicko with updated display name and emoji
  saveRememberedAccount({
    username: 'nicko', // case-insensitive check
    displayName: 'Nicko Master',
    emoji: '⚡',
    lastLoginAt: 3000,
  });

  const stored = getRememberedAccounts();
  assert.equal(stored.length, 2, 'Must not duplicate account');
  assert.equal(stored[0].username, 'nicko');
  assert.equal(stored[0].displayName, 'Nicko Master');
  assert.equal(stored[0].emoji, '⚡');
  assert.equal(stored[1].username, 'Alice');

  assert.equal(getLatestRememberedAccount()?.username, 'nicko');
});

test('Remembered Accounts - Removes account and falls back to next recent account', () => {
  localStorage.clear();

  saveRememberedAccount({
    username: 'Player1',
    displayName: 'P1',
    lastLoginAt: 100,
  });
  saveRememberedAccount({
    username: 'Player2',
    displayName: 'P2',
    lastLoginAt: 200,
  });

  assert.equal(getLatestRememberedAccount()?.username, 'Player2');

  removeRememberedAccount('player2'); // case-insensitive removal

  const stored = getRememberedAccounts();
  assert.equal(stored.length, 1);
  assert.equal(stored[0].username, 'Player1');
  assert.equal(getLatestRememberedAccount()?.username, 'Player1');

  removeRememberedAccount('Player1');
  assert.deepEqual(getRememberedAccounts(), []);
  assert.equal(getLatestRememberedAccount(), null);
});
