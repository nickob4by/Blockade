import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { GameVariant, PlayerId } from '@/lib/game/types';

export interface PartyLobbyMember {
  id: string;
  name: string;
  emoji?: string;
  slot: PlayerId;
  isReady: boolean;
  isHost: boolean;
}

export interface ActiveLobbyInfo {
  hostId: string;
  hostName: string;
  hostEmoji?: string;
  variant: GameVariant;
  maxPlayers: number;
  currentPlayers: number;
  members: PartyLobbyMember[];
  updatedAt: number;
}

export interface PartyLobbyListeners {
  onLobbySync?: (lobby: ActiveLobbyInfo) => void;
  onLobbyAnnounce?: (lobby: ActiveLobbyInfo) => void;
  onMemberJoin?: (payload: { id: string; name: string; emoji?: string }) => void;
  onMemberReady?: (payload: { id: string; isReady: boolean }) => void;
  onMemberLeave?: (payload: { id: string }) => void;
  onRequestLobbyInfo?: () => void;
  onLobbyStart?: (payload: {
    members: PartyLobbyMember[];
    boardSize: number;
    variant: GameVariant;
    roomCode: string;
  }) => void;
  onLobbyClosed?: (payload: { hostId: string; reason?: string }) => void;
  onPresenceUpdate?: (activeLobby: ActiveLobbyInfo | null) => void;
}

export interface PartyLobbySubscription {
  channel: RealtimeChannel | null;
  broadcastLobbyState: (
    members: PartyLobbyMember[],
    maxPlayers: number,
    variant: GameVariant,
    host: { id: string; name: string; emoji?: string }
  ) => Promise<void>;
  sendMemberJoin: (member: { id: string; name: string; emoji?: string }) => Promise<void>;
  sendMemberReady: (id: string, isReady: boolean) => Promise<void>;
  sendMemberLeave: (id: string) => Promise<void>;
  sendLobbyStart: (payload: {
    members: PartyLobbyMember[];
    boardSize: number;
    variant: GameVariant;
    roomCode: string;
  }) => Promise<void>;
  sendLobbyClosed: (hostId: string, reason?: string) => Promise<void>;
  requestLobbyInfo: () => Promise<void>;
  unsubscribe: () => void;
}

interface LobbyChannelEntry {
  channel: RealtimeChannel;
  listeners: Map<string, PartyLobbyListeners>;
  currentLobby: ActiveLobbyInfo | null;
}

// Reference-counted channel registry for party lobbies
const lobbyChannelRegistry = new Map<string, LobbyChannelEntry>();

/**
 * Subscribes to a group's party lobby realtime channel.
 * Uses reference counting so GroupsModal and PartyLobbyModal in the same tab
 * share the same channel without killing each other or creating conflicting presence.
 */
