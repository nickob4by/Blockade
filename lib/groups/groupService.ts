import { getSupabaseClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export type MemberStatus = 'online' | 'in_game' | 'offline';

export interface GroupMember {
  id: string;
  name: string;
  role: 'leader' | 'member';
  status: MemberStatus;
  isYou?: boolean;
  avatarUrl?: string;
  emoji?: string;
  lastActive?: string;
}

export interface FriendGroup {
  id: string;
  name: string;
  code: string;
  icon?: string;
  description?: string;
  createdAt: string;
  createdBy: string;
  members: GroupMember[];
}

const STORAGE_KEY_PREFIX = 'blockade_user_groups_';
const ALL_KNOWN_GROUPS_KEY = 'blockade_all_known_groups';

const DUMMY_MEMBER_IDS = [
  'alex_1',
  'board_master_99',
  'sara_block',
  'elena_rook',
  'vince_wall',
  'knight_rider',
  'host_member',
  'ally_member',
];

/**
 * Returns empty array so no default or random mock groups exist.
 */
export function getInitialStarterGroups(_userId?: string, _userName?: string): FriendGroup[] {
  return [];
}

/**
 * Clean legacy dummy groups and dummy members out of stored groups.
 */
function sanitizeGroups(groups: FriendGroup[], userId: string, userName: string): FriendGroup[] {
  if (!Array.isArray(groups)) return [];
  return groups
    .filter((g) => {
      if (!g || typeof g !== 'object') return false;
      if (!g.code || typeof g.code !== 'string') return false;
      if (g.id === 'group_warriors' || g.id === 'group_champions') return false;
      if (typeof g.name === 'string' && (g.name.includes('Blockade Warriors') || g.name.includes('Quoridor Champions'))) return false;
      return true;
    })
    .map((g) => {
      const memberMap = new Map<string, GroupMember>();
      if (Array.isArray(g.members)) {
        g.members
          .filter((m) => m && typeof m === 'object' && !DUMMY_MEMBER_IDS.includes(m.id))
          .forEach((m) => {
            const rawName = (m.name || 'Player').trim();
            const key = rawName.toLowerCase();
            const existing = memberMap.get(key);
            if (!existing) {
              memberMap.set(key, m);
            } else {
              // Prefer real user UUID over guest_... id
              if (existing.id.startsWith('guest_') && !m.id.startsWith('guest_')) {
                memberMap.set(key, m);
              }
            }
          });
      }

      return {
        ...g,
        members: Array.from(memberMap.values()).map((m) => {
          const mName = m.name || 'Player';
          const isYou = m.id === userId || mName.toLowerCase() === (userName || '').toLowerCase();
          return {
            ...m,
            isYou,
            name: m.id === userId ? userName : mName,
          };
        }),
      };
    });
}

export function getUserGroups(userId: string, userName: string): FriendGroup[] {
  if (typeof window === 'undefined') return [];
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  const stored = localStorage.getItem(key);

  if (!stored) {
    return [];
  }

  try {
    const parsed: FriendGroup[] = JSON.parse(stored);
    const cleaned = sanitizeGroups(parsed, userId, userName);
    if (cleaned.length !== parsed.length) {
      saveUserGroups(userId, cleaned);
    }
    return cleaned;
  } catch (err) {
    console.error('Failed to parse stored groups:', err);
    return [];
  }
}

export function saveUserGroups(userId: string, groups: FriendGroup[]): void {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  localStorage.setItem(key, JSON.stringify(groups));

  // Also cache in known groups map
  groups.forEach((g) => saveKnownGroup(g));

  // Notify listeners that groups updated
  try {
    window.dispatchEvent(new CustomEvent('blockade_groups_updated', { detail: { userId } }));
  } catch {
    // Ignore
  }
}

export function getKnownGroupsMap(): Record<string, FriendGroup> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(ALL_KNOWN_GROUPS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function saveKnownGroup(group: FriendGroup): void {
  if (typeof window === 'undefined' || !group || !group.code || typeof group.code !== 'string') return;
  try {
    const all = getKnownGroupsMap();
    all[group.code.toUpperCase()] = group;
    localStorage.setItem(ALL_KNOWN_GROUPS_KEY, JSON.stringify(all));
  } catch {
    // Ignore storage quota
  }
}

/**
 * Fetch group details from server with complete members list.
 */
export async function fetchRemoteGroup(code: string): Promise<FriendGroup | null> {
  if (!code || typeof code !== 'string' || typeof fetch === 'undefined') return null;
  try {
    const clean = code.trim().toUpperCase();
    const res = await fetch(`/api/groups?code=${encodeURIComponent(clean)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.group) {
        saveKnownGroup(data.group);
        return data.group;
      }
    }
  } catch {
    // Offline fallback
  }
  return null;
}

/**
 * Fetch all groups the user belongs to from the server across devices.
 */
export async function fetchUserGroupsAsync(
  userId: string,
  userName: string
): Promise<FriendGroup[]> {
  const local = getUserGroups(userId, userName);
  if (typeof fetch === 'undefined') return local;

  try {
    const res = await fetch(
      `/api/groups?userId=${encodeURIComponent(userId)}&userName=${encodeURIComponent(userName)}`
    );
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.groups)) {
        const remoteGroups: FriendGroup[] = data.groups;
        const mergedMap = new Map<string, FriendGroup>();
        
        remoteGroups.forEach((g) => mergedMap.set(g.id, g));
        local.forEach((g) => {
          if (!mergedMap.has(g.id)) {
            mergedMap.set(g.id, g);
          } else {
            const rem = mergedMap.get(g.id)!;
            const existingMemberIds = new Set(rem.members.map((m) => m.id));
            g.members.forEach((m) => {
              if (!existingMemberIds.has(m.id)) {
                rem.members.push(m);
              }
            });
          }
        });

        const mergedList = sanitizeGroups(Array.from(mergedMap.values()), userId, userName);
        saveUserGroups(userId, mergedList);
        return mergedList;
      }
    }
  } catch {
    // Offline fallback
  }

  return local;
}

export function createGroup(
  userId: string,
  userName: string,
  groupName: string,
  userEmoji?: string
): FriendGroup {
  const cleanName = groupName.trim();
  const slug =
    cleanName
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 6)
      .toUpperCase() || 'GRP';
  const randomNum = Math.floor(10 + Math.random() * 90);
  const code = `${slug}-${randomNum}`;
  const id = `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newGroup: FriendGroup = {
    id,
    name: cleanName,
    code,
    icon: '🛡️',
    description: `Created by ${userName}`,
    createdAt: new Date().toISOString(),
    createdBy: userId,
    members: [
      {
        id: userId,
        name: userName,
        emoji: userEmoji,
        role: 'leader',
        status: 'online',
        isYou: true,
        lastActive: 'Just now',
      },
    ],
  };

  const existing = getUserGroups(userId, userName);
  const updated = [newGroup, ...existing];
  saveUserGroups(userId, updated);
  saveKnownGroup(newGroup);

  // Sync with backend API (and Supabase Storage)
  if (typeof fetch !== 'undefined') {
    fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', group: newGroup }),
    }).catch(() => {
      // Offline fallback
    });
  }

  return newGroup;
}

export function joinGroupByCode(
  userId: string,
  userName: string,
  inviteCode: string,
  userEmoji?: string
): { success: boolean; group?: FriendGroup; error?: string } {
  const code = inviteCode.trim().toUpperCase();
  const existing = getUserGroups(userId, userName);

  // Check if already in group
  const alreadyIn = existing.find((g) => g.code.toUpperCase() === code);
  if (alreadyIn) {
    return { success: true, group: alreadyIn };
  }

  // Check known groups registry
  const knownMap = getKnownGroupsMap();
  const targetGroup = knownMap[code];

  if (!targetGroup) {
    return {
      success: false,
      error: `No group found with invite code "${code}". Please verify the code or check with the creator.`,
    };
  }

  // Add current user to real members (no dummy users)
  const cleanMembers = targetGroup.members.filter((m) => !DUMMY_MEMBER_IDS.includes(m.id));
  const existingMemberIdx = cleanMembers.findIndex((m) => m.id === userId);

  if (existingMemberIdx === -1) {
    cleanMembers.push({
      id: userId,
      name: userName,
      emoji: userEmoji,
      role: 'member',
      status: 'online',
      isYou: true,
      lastActive: 'Just now',
    });
  }

  const updatedGroup: FriendGroup = {
    ...targetGroup,
    members: cleanMembers,
  };

  const updated = [updatedGroup, ...existing];
  saveUserGroups(userId, updated);
  saveKnownGroup(updatedGroup);

  return { success: true, group: updatedGroup };
}

/**
 * Async join that fetches from `/api/groups` first so cross-device joining
 * immediately discovers the group by invite code with its true name and real members.
 */
export async function joinGroupByCodeAsync(
  userId: string,
  userName: string,
  inviteCode: string,
  userEmoji?: string
): Promise<{ success: boolean; group?: FriendGroup; error?: string }> {
  const code = inviteCode.trim().toUpperCase();
  const existing = getUserGroups(userId, userName);

  // Check if already in user's groups
  const alreadyIn = existing.find((g) => g.code.toUpperCase() === code);
  if (alreadyIn) {
    return { success: true, group: alreadyIn };
  }

  // Try API route first for cross-device synchronization
  if (typeof fetch !== 'undefined') {
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          code,
          member: {
            id: userId,
            name: userName,
            emoji: userEmoji,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.group) {
        const remoteGroup: FriendGroup = {
          ...data.group,
          members: (data.group.members as GroupMember[])
            .filter((m) => !DUMMY_MEMBER_IDS.includes(m.id))
            .map((m) => ({
              ...m,
              isYou: m.id === userId,
            })),
        };

        const updated = [remoteGroup, ...existing.filter((g) => g.id !== remoteGroup.id)];
        saveUserGroups(userId, updated);
        saveKnownGroup(remoteGroup);
        return { success: true, group: remoteGroup };
      }

      if (data.error) {
        return { success: false, error: data.error };
      }
    } catch {
      // Fallback to local check
    }
  }

  // Local fallback
  return joinGroupByCode(userId, userName, code, userEmoji);
}

export function leaveGroup(userId: string, userName: string, groupId: string): FriendGroup[] {
  const existing = getUserGroups(userId, userName);
  const filtered = existing.filter((g) => g.id !== groupId);
  saveUserGroups(userId, filtered);

  if (typeof fetch !== 'undefined') {
    fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave', groupId, userId }),
    }).catch(() => {
      // Ignore
    });
  }

  return filtered;
}

