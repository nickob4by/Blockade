import { getSupabaseClient } from '@/lib/supabase/client';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { GameVariant } from '@/lib/game/types';

/**
 * Sends a transient broadcast message on a temporary channel and cleanly
 * unsubscribes and removes the channel from the Supabase client immediately.
 */
async function sendTransientBroadcast(
  supabase: SupabaseClient,
  channelName: string,
  event: string,
  payload: ChallengeActionPayload
): Promise<boolean> {
  const channel = supabase.channel(channelName, {
    config: { broadcast: { self: false } },
  });

  try {
    await channel.subscribe();
    const res = await channel.send({
      type: 'broadcast',
      event,
      payload,
    });
    return res === 'ok';
  } catch (err) {
    console.error(`Failed to send broadcast on ${channelName}:`, err);
    return false;
  } finally {
    try {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    } catch {
      // Safe cleanup fallback
    }
  }
}

export interface MatchChallenge {
  id: string;
  challengerId: string;
  challengerName: string;
  challengerEmoji?: string;
  targetUserId: string;
  targetUserName: string;
  roomCode: string;
  groupCode?: string;
  groupName?: string;
  createdAt: number;
  variant?: GameVariant;
}

export type ChallengeActionPayload =
  | { type: 'CHALLENGE_INVITE'; challenge: MatchChallenge }
  | {
      type: 'CHALLENGE_RESPONSE';
      challengeId: string;
      status: 'accepted' | 'declined';
      responderId: string;
      responderName: string;
      responderEmoji?: string;
      roomCode: string;
    }
  | { type: 'CHALLENGE_CANCEL'; challengeId: string };

const STORAGE_INVITE_KEY = 'blockade_challenge_invite';
const STORAGE_RESPONSE_KEY = 'blockade_challenge_response';
const STORAGE_CANCEL_KEY = 'blockade_challenge_cancel';

export function generateChallengeRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Sends a challenge invitation to a target user.
 */
export async function sendChallenge(challenge: MatchChallenge): Promise<boolean> {
  // Cross-tab local fallback
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(
        STORAGE_INVITE_KEY,
        JSON.stringify({ ...challenge, _ts: Date.now() })
      );
    } catch {
      // Ignore
    }
  }

  const supabase = getSupabaseClient();
  if (!supabase) return true;

  try {
    const payload: ChallengeActionPayload = {
      type: 'CHALLENGE_INVITE',
      challenge,
    };

    const broadcasts: Promise<boolean>[] = [
      sendTransientBroadcast(
        supabase,
        `challenges:user_${challenge.targetUserId}`,
        'challenge_event',
        payload
      ),
      sendTransientBroadcast(
        supabase,
        `challenges:name_${challenge.targetUserName.toLowerCase().trim()}`,
        'challenge_event',
        payload
      ),
    ];

    if (challenge.groupCode) {
      broadcasts.push(
        sendTransientBroadcast(
          supabase,
          `group_presence:${challenge.groupCode.toLowerCase()}`,
          'challenge_event',
          payload
        )
      );
    }

    await Promise.allSettled(broadcasts);
    return true;
  } catch (err) {
    console.error('Failed to send challenge broadcast:', err);
    return false;
  }
}

/**
 * Responds to an incoming challenge (accept or decline).
 */
export async function respondToChallenge(
  challenge: MatchChallenge,
  status: 'accepted' | 'declined',
  responderId: string,
  responderName: string,
  responderEmoji?: string
): Promise<boolean> {
  const payload: ChallengeActionPayload = {
    type: 'CHALLENGE_RESPONSE',
    challengeId: challenge.id,
    status,
    responderId,
    responderName,
    responderEmoji,
    roomCode: challenge.roomCode,
  };

  // Cross-tab local fallback
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(
        STORAGE_RESPONSE_KEY,
        JSON.stringify({ ...payload, _ts: Date.now() })
      );
    } catch {
      // Ignore
    }
  }

  const supabase = getSupabaseClient();
  if (!supabase) return true;

  try {
    const broadcasts: Promise<boolean>[] = [
      sendTransientBroadcast(
        supabase,
        `challenges:user_${challenge.challengerId}`,
        'challenge_event',
        payload
      ),
      sendTransientBroadcast(
        supabase,
        `challenges:name_${challenge.challengerName.toLowerCase().trim()}`,
        'challenge_event',
        payload
      ),
    ];

    if (challenge.groupCode) {
      broadcasts.push(
        sendTransientBroadcast(
          supabase,
          `group_presence:${challenge.groupCode.toLowerCase()}`,
          'challenge_event',
          payload
        )
      );
    }

    await Promise.allSettled(broadcasts);
    return true;
  } catch (err) {
    console.error('Failed to send challenge response:', err);
    return false;
  }
}

