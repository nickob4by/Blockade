import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateChallengeRoomCode,
  sendChallenge,
  respondToChallenge,
  cancelChallenge,
  subscribeToUserChallenges,
  MatchChallenge,
} from '../lib/challenges/challengeService';

// Mock localStorage and window in Node test environment
const storage: Record<string, string> = {};
const listeners: ((e: any) => void)[] = [];

(global as any).localStorage = {
  getItem: (key: string) => storage[key] || null,
  setItem: (key: string, val: string) => {
    storage[key] = val;
    listeners.forEach((cb) => cb({ key, newValue: val }));
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

(global as any).window = {
  localStorage: (global as any).localStorage,
  addEventListener: (_type: string, cb: any) => {
    listeners.push(cb);
  },
  removeEventListener: (_type: string, cb: any) => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  },
};

test('Challenge Service - Room Code Generation', () => {
  const code1 = generateChallengeRoomCode();
  const code2 = generateChallengeRoomCode();
  assert.equal(code1.length, 6);
  assert.equal(code2.length, 6);
  assert.notEqual(code1, code2);
  assert.match(code1, /^[A-Z0-9]{6}$/);
});

test('Challenge Service - Send and Receive Challenge Invite via Cross-tab Storage', async () => {
  (global as any).localStorage.clear();

  let receivedPayload: any = null;
  const unsubscribe = subscribeToUserChallenges(
    { id: 'user_bob_123', name: 'Bob' },
    (payload) => {
      receivedPayload = payload;
    }
  );

  const challenge: MatchChallenge = {
    id: 'chal_test_1',
    challengerId: 'user_alice_456',
    challengerName: 'Alice',
    challengerEmoji: '?',
    targetUserId: 'user_bob_123',
    targetUserName: 'Bob',
    roomCode: 'TEST99',
    groupName: 'Quoridor Masters',
    createdAt: Date.now(),
  };

  await sendChallenge(challenge);

  assert.ok(receivedPayload, 'Bob should receive the challenge notification');
  assert.equal(receivedPayload.type, 'CHALLENGE_INVITE');
  assert.equal(receivedPayload.challenge.id, 'chal_test_1');
  assert.equal(receivedPayload.challenge.challengerName, 'Alice');
  assert.equal(receivedPayload.challenge.challengerEmoji, '?');
  assert.equal(receivedPayload.challenge.roomCode, 'TEST99');
  assert.equal(receivedPayload.challenge.groupName, 'Quoridor Masters');

  unsubscribe();
});

test('Challenge Service - Respond to Challenge (Accept & Decline)', async () => {
  (global as any).localStorage.clear();

  let responsePayload: any = null;
  const unsubscribe = subscribeToUserChallenges(
    { id: 'user_alice_456', name: 'Alice' },
    (payload) => {
      responsePayload = payload;
    }
  );

  const challenge: MatchChallenge = {
    id: 'chal_test_2',
    challengerId: 'user_alice_456',
    challengerName: 'Alice',
    targetUserId: 'user_bob_123',
    targetUserName: 'Bob',
    roomCode: 'ROOM42',
    createdAt: Date.now(),
  };

  // Test Decline
  await respondToChallenge(challenge, 'declined', 'user_bob_123', 'Bob', '???');
  assert.ok(responsePayload);
  assert.equal(responsePayload.type, 'CHALLENGE_RESPONSE');
  assert.equal(responsePayload.status, 'declined');
  assert.equal(responsePayload.responderName, 'Bob');

  // Test Accept
  responsePayload = null;
  await respondToChallenge(challenge, 'accepted', 'user_bob_123', 'Bob', '???');
  assert.ok(responsePayload);
  assert.equal(responsePayload.type, 'CHALLENGE_RESPONSE');
  assert.equal(responsePayload.status, 'accepted');
  assert.equal(responsePayload.roomCode, 'ROOM42');

  unsubscribe();
});

test('Challenge Service - Cancel Challenge', async () => {
  (global as any).localStorage.clear();

  let cancelPayload: any = null;
  const unsubscribe = subscribeToUserChallenges(
    { id: 'user_bob_123', name: 'Bob' },
    (payload) => {
      cancelPayload = payload;
    }
  );

  const challenge: MatchChallenge = {
    id: 'chal_test_3',
    challengerId: 'user_alice_456',
    challengerName: 'Alice',
    targetUserId: 'user_bob_123',
    targetUserName: 'Bob',
    roomCode: 'ROOM88',
    createdAt: Date.now(),
  };

  await cancelChallenge(challenge);
  assert.ok(cancelPayload);
  assert.equal(cancelPayload.type, 'CHALLENGE_CANCEL');
  assert.equal(cancelPayload.challengeId, 'chal_test_3');

  unsubscribe();
});