/**
 * Permanently stores a presence-discovered member into the group in localStorage and on server.
 */
export function persistMemberIntoGroup(
  groupId: string,
  member: GroupMember,
  userId: string,
  userName: string
): FriendGroup[] {
  const groups = getUserGroups(userId, userName);
  const targetGroup = groups.find((g) => g.id === groupId);
  if (!targetGroup) return groups;

  const idx = targetGroup.members.findIndex((m) => m.id === member.id);
  if (idx === -1) {
    targetGroup.members.push({
      id: member.id,
      name: member.name,
      emoji: member.emoji,
      role: member.role || 'member',
      status: member.status || 'offline',
      lastActive: member.lastActive || 'Recently',
    });
    saveUserGroups(userId, groups);
    saveKnownGroup(targetGroup);

    if (typeof fetch !== 'undefined') {
      fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_members',
          code: targetGroup.code,
          members: [member],
        }),
      }).catch(() => {});
    }
  }
  return groups;
}

export interface GroupPresenceSubscription {
  channel: RealtimeChannel | null;
  updateStatus: (status: MemberStatus) => Promise<void>;
  broadcastMemberJoined: (member: GroupMember) => Promise<void>;
  unsubscribe: () => void;
}

interface PresenceListener {
  id: string;
  onUpdate: (presences: Record<string, { name: string; status: MemberStatus; emoji?: string }>) => void;
  onMemberJoined?: (member: GroupMember) => void;
}

