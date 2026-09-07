import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import { Coordinate, GameState, PlayerId, WallOrientation } from '../game/types';

export type RealtimePayload =
  | { type: 'PLAYER_JOIN'; playerId: PlayerId; playerName: string }
  | { type: 'PLAYER_JOIN_ACK'; playerId: PlayerId; playerName: string }
  | { type: 'REQUEST_SYNC'; requestedBy: PlayerId }
  | { type: 'SYNC_STATE'; state: GameState }
  | { type: 'MOVE_PAWN'; playerId: PlayerId; target: Coordinate }
  | { type: 'PLACE_WALL'; playerId: PlayerId; r: number; c: number; orientation: WallOrientation }
  | { type: 'RESTART_GAME'; requestedBy: PlayerId }
  | { type: 'CHAT_EMOTE'; playerId: PlayerId; emote: string };

export function subscribeToGameRoom(
  roomCode: string,
  onPayload: (payload: RealtimePayload) => void,
  onStatusChange?: (status: string) => void
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
    },
  });

  channel
    .on('broadcast', { event: 'game_event' }, ({ payload }) => {
      onPayload(payload as RealtimePayload);
    })
    .subscribe((status) => {
      if (onStatusChange) {
        onStatusChange(status);
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
