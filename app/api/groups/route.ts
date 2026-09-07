import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { FriendGroup, GroupMember } from '@/lib/groups/groupService';

const DATA_DIR = path.join(process.cwd(), '.data');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');

// In-memory cache for ultra-fast lookups
let inMemoryGroups: Record<string, FriendGroup> = {};
let isLoaded = false;

function loadGroups(): Record<string, FriendGroup> {
  if (isLoaded) return inMemoryGroups;
  try {
    if (fs.existsSync(GROUPS_FILE)) {
      const content = fs.readFileSync(GROUPS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      // Clean out any legacy mock groups or mock members
      const clean: Record<string, FriendGroup> = {};
      const dummyIds = [
        'alex_1',
        'board_master_99',
        'sara_block',
        'elena_rook',
        'vince_wall',
        'knight_rider',
        'host_member',
        'ally_member',
      ];
      Object.entries(parsed as Record<string, FriendGroup>).forEach(([id, g]) => {
        if (g.id === 'group_warriors' || g.id === 'group_champions') return;
        if (g.name.includes('Blockade Warriors') || g.name.includes('Quoridor Champions')) return;
        clean[id] = {
          ...g,
          members: g.members.filter((m) => !dummyIds.includes(m.id)),
        };
      });
      inMemoryGroups = clean;
    }
  } catch (e) {
    console.error('Error reading groups file:', e);
  }
  isLoaded = true;
  return inMemoryGroups;
}

function saveGroups(groups: Record<string, FriendGroup>) {
  inMemoryGroups = groups;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing groups file:', e);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.trim().toUpperCase();
    const userId = searchParams.get('userId')?.trim();

    const groups = loadGroups();

    if (code) {
      const group = Object.values(groups).find((g) => g.code.toUpperCase() === code);
      if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, group });
    }

    if (userId) {
      const userGroups = Object.values(groups).filter((g) =>
        g.members.some((m) => m.id === userId)
      );
      return NextResponse.json({ success: true, groups: userGroups });
    }

    return NextResponse.json({ success: true, groups: Object.values(groups) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;
    const groups = loadGroups();

    const dummyIds = [
      'alex_1',
      'board_master_99',
      'sara_block',
      'elena_rook',
      'vince_wall',
      'knight_rider',
      'host_member',
      'ally_member',
    ];

    if (action === 'create') {
      const { group } = body as { group: FriendGroup };
      if (!group || !group.name || !group.code) {
        return NextResponse.json({ error: 'Invalid group data' }, { status: 400 });
      }

      // Ensure no mock members are present
      const cleanMembers = (group.members || []).filter((m) => !dummyIds.includes(m.id));

      const cleanGroup: FriendGroup = {
        ...group,
        members: cleanMembers,
      };

      groups[cleanGroup.id] = cleanGroup;
      saveGroups(groups);
      return NextResponse.json({ success: true, group: cleanGroup });
    }

    if (action === 'join') {
      const { code, member } = body as { code: string; member: GroupMember };
      const cleanCode = (code || '').trim().toUpperCase();
      const group = Object.values(groups).find((g) => g.code.toUpperCase() === cleanCode);

      if (!group) {
        return NextResponse.json(
          { error: `No group found with invite code "${cleanCode}". Please verify the code.` },
          { status: 404 }
        );
      }

      // Add member if not already present
      const existingIdx = group.members.findIndex((m) => m.id === member.id);
      if (existingIdx === -1) {
        group.members.push({
          id: member.id,
          name: member.name,
          emoji: member.emoji,
          role: 'member',
          status: 'online',
          lastActive: 'Just now',
        });
      } else {
        group.members[existingIdx] = {
          ...group.members[existingIdx],
          name: member.name,
          emoji: member.emoji || group.members[existingIdx].emoji,
          status: 'online',
          lastActive: 'Just now',
        };
      }

      // Purge any dummy members
      group.members = group.members.filter((m) => !dummyIds.includes(m.id));

      groups[group.id] = group;
      saveGroups(groups);
      return NextResponse.json({ success: true, group });
    }

    if (action === 'leave') {
      const { groupId, userId } = body;
      if (groups[groupId]) {
        groups[groupId].members = groups[groupId].members.filter((m) => m.id !== userId);
        saveGroups(groups);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
