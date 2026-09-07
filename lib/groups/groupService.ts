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
      if (g.id === 'group_warriors' || g.id === 'group_champions') return false;
      if (typeof g.name === 'string' && (g.name.includes('Blockade Warriors') || g.name.includes('Quoridor Champions'))) return false;
      return true;
    })
    .map((g) => ({
      ...g,
      members: Array.isArray(g.members)
        ? g.members
            .filter((m) => m && typeof m === 'object' && !DUMMY_MEMBER_IDS.includes(m.id))
            .map((m) => {
              const mName = m.name || 'Player';
              const isYou = m.id === userId || mName.toLowerCase() === (userName || '').toLowerCase();
              return {
                ...m,
                isYou,
                name: m.id === userId ? userName : mName,
              };
            })
        : [],
    }));
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
  if (typeof window === 'undefined' || !group || !group.code) return;
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
  if (typeof fetch === 'undefined') return null;
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
    const res = await fetch(`/api/groups?userId=${encodeURIComponent(userId)}`);
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

/**
 * Subscribes to real-time presence for a specific group channel.
 * Updates dynamic presence (online/in_game) when other players join or leave.
 */
export function subscribeToGroupPresence(
  groupCode: string,
  user: { id: string; name: string; status: MemberStatus; emoji?: string },
  onPresenceUpdate: (presences: Record<string, { name: string; status: MemberStatus; emoji?: string }>) => void,
  onMemberJoined?: (member: GroupMember) => void
): GroupPresenceSubscription {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      channel: null,
      updateStatus: async () => {},
      broadcastMemberJoined: async () => {},
      unsubscribe: () => {},
    };
  }

  const channelName = `group_presence:${groupCode.toLowerCase()}`;
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

  const handleSync = () => {
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

    onPresenceUpdate(result);
  };

  channel
    .on('presence', { event: 'sync' }, handleSync)
    .on('presence', { event: 'join' }, handleSync)
    .on('presence', { event: 'leave' }, handleSync)
    .on('broadcast', { event: 'group_event' }, ({ payload }) => {
      if (payload?.type === 'MEMBER_JOINED' && payload.member && onMemberJoined) {
        onMemberJoined(payload.member);
      }
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId: user.id,
          name: user.name,
          emoji: user.emoji,
          status: user.status,
          updatedAt: new Date().toISOString(),
        });
      }
    });

  const updateStatus = async (newStatus: MemberStatus) => {
    user.status = newStatus;
    try {
      await channel.track({
        userId: user.id,
        name: user.name,
        emoji: user.emoji,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // Ignore
    }
  };

  const broadcastMemberJoined = async (member: GroupMember) => {
    try {
      await channel.send({
        type: 'broadcast',
        event: 'group_event',
        payload: { type: 'MEMBER_JOINED', member },
      });
    } catch {
      // Ignore
    }
  };

  return {
    channel,
    updateStatus,
    broadcastMemberJoined,
    unsubscribe: () => {
      channel.unsubscribe();
    },
  };
}
