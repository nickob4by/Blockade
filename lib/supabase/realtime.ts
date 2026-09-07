import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './client';
import { Coordinate, GameState, PlayerId, WallOrientation } from '../game/types';

export type RealtimePayload =
  | { type: 'PLAYER_JOIN'; playerId: PlayerId; playerName: string }
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
  broadcast: (payload: RealtimePayload) => void;
  leave: () => void;
} {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      channel: null,
      broadcast: () => {},
      leave: () => {},
    };
  }

  const channel = supabase.channel(`game:${roomCode}`, {
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

  const broadcast = (payload: RealtimePayload) => {
    channel.send({
      type: 'broadcast',
      event: 'game_event',
      payload,
    });
  };

  const leave = () => {
    channel.unsubscribe();
  };

  return {
    channel,
    broadcast,
    leave,
  };
}
