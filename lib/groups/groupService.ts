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

// Initial starter groups so every player immediately has rich groups to inspect
export function getInitialStarterGroups(userId: string, userName: string): FriendGroup[] {
  return [
    {
      id: 'group_warriors',
      name: '⚔️ Blockade Warriors',
      code: 'WARRIORS-9',
      icon: '⚔️',
      description: 'Competitive tactical Quoridor players and daily scrims.',
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      createdBy: 'alex_1',
      members: [
        {
          id: 'alex_1',
          name: 'Alex_Tactics',
          role: 'leader',
          status: 'online',
          isYou: false,
          lastActive: 'Just now',
        },
        {
          id: userId,
          name: userName,
          role: 'member',
          status: 'online',
          isYou: true,
          lastActive: 'Just now',
        },
        {
          id: 'board_master_99',
          name: 'BoardMaster99',
          role: 'member',
          status: 'in_game',
          isYou: false,
          lastActive: 'Playing match vs AI',
        },
        {
          id: 'sara_block',
          name: 'Sara_Block',
          role: 'member',
          status: 'offline',
          isYou: false,
          lastActive: '2 hours ago',
        },
      ],
    },
    {
      id: 'group_champions',
      name: '👑 Quoridor Champions',
      code: 'CHAMPS-4',
      icon: '👑',
      description: 'Strategy masterminds, wall jump experts, and tournament practice.',
      createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
      createdBy: 'elena_rook',
      members: [
        {
          id: 'elena_rook',
          name: 'Elena_Rook',
          role: 'leader',
          status: 'online',
          isYou: false,
          lastActive: 'Just now',
        },
        {
          id: 'vince_wall',
          name: 'Vince_Wall',
          role: 'member',
          status: 'in_game',
          isYou: false,
          lastActive: 'In competitive lobby',
        },
        {
          id: userId,
          name: userName,
          role: 'member',
          status: 'online',
          isYou: true,
          lastActive: 'Just now',
        },
        {
          id: 'knight_rider',
          name: 'Knight_Rider',
          role: 'member',
          status: 'offline',
          isYou: false,
          lastActive: 'Yesterday',
        },
      ],
    },
  ];
}

export function getUserGroups(userId: string, userName: string): FriendGroup[] {
  if (typeof window === 'undefined') return [];
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  const stored = localStorage.getItem(key);

  if (!stored) {
    const initial = getInitialStarterGroups(userId, userName);
    saveUserGroups(userId, initial);
    return initial;
  }

  try {
    const parsed: FriendGroup[] = JSON.parse(stored);
    // Ensure current user is tagged with isYou
    return parsed.map((g) => ({
      ...g,
      members: g.members.map((m) => ({
        ...m,
        isYou: m.id === userId || m.name.toLowerCase() === userName.toLowerCase(),
        name: m.id === userId ? userName : m.name,
      })),
    }));
  } catch (err) {
    console.error('Failed to parse stored groups:', err);
    return getInitialStarterGroups(userId, userName);
  }
}

export function saveUserGroups(userId: string, groups: FriendGroup[]): void {
  if (typeof window === 'undefined') return;
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  localStorage.setItem(key, JSON.stringify(groups));
}

export function createGroup(userId: string, userName: string, groupName: string): FriendGroup {
  const cleanName = groupName.trim();
  const slug = cleanName
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
    description: 'Custom friend circle.',
    createdAt: new Date().toISOString(),
    createdBy: userId,
    members: [
      {
        id: userId,
        name: userName,
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
  return newGroup;
}

export function joinGroupByCode(
  userId: string,
  userName: string,
  inviteCode: string
): { success: boolean; group?: FriendGroup; error?: string } {
  const code = inviteCode.trim().toUpperCase();
  const existing = getUserGroups(userId, userName);

  // Check if already in group
  const alreadyIn = existing.find((g) => g.code.toUpperCase() === code);
  if (alreadyIn) {
    return { success: true, group: alreadyIn };
  }

  // Create or join that group
  const newGroup: FriendGroup = {
    id: `group_${code.toLowerCase()}`,
    name: `Squad: ${code}`,
    code,
    icon: '🎯',
    description: `Joined via code ${code}.`,
    createdAt: new Date().toISOString(),
    createdBy: 'host',
    members: [
      {
        id: 'host_member',
        name: 'Squad_Host',
        role: 'leader',
        status: 'online',
        isYou: false,
        lastActive: 'Active recently',
      },
      {
        id: userId,
        name: userName,
        role: 'member',
        status: 'online',
        isYou: true,
        lastActive: 'Just now',
      },
      {
        id: 'ally_member',
        name: 'ShadowRunner',
        role: 'member',
        status: 'offline',
        isYou: false,
        lastActive: '1 hr ago',
      },
    ],
  };

  const updated = [newGroup, ...existing];
  saveUserGroups(userId, updated);
  return { success: true, group: newGroup };
}

export function leaveGroup(userId: string, userName: string, groupId: string): FriendGroup[] {
  const existing = getUserGroups(userId, userName);
  const filtered = existing.filter((g) => g.id !== groupId);
  saveUserGroups(userId, filtered);
  return filtered;
}

/**
 * Subscribes to real-time presence for a specific group channel.
 * Updates dynamic presence (online/in_game) when other players join or leave.
 */
export function subscribeToGroupPresence(
  groupCode: string,
  user: { id: string; name: string; status: MemberStatus },
  onPresenceUpdate: (presences: Record<string, { name: string; status: MemberStatus }>) => void
): { channel: RealtimeChannel | null; unsubscribe: () => void } {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { channel: null, unsubscribe: () => {} };
  }

  const channelName = `group_presence:${groupCode.toLowerCase()}`;
  const channel = supabase.channel(channelName, {
    config: {
      presence: {
        key: user.id,
      },
    },
  });

  const handleSync = () => {
    const rawState = channel.presenceState();
    const result: Record<string, { name: string; status: MemberStatus }> = {};

    Object.entries(rawState).forEach(([key, items]) => {
      if (Array.isArray(items) && items.length > 0) {
        const item: any = items[0];
        result[key] = {
          name: item.name || 'Player',
          status: item.status || 'online',
        };
      }
    });

    onPresenceUpdate(result);
  };

  channel
    .on('presence', { event: 'sync' }, handleSync)
    .on('presence', { event: 'join' }, handleSync)
    .on('presence', { event: 'leave' }, handleSync)
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId: user.id,
          name: user.name,
          status: user.status,
          updatedAt: new Date().toISOString(),
        });
      }
    });

  return {
    channel,
    unsubscribe: () => {
      channel.unsubscribe();
    },
  };
}
