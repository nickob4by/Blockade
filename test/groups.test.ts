import test from 'node:test';
import assert from 'node:assert/strict';
import {
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

test('Friend Groups - Starter Groups Initialization', () => {
  const groups = getInitialStarterGroups('user_test_1', 'Nicko');
  assert.equal(groups.length, 2);
  assert.equal(groups[0].name, '⚔️ Blockade Warriors');
  assert.equal(groups[1].name, '👑 Quoridor Champions');

  // Check member status types
  const warriors = groups[0];
  const onlineMembers = warriors.members.filter((m) => m.status === 'online');
  const inGameMembers = warriors.members.filter((m) => m.status === 'in_game');
  const offlineMembers = warriors.members.filter((m) => m.status === 'offline');

  assert.ok(onlineMembers.length > 0, 'Should have online members');
  assert.ok(inGameMembers.length > 0, 'Should have in-game members');
  assert.ok(offlineMembers.length > 0, 'Should have offline members');

  // Check current player presence
  const you = warriors.members.find((m) => m.isYou);
  assert.ok(you, 'Current user should be marked as you');
  assert.equal(you.name, 'Nicko');
});

test('Friend Groups - Create and Join Group', () => {
  const created = createGroup('user_test_1', 'Nicko', 'Rocket League Squad');
  assert.equal(created.name, 'Rocket League Squad');
  assert.ok(created.code.startsWith('ROCKET'));
  assert.equal(created.members.length, 1);
  assert.equal(created.members[0].role, 'leader');

  const joinRes = joinGroupByCode('user_test_1', 'Nicko', 'CUSTOM-88');
  assert.ok(joinRes.success);
  assert.equal(joinRes.group?.code, 'CUSTOM-88');
  assert.ok(joinRes.group?.members.some((m) => m.isYou));
});

test('Friend Groups - Leave Group', () => {
  const initial = getInitialStarterGroups('user_test_1', 'Nicko');
  const targetId = initial[0].id;
  const remaining = leaveGroup('user_test_1', 'Nicko', targetId);
  assert.ok(!remaining.some((g) => g.id === targetId));
});