export function subscribeToPartyLobby(
  groupCode: string,
  userId: string,
  listeners: PartyLobbyListeners
): PartyLobbySubscription {
  if (!groupCode || typeof groupCode !== 'string' || !userId) {
    return {
      channel: null,
      broadcastLobbyState: async () => {},
      sendMemberJoin: async () => {},
      sendMemberReady: async () => {},
      sendMemberLeave: async () => {},
      sendLobbyStart: async () => {},
      sendLobbyClosed: async () => {},
      requestLobbyInfo: async () => {},
      unsubscribe: () => {},
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      channel: null,
      broadcastLobbyState: async () => {},
      sendMemberJoin: async () => {},
      sendMemberReady: async () => {},
      sendMemberLeave: async () => {},
      sendLobbyStart: async () => {},
      sendLobbyClosed: async () => {},
      requestLobbyInfo: async () => {},
      unsubscribe: () => {},
    };
  }

  const topicKey = groupCode.trim().toLowerCase();
  const channelName = `party_lobby:${topicKey}`;
  const listenerId = Math.random().toString(36).substring(2, 9);

  let entry = lobbyChannelRegistry.get(topicKey);

  if (!entry) {
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: `user_${userId}` },
      },
    });

    entry = {
      channel,
      listeners: new Map(),
      currentLobby: null,
    };
    lobbyChannelRegistry.set(topicKey, entry);

    // Setup channel event handlers
    channel
      .on('broadcast', { event: 'lobby_sync' }, ({ payload }) => {
        const cur = lobbyChannelRegistry.get(topicKey);
        if (!cur || !payload) return;
        const variant = payload.variant || 'sprint_race';
        const defaultMax = variant === 'core_race' ? 6 : 10;
        const lobby: ActiveLobbyInfo = {
          hostId: payload.hostId,
          hostName: payload.hostName || 'Host',
          hostEmoji: payload.hostEmoji,
          variant,
          maxPlayers: payload.maxPlayers || defaultMax,
          currentPlayers: payload.members ? payload.members.length : payload.currentPlayers || 1,
          members: Array.isArray(payload.members) ? payload.members : [],
          updatedAt: Date.now(),
        };
        cur.currentLobby = lobby;
        cur.listeners.forEach((l) => {
          try {
            l.onLobbySync?.(lobby);
          } catch {}
        });
      })
      .on('broadcast', { event: 'lobby_announce' }, ({ payload }) => {
        const cur = lobbyChannelRegistry.get(topicKey);
        if (!cur || !payload) return;
        const variant = payload.variant || 'sprint_race';
        const defaultMax = variant === 'core_race' ? 6 : 10;
        const lobby: ActiveLobbyInfo = {
          hostId: payload.hostId,
          hostName: payload.hostName || 'Host',
          hostEmoji: payload.hostEmoji,
          variant,
          maxPlayers: payload.maxPlayers || defaultMax,
          currentPlayers: payload.members ? payload.members.length : payload.currentPlayers || 1,
          members: Array.isArray(payload.members) ? payload.members : [],
          updatedAt: Date.now(),
        };
        cur.currentLobby = lobby;
        cur.listeners.forEach((l) => {
          try {
            l.onLobbyAnnounce?.(lobby);
          } catch {}
        });
      })
      .on('broadcast', { event: 'member_join' }, ({ payload }) => {
        const cur = lobbyChannelRegistry.get(topicKey);
        if (!cur || !payload) return;
        cur.listeners.forEach((l) => {
          try {
            l.onMemberJoin?.(payload);
          } catch {}
        });
      })
      .on('broadcast', { event: 'member_ready' }, ({ payload }) => {
        const cur = lobbyChannelRegistry.get(topicKey);
        if (!cur || !payload) return;
        cur.listeners.forEach((l) => {
          try {
            l.onMemberReady?.(payload);
          } catch {}
        });
      })
      .on('broadcast', { event: 'member_leave' }, ({ payload }) => {
        const cur = lobbyChannelRegistry.get(topicKey);
        if (!cur || !payload) return;
        cur.listeners.forEach((l) => {
          try {
            l.onMemberLeave?.(payload);
          } catch {}
        });
      })
      .on('broadcast', { event: 'request_lobby_info' }, () => {
        const cur = lobbyChannelRegistry.get(topicKey);
        if (!cur) return;
        cur.listeners.forEach((l) => {
          try {
            l.onRequestLobbyInfo?.();
          } catch {}
        });
      })
      .on('broadcast', { event: 'lobby_start' }, ({ payload }) => {
        const cur = lobbyChannelRegistry.get(topicKey);
        if (!cur || !payload) return;
        cur.listeners.forEach((l) => {
          try {
            l.onLobbyStart?.(payload);
          } catch {}
        });
      })
      .on('broadcast', { event: 'lobby_closed' }, ({ payload }) => {
        const cur = lobbyChannelRegistry.get(topicKey);
        if (!cur) return;
        if (payload?.reason !== 'match_started') {
          cur.currentLobby = null;
        }
        cur.listeners.forEach((l) => {
          try {
            l.onLobbyClosed?.(payload || { hostId: '' });
          } catch {}
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // On subscribe, request lobby state in case a host is active
          try {
            channel.send({
              type: 'broadcast',
              event: 'request_lobby_info',
              payload: {},
            });
          } catch {}
        }
      });
  }

  // Register this listener
  entry.listeners.set(listenerId, listeners);

  // If we already have a cached active lobby, immediately notify listener
  if (entry.currentLobby) {
    try {
      listeners.onLobbyAnnounce?.(entry.currentLobby);
    } catch {}
  }

  const broadcastLobbyState = async (
    members: PartyLobbyMember[],
    maxPlayers: number,
    variant: GameVariant,
    host: { id: string; name: string; emoji?: string }
  ) => {
    const cur = lobbyChannelRegistry.get(topicKey);
    if (!cur) return;

    const payload: ActiveLobbyInfo = {
      members,
      maxPlayers,
      variant,
      hostId: host.id,
      hostName: host.name,
      hostEmoji: host.emoji,
      currentPlayers: members.length,
      updatedAt: Date.now(),
    };

    cur.currentLobby = payload;

    // Immediately notify all local listeners in this tab (e.g. GroupsModal in the same tab)
    cur.listeners.forEach((l) => {
      try {
        l.onLobbySync?.(payload);
        l.onLobbyAnnounce?.(payload);
      } catch {}
    });

    // Broadcast to other tabs / devices
    try {
      await cur.channel.send({
        type: 'broadcast',
        event: 'lobby_sync',
        payload,
      });
      await cur.channel.send({
        type: 'broadcast',
        event: 'lobby_announce',
        payload,
      });
    } catch {}
  };

  const sendMemberJoin = async (member: { id: string; name: string; emoji?: string }) => {
    const cur = lobbyChannelRegistry.get(topicKey);
    if (!cur) return;
    try {
      await cur.channel.send({
        type: 'broadcast',
        event: 'member_join',
        payload: member,
      });
    } catch {}
  };

  const sendMemberReady = async (id: string, isReady: boolean) => {
    const cur = lobbyChannelRegistry.get(topicKey);
    if (!cur) return;
    try {
      await cur.channel.send({
        type: 'broadcast',
        event: 'member_ready',
        payload: { id, isReady },
      });
    } catch {}
  };

  const sendMemberLeave = async (id: string) => {
    const cur = lobbyChannelRegistry.get(topicKey);
    if (!cur) return;
    try {
      await cur.channel.send({
        type: 'broadcast',
        event: 'member_leave',
        payload: { id },
      });
    } catch {}
  };

  const sendLobbyStart = async (payload: {
    members: PartyLobbyMember[];
    boardSize: number;
    variant: GameVariant;
    roomCode: string;
  }) => {
    const cur = lobbyChannelRegistry.get(topicKey);
    if (!cur) return;
    try {
      await cur.channel.send({
        type: 'broadcast',
        event: 'lobby_start',
        payload,
      });
    } catch {}
  };

  const sendLobbyClosed = async (hostId: string, reason?: string) => {
    const cur = lobbyChannelRegistry.get(topicKey);
    if (!cur) return;
    if (reason !== 'match_started') {
      cur.currentLobby = null;
    }
    try {
      await cur.channel.send({
        type: 'broadcast',
        event: 'lobby_closed',
        payload: { hostId, reason },
      });
    } catch {}
  };

  const requestLobbyInfo = async () => {
    const cur = lobbyChannelRegistry.get(topicKey);
    if (!cur) return;
    try {
      await cur.channel.send({
        type: 'broadcast',
        event: 'request_lobby_info',
        payload: {},
      });
    } catch {}
  };

  const unsubscribe = () => {
    const cur = lobbyChannelRegistry.get(topicKey);
    if (!cur) return;

    cur.listeners.delete(listenerId);

    // Only tear down Supabase channel when all listeners have unsubscribed
    if (cur.listeners.size === 0) {
      lobbyChannelRegistry.delete(topicKey);
      try {
        cur.channel.unsubscribe();
        supabase.removeChannel(cur.channel);
      } catch {}
    }
  };

  return {
    channel: entry.channel,
    broadcastLobbyState,
    sendMemberJoin,
    sendMemberReady,
    sendMemberLeave,
    sendLobbyStart,
    sendLobbyClosed,
    requestLobbyInfo,
    unsubscribe,
  };
}
