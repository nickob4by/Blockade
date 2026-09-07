import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { FriendGroup, GroupMember } from '@/lib/groups/groupService';

const DATA_DIR = path.join(process.cwd(), '.data');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const STORAGE_BUCKET = 'blockade-data';
const STORAGE_FILE = 'groups.json';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

const DUMMY_IDS = [
  'alex_1',
  'board_master_99',
  'sara_block',
  'elena_rook',
  'vince_wall',
  'knight_rider',
  'host_member',
  'ally_member',
];

function sanitizeGroupsMap(raw: Record<string, FriendGroup>): Record<string, FriendGroup> {
  const clean: Record<string, FriendGroup> = {};
  if (!raw || typeof raw !== 'object') return clean;

  Object.entries(raw).forEach(([id, g]) => {
    if (!g || typeof g !== 'object') return;
    if (g.id === 'group_warriors' || g.id === 'group_champions') return;
    if (typeof g.name === 'string' && (g.name.includes('Blockade Warriors') || g.name.includes('Quoridor Champions'))) {
      return;
    }

    const memberMap = new Map<string, GroupMember>();
    if (Array.isArray(g.members)) {
      g.members
        .filter((m) => m && typeof m === 'object' && !DUMMY_IDS.includes(m.id))
        .forEach((m) => {
          const mName = (m.name || 'Player').trim();
          const key = mName.toLowerCase();
          const existing = memberMap.get(key);
          const sanitized: GroupMember = {
            id: m.id,
            name: mName,
            emoji: m.emoji,
            role: m.role || 'member',
            status: m.status || 'offline',
            lastActive: m.lastActive || 'Recently',
          };
          if (!existing) {
            memberMap.set(key, sanitized);
          } else {
            // Replace guest_ with real user UUID if available
            if (existing.id.startsWith('guest_') && !m.id.startsWith('guest_')) {
              memberMap.set(key, sanitized);
            }
          }
        });
    }

    clean[id] = {
      ...g,
      members: Array.from(memberMap.values()),
    };
  });

  return clean;
}

// In-memory cache
let inMemoryGroups: Record<string, FriendGroup> = {};
let lastFetchTime = 0;

async function loadGroups(): Promise<Record<string, FriendGroup>> {
  const now = Date.now();
  // Cache for 3 seconds in serverless instance
  if (lastFetchTime > 0 && now - lastFetchTime < 3000 && Object.keys(inMemoryGroups).length > 0) {
    return inMemoryGroups;
  }

  // 1. Try Supabase Storage (Global multi-device sync)
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(STORAGE_FILE);
      if (data && !error) {
        const text = await data.text();
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          inMemoryGroups = sanitizeGroupsMap(parsed);
          lastFetchTime = now;
          return inMemoryGroups;
        }
      }
    } catch {
      // Fallback
    }
  }

  // 2. Fallback to local file
  try {
    if (fs.existsSync(GROUPS_FILE)) {
      const content = fs.readFileSync(GROUPS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      inMemoryGroups = sanitizeGroupsMap(parsed);
      lastFetchTime = now;
      return inMemoryGroups;
    }
  } catch {
    // Fallback
  }

  return inMemoryGroups;
}

async function saveGroups(groups: Record<string, FriendGroup>): Promise<void> {
  inMemoryGroups = groups;
  lastFetchTime = Date.now();

  const payload = JSON.stringify(groups, null, 2);

  // 1. Save to Supabase Storage (Persistent across all serverless instances)
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.storage.from(STORAGE_BUCKET).upload(STORAGE_FILE, payload, {
        contentType: 'application/json',
        upsert: true,
      });
    } catch (err) {
      console.error('Error saving groups to Supabase Storage:', err);
    }
  }

  // 2. Local file fallback
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(GROUPS_FILE, payload, 'utf-8');
  } catch {
    // Ignore in read-only serverless
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.trim().toUpperCase();
    const userId = searchParams.get('userId')?.trim();
    const userName = searchParams.get('userName')?.trim().toLowerCase();

    const groups = await loadGroups();

    if (code) {
      const group = Object.values(groups).find((g) => g.code.toUpperCase() === code);
      if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, group });
    }

    if (userId || userName) {
      const isGeneric = !userName || userName === 'player 1' || userName === 'guest' || userName.startsWith('guest_');
      const userGroups = Object.values(groups).filter((g) =>
        g.members.some((m) =>
          (userId && !userId.startsWith('guest_') && m.id === userId) ||
          (!isGeneric && m.name && m.name.toLowerCase() === userName)
        )
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
    const groups = await loadGroups();

    if (action === 'create') {
      const { group } = body as { group: FriendGroup };
      if (!group || !group.name || !group.code) {
        return NextResponse.json({ error: 'Invalid group data' }, { status: 400 });
      }

      const cleanMembers = (group.members || []).filter((m) => !DUMMY_IDS.includes(m.id));

      const cleanGroup: FriendGroup = {
        ...group,
        members: cleanMembers,
      };

      groups[cleanGroup.id] = cleanGroup;
      await saveGroups(groups);
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

      group.members = group.members.filter((m) => !DUMMY_IDS.includes(m.id));
      groups[group.id] = group;
      await saveGroups(groups);
      return NextResponse.json({ success: true, group });
    }

    if (action === 'sync_members') {
      const { code, members } = body as { code: string; members: GroupMember[] };
      const cleanCode = (code || '').trim().toUpperCase();
      const group = Object.values(groups).find((g) => g.code.toUpperCase() === cleanCode);

      if (!group) {
        return NextResponse.json({ error: 'Group not found' }, { status: 404 });
      }

      if (Array.isArray(members)) {
        members.forEach((newM) => {
          if (!newM || DUMMY_IDS.includes(newM.id)) return;
          const idx = group.members.findIndex((m) => m.id === newM.id);
          if (idx === -1) {
            group.members.push({
              id: newM.id,
              name: newM.name,
              emoji: newM.emoji,
              role: newM.role || 'member',
              status: newM.status || 'offline',
              lastActive: 'Recently',
            });
          } else {
            group.members[idx] = {
              ...group.members[idx],
              name: newM.name || group.members[idx].name,
              emoji: newM.emoji || group.members[idx].emoji,
            };
          }
        });
      }

      group.members = group.members.filter((m) => !DUMMY_IDS.includes(m.id));
      groups[group.id] = group;
      await saveGroups(groups);
      return NextResponse.json({ success: true, group });
    }

    if (action === 'leave') {
      const { groupId, userId } = body;
      if (groups[groupId]) {
        groups[groupId].members = groups[groupId].members.filter((m) => m.id !== userId);
        await saveGroups(groups);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