interface GroupChannelRegistryEntry {
  channel: RealtimeChannel;
  listeners: Map<string, PresenceListener>;
  user: { id: string; name: string; status: MemberStatus; emoji?: string };
}

const groupChannelRegistry = new Map<string, GroupChannelRegistryEntry>();

function extractPresences(channel: RealtimeChannel): Record<string, { name: string; status: MemberStatus; emoji?: string }> {
  try {
    const rawState = channel.presenceState();
    const result: Record<string, { name: string; status: MemberStatus; emoji?: string }> = {};
    Object.entries(rawState).forEach(([key, items]) => {
      if (Array.isArray(items) && items.length > 0) {
        const item: any = items[0];
        result[key] = {
          name: item.name || 'Player',
          status: item.status || 'online',
          emoji: item.emoji,
        };
      }
    });
    return result;
  } catch {
    return {};
  }
}

/**
 * Subscribes to real-time presence for a specific group channel.
 * Uses a reference-counted channel registry so background presence and UI modals
 * share the same channel without killing each other or creating duplicate subscriptions.
 */
export function subscribeToGroupPresence(
  groupCode: string,
  user: { id: string; name: string; status: MemberStatus; emoji?: string },
  onPresenceUpdate: (presences: Record<string, { name: string; status: MemberStatus; emoji?: string }>) => void,
  onMemberJoined?: (member: GroupMember) => void
): GroupPresenceSubscription {
  if (!groupCode || typeof groupCode !== 'string' || !user || !user.id) {
    return {
      channel: null,
      updateStatus: async () => {},
      broadcastMemberJoined: async () => {},
      unsubscribe: () => {},
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      channel: null,
      updateStatus: async () => {},
      broadcastMemberJoined: async () => {},
      unsubscribe: () => {},
    };
  }

  const topicKey = groupCode.trim().toLowerCase();
  const channelName = `group_presence:${topicKey}`;
  const listenerId = Math.random().toString(36).substring(2, 9);

  let entry = groupChannelRegistry.get(topicKey);

  const dispatchSync = (channel: RealtimeChannel) => {
    const current = groupChannelRegistry.get(topicKey);
    if (!current) return;
    const presences = extractPresences(channel);
    current.listeners.forEach((l) => {
      try {
        l.onUpdate(presences);
      } catch {
        // Ignore callback error
      }
    });
  };

  if (!entry) {
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
        broadcast: {
          self: false,
        },
      },
    });

    entry = {
      channel,
      listeners: new Map(),
      user: { ...user },
    };
    groupChannelRegistry.set(topicKey, entry);

    channel
      .on('presence', { event: 'sync' }, () => dispatchSync(channel))
      .on('presence', { event: 'join' }, () => dispatchSync(channel))
      .on('presence', { event: 'leave' }, () => dispatchSync(channel))
      .on('broadcast', { event: 'group_event' }, ({ payload }) => {
        if (payload?.type === 'MEMBER_JOINED' && payload.member) {
          const cur = groupChannelRegistry.get(topicKey);
          cur?.listeners.forEach((l) => {
            if (l.onMemberJoined) {
              try {
                l.onMemberJoined(payload.member);
              } catch {}
            }
          });
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.track({
              userId: user.id,
              name: user.name,
              emoji: user.emoji,
              status: user.status,
              updatedAt: new Date().toISOString(),
            });
          } catch {
            // Ignore track error
          }
        }
      });
  } else {
    // Channel already active: update track if user info or status changed
    if (
      entry.user.status !== user.status ||
      entry.user.name !== user.name ||
      entry.user.emoji !== user.emoji
    ) {
      entry.user = { ...user };
      entry.channel
        .track({
          userId: user.id,
          name: user.name,
          emoji: user.emoji,
          status: user.status,
          updatedAt: new Date().toISOString(),
        })
        .catch(() => {});
    }
  }

  // Register this listener
  entry.listeners.set(listenerId, {
    id: listenerId,
    onUpdate: onPresenceUpdate,
    onMemberJoined,
  });

  // Provide initial presence state immediately if available
  const initialPresences = extractPresences(entry.channel);
  if (Object.keys(initialPresences).length > 0) {
    try {
      onPresenceUpdate(initialPresences);
    } catch {}
  }

  const updateStatus = async (newStatus: MemberStatus) => {
    user.status = newStatus;
    const currentEntry = groupChannelRegistry.get(topicKey);
    if (currentEntry) {
      currentEntry.user.status = newStatus;
      try {
        await currentEntry.channel.track({
          userId: user.id,
          name: user.name,
          emoji: user.emoji,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        });
      } catch {
        // Ignore
      }
    }
  };

  const broadcastMemberJoined = async (member: GroupMember) => {
    const currentEntry = groupChannelRegistry.get(topicKey);
    if (currentEntry) {
      try {
        await currentEntry.channel.send({
          type: 'broadcast',
          event: 'group_event',
          payload: { type: 'MEMBER_JOINED', member },
        });
      } catch {
        // Ignore
      }
    }
  };

  const unsubscribe = () => {
    const currentEntry = groupChannelRegistry.get(topicKey);
    if (!currentEntry) return;

    currentEntry.listeners.delete(listenerId);

    // Only tear down channel if all listeners have unsubscribed
    if (currentEntry.listeners.size === 0) {
      groupChannelRegistry.delete(topicKey);
      try {
        currentEntry.channel.unsubscribe();
        supabase.removeChannel(currentEntry.channel);
      } catch {
        // Ignore
      }
    }
  };

  return {
    channel: entry.channel,
    updateStatus,
    broadcastMemberJoined,
    unsubscribe,
  };
}

/**
 * Unsubscribes and closes all active group presence channels immediately.
 * Called when a user logs out so their online status drops to offline instantly.
 */
export function unsubscribeAllGroupPresence(): void {
  const supabase = getSupabaseClient();
  groupChannelRegistry.forEach((entry) => {
    try {
      entry.channel.unsubscribe();
      if (supabase) {
        supabase.removeChannel(entry.channel);
      }
    } catch {
      // Ignore
    }
  });
  groupChannelRegistry.clear();
}