/**
 * Cancels an outgoing challenge.
 */
export async function cancelChallenge(
  challenge: MatchChallenge
): Promise<boolean> {
  const payload: ChallengeActionPayload = {
    type: 'CHALLENGE_CANCEL',
    challengeId: challenge.id,
  };

  // Cross-tab local fallback
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(
        STORAGE_CANCEL_KEY,
        JSON.stringify({ ...payload, _ts: Date.now() })
      );
    } catch {
      // Ignore
    }
  }

  const supabase = getSupabaseClient();
  if (!supabase) return true;

  try {
    const broadcasts: Promise<boolean>[] = [
      sendTransientBroadcast(
        supabase,
        `challenges:user_${challenge.targetUserId}`,
        'challenge_event',
        payload
      ),
      sendTransientBroadcast(
        supabase,
        `challenges:name_${challenge.targetUserName.toLowerCase().trim()}`,
        'challenge_event',
        payload
      ),
    ];

    if (challenge.groupCode) {
      broadcasts.push(
        sendTransientBroadcast(
          supabase,
          `group_presence:${challenge.groupCode.toLowerCase()}`,
          'challenge_event',
          payload
        )
      );
    }

    await Promise.allSettled(broadcasts);
    return true;
  } catch {
    return false;
  }
}

/**
 * Subscribes the current user to incoming challenges and responses across the app.
 */
export function subscribeToUserChallenges(
  user: { id: string; name: string },
  onAction: (payload: ChallengeActionPayload) => void
): () => void {
  const cleanId = (user.id || 'guest_user').trim();
  const cleanName = (user.name || 'Player 1').toLowerCase().trim();

  // 1. Cross-tab storage event listener
  const handleStorage = (e: StorageEvent) => {
    if (!e.newValue) return;
    try {
      if (e.key === STORAGE_INVITE_KEY) {
        const parsed = JSON.parse(e.newValue);
        if (
          parsed.targetUserId === cleanId ||
          parsed.targetUserName?.toLowerCase().trim() === cleanName
        ) {
          onAction({ type: 'CHALLENGE_INVITE', challenge: parsed });
        }
      } else if (e.key === STORAGE_RESPONSE_KEY) {
        const parsed = JSON.parse(e.newValue);
        onAction(parsed as ChallengeActionPayload);
      } else if (e.key === STORAGE_CANCEL_KEY) {
        const parsed = JSON.parse(e.newValue);
        onAction(parsed as ChallengeActionPayload);
      }
    } catch {
      // Ignore
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorage);
  }

  // 2. Supabase Realtime Channels
  const supabase = getSupabaseClient();
  let ch1: RealtimeChannel | null = null;
  let ch2: RealtimeChannel | null = null;

  if (supabase) {
    ch1 = supabase.channel(`challenges:user_${cleanId}`, {
      config: { broadcast: { self: false } },
    });

    ch1.on('broadcast', { event: 'challenge_event' }, ({ payload }) => {
      onAction(payload as ChallengeActionPayload);
    });

    ch1.subscribe();

    ch2 = supabase.channel(`challenges:name_${cleanName}`, {
      config: { broadcast: { self: false } },
    });

    ch2.on('broadcast', { event: 'challenge_event' }, ({ payload }) => {
      onAction(payload as ChallengeActionPayload);
    });

    ch2.subscribe();
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorage);
    }
    if (supabase) {
      if (ch1) {
        try {
          ch1.unsubscribe();
          supabase.removeChannel(ch1);
        } catch {}
      }
      if (ch2) {
        try {
          ch2.unsubscribe();
          supabase.removeChannel(ch2);
        } catch {}
      }
    }
  };
}
