import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getUserGroups,
  getInitialStarterGroups,
  createGroup,
  joinGroupByCode,
  leaveGroup,
} from '../lib/groups/groupService';

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


