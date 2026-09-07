import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import { Coordinate, GameState, PlayerId, WallOrientation } from '../game/types';

export type RealtimePayload =
  | { type: 'PLAYER_JOIN'; playerId: PlayerId; playerName: string; playerEmoji?: string }
  | { type: 'PLAYER_JOIN_ACK'; playerId: PlayerId; playerName: string; playerEmoji?: string }
  | { type: 'REQUEST_SYNC'; requestedBy: PlayerId }
  | { type: 'SYNC_STATE'; state: GameState }
  | { type: 'MOVE_PAWN'; playerId: PlayerId; target: Coordinate }
  | { type: 'PLACE_WALL'; playerId: PlayerId; r: number; c: number; orientation: WallOrientation }
  | { type: 'RESTART_GAME'; requestedBy: PlayerId }
  | { type: 'CHAT_EMOTE'; playerId: PlayerId; emote: string }
  | { type: 'PLAYER_LEFT'; playerId: PlayerId; playerName?: string }
  | { type: 'REMATCH_REQUEST'; requestedBy: PlayerId; requesterName: string }
  | { type: 'REMATCH_RESPONSE'; respondedBy: PlayerId; accepted: boolean; responderName?: string }
  | { type: 'REMATCH_CANCEL'; requestedBy: PlayerId };

export interface PresenceInfo {
  playerId: PlayerId;
  playerName: string;
  onOpponentLeave?: (opponentId: PlayerId) => void;
}

export function subscribeToGameRoom(
  roomCode: string,
  onPayload: (payload: RealtimePayload) => void,
  onStatusChange?: (status: string) => void,
  presenceInfo?: PresenceInfo
): {
  channel: RealtimeChannel | null;
  broadcast: (payload: RealtimePayload) => Promise<boolean>;
  leave: () => void;
} {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      channel: null,
      broadcast: async () => false,
      leave: () => {},
    };
  }

  const cleanCode = roomCode.trim().toUpperCase();
  const channel = supabase.channel(`game:${cleanCode}`, {
    config: {
      broadcast: { self: false },
      presence: presenceInfo ? { key: String(presenceInfo.playerId) } : undefined,
    },
  });

  channel.on('broadcast', { event: 'game_event' }, ({ payload }) => {
    onPayload(payload as RealtimePayload);
  });

  if (presenceInfo) {
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      const oppKey = String(presenceInfo.playerId === 1 ? 2 : 1);
      const opponentId: PlayerId = presenceInfo.playerId === 1 ? 2 : 1;
      const isOpponent =
        key === oppKey ||
        (Array.isArray(leftPresences) &&
          leftPresences.some(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (p: any) => p?.playerId === opponentId || String(p?.playerId) === oppKey
          ));

      if (isOpponent && presenceInfo.onOpponentLeave) {
        presenceInfo.onOpponentLeave(opponentId);
      }
    });
  }

  channel.subscribe(async (status) => {
    if (onStatusChange) {
      onStatusChange(status);
    }
    if (status === 'SUBSCRIBED' && presenceInfo) {
      try {
        await channel.track({
          playerId: presenceInfo.playerId,
          playerName: presenceInfo.playerName,
          onlineAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Supabase presence track error:', err);
      }
    }
  });

  const broadcast = async (payload: RealtimePayload): Promise<boolean> => {
    try {
      const res = await channel.send({
        type: 'broadcast',
        event: 'game_event',
        payload,
      });
      return res === 'ok';
    } catch (err) {
      console.error('Realtime broadcast error:', err);
      return false;
    }
  };

  const leave = () => {
    try {
      if (presenceInfo) {
        channel.untrack().catch(() => {});
      }
      channel.unsubscribe();
      supabase.removeChannel(channel);
    } catch (err) {
      console.error('Error leaving channel:', err);
    }
  };

  return {
    channel,
    broadcast,
    leave,
  };
}
