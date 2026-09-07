'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  X,
  Users,
  Plus,
  LogIn,
  Swords,
  Shield,
  Sparkles,
  Check,
  Lock,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  UserPlus,
  Copy,
  ChevronRight,
  Circle,
  Radio,
  Gamepad2,
  Trash2,
  Share2,
} from 'lucide-react';
import { AuthModal } from './AuthModal';
import {
  FriendGroup,
  GroupMember,
  MemberStatus,
  getUserGroups,
  createGroup,
  joinGroupByCodeAsync,
  leaveGroup,
  subscribeToGroupPresence,
  fetchRemoteGroup,
  fetchUserGroupsAsync,
  persistMemberIntoGroup,
} from '@/lib/groups/groupService';

interface GroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartOnlineMatch?: (opponentName: string) => void;
  onChallengePlayer?: (member: GroupMember, group?: FriendGroup) => void;
}

export const GroupsModal: React.FC<GroupsModalProps> = ({
  isOpen,
  onClose,
  onStartOnlineMatch,
  onChallengePlayer,
}) => {
  const { user, profile } = useAuth();
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my_groups' | 'create' | 'join'>('my_groups');
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupCodeInput, setGroupCodeInput] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');
  const [copiedCode, setCopiedCode] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [memberFilter, setMemberFilter] = useState<'all' | 'online' | 'in_game' | 'offline'>('all');
  const [livePresences, setLivePresences] = useState<Record<string, { name: string; status: MemberStatus; emoji?: string }>>({});
  const [isJoining, setIsJoining] = useState(false);

  const currentUserId = user?.id || profile.id || 'guest_user';
  const currentUserName = profile.name || 'Player 1';

  // Load groups when modal opens or user changes
  useEffect(() => {
    if (isOpen) {
      if (!user) {
        // Logged-out guests do not retain or access authenticated accounts' groups
        setGroups([]);
        setSelectedGroupId(null);
        setFeedbackMsg(null);
        return;
      }

      const userGroups = getUserGroups(currentUserId, currentUserName);
      setGroups(userGroups);
      setFeedbackMsg(null);

      // Async fetch to sync circles from server / other devices
      fetchUserGroupsAsync(currentUserId, currentUserName).then((remoteGroups) => {
        if (remoteGroups && remoteGroups.length > 0) {
          setGroups(remoteGroups);
        }
      });
    }
  }, [isOpen, user, currentUserId, currentUserName]);

  // Selected group object
  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return groups.find((g) => g.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  // Subscribe to real-time presence when a group is selected and sync full remote member list
  useEffect(() => {
    if (!user || !selectedGroup || !selectedGroup.code || typeof selectedGroup.code !== 'string') {
      setLivePresences({});
      return;
    }

    // Fetch latest group details and persistent members from server
    fetchRemoteGroup(selectedGroup.code).then((remote) => {
      if (remote && Array.isArray(remote.members)) {
        setGroups((prev) =>
          prev.map((g) => (g.id === remote.id ? { ...g, members: remote.members } : g))
        );
      }
    });

    const sub = subscribeToGroupPresence(
      selectedGroup.code,
      {
        id: currentUserId,
        name: currentUserName,
        emoji: profile.emoji || undefined,
        status: 'online',
      },
      (presences) => {
        setLivePresences(presences);
      },
      (newMember) => {
        // Broadcast listener: add new member in real-time
        setGroups((prev) =>
          prev.map((g) => {
            if (g.code && g.code.toUpperCase() === selectedGroup.code.toUpperCase()) {
              if (!g.members.some((m) => m && m.id === newMember.id)) {
                return { ...g, members: [...g.members, newMember] };
              }
            }
            return g;
          })
        );
      }
    );

    return () => {
      sub.unsubscribe();
    };
  }, [selectedGroup?.id, selectedGroup?.code, user, currentUserId, currentUserName, profile.emoji]);

  // Calculate live members for selected group (only real users, no dummy mock bots)
  const resolvedMembers: GroupMember[] = useMemo(() => {
    if (!selectedGroup || !Array.isArray(selectedGroup.members)) return [];

    const memberMap = new Map<string, GroupMember>();

    // Process all legitimate group members, deduplicating by normalized name
    selectedGroup.members.forEach((member) => {
      if (!member) return;
      const mName = (member.name || 'Player').trim();
      const normName = mName.toLowerCase();
      const isYou = member.id === currentUserId || normName === (currentUserName || '').toLowerCase();
      
      // Match presence by user ID or username
      const live = livePresences[member.id] || Object.values(livePresences).find(
        (p) => (p?.name || '').trim().toLowerCase() === normName
      );

      // Status: if isYou -> online; if live in channel -> live.status; otherwise -> offline
      const status: MemberStatus = isYou
        ? 'online'
        : live
        ? live.status
        : 'offline';

      const resolved: GroupMember = {
        ...member,
        name: isYou ? currentUserName : mName,
        isYou,
        emoji: isYou ? (profile.emoji || member.emoji) : (live?.emoji || member.emoji),
        status,
        lastActive: isYou
          ? 'Active now'
          : live
          ? (live.status === 'in_game' ? 'Playing match' : 'Active now')
          : member.lastActive || 'Offline',
      };

      // Deduplicate by name: keep real account if both guest and real exist
      const existing = memberMap.get(normName);
      if (!existing) {
        memberMap.set(normName, resolved);
      } else {
        if (existing.id.startsWith('guest_') && !member.id.startsWith('guest_')) {
          memberMap.set(normName, resolved);
        }
      }
    });

    const allMembers = Array.from(memberMap.values());

    // Sort: You first, then active/in_game, then offline
    return allMembers.sort((a, b) => {
      if (a.isYou) return -1;
      if (b.isYou) return 1;
      if (a.status !== 'offline' && b.status === 'offline') return -1;
      if (a.status === 'offline' && b.status !== 'offline') return 1;
      return 0;
    });
  }, [selectedGroup, currentUserId, currentUserName, profile.emoji, livePresences]);

  const filteredMembers = resolvedMembers.filter((m) => {
    if (memberFilter === 'all') return true;
    return m.status === memberFilter;
  });

  const onlineMembersCount = resolvedMembers.filter((m) => m.status === 'online').length;
  const inGameMembersCount = resolvedMembers.filter((m) => m.status === 'in_game').length;
  const offlineMembersCount = resolvedMembers.filter((m) => m.status === 'offline').length;

  // Handle Copy Code or Link
  const handleCopyCode = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Handle Create Group
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setFeedbackMsg({ type: 'error', text: 'You must be signed in to create a group.' });
      setAuthModalMode('signin');
      setShowAuthModal(true);
      return;
    }

    const clean = groupNameInput.trim();
    if (!clean) {
      setFeedbackMsg({ type: 'error', text: 'Please enter a group name.' });
      return;
    }

    const newGroup = createGroup(currentUserId, currentUserName, clean, profile.emoji);
    setGroups(getUserGroups(currentUserId, currentUserName));
    setGroupNameInput('');
    setSelectedGroupId(newGroup.id);
    setActiveTab('my_groups');
    setFeedbackMsg({ type: 'success', text: `Group "${newGroup.name}" created!` });
  };

  // Handle Join Group by Code
  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setFeedbackMsg({ type: 'error', text: 'You must be signed in to join a group.' });
      setAuthModalMode('signin');
      setShowAuthModal(true);
      return;
    }

    const clean = groupCodeInput.trim().toUpperCase();
    if (!clean) {
      setFeedbackMsg({ type: 'error', text: 'Please enter a valid invite code.' });
      return;
    }

    setIsJoining(true);
    try {
      const res = await joinGroupByCodeAsync(currentUserId, currentUserName, clean, profile.emoji);
      if (res.success && res.group) {
        setGroups(getUserGroups(currentUserId, currentUserName));
        setGroupCodeInput('');
        setSelectedGroupId(res.group.id);
        setActiveTab('my_groups');
        setFeedbackMsg({ type: 'success', text: `Successfully joined "${res.group.name}"!` });
      } else {
        setFeedbackMsg({ type: 'error', text: res.error || 'Failed to join group.' });
      }
    } finally {
      setIsJoining(false);
    }
  };

  // Handle Leave Group
  const handleLeaveGroup = (groupId: string) => {
    const updated = leaveGroup(currentUserId, currentUserName, groupId);
    setGroups(updated);
    setSelectedGroupId(null);
    setFeedbackMsg({ type: 'success', text: 'You left the group.' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-zinc-800/80 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {selectedGroupId ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedGroupId(null);
                  setFeedbackMsg(null);
                }}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white transition-colors tap-bounce"
                title="Back to My Groups"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <Users className="w-4 h-4" />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                {selectedGroup ? selectedGroup.name : 'Friend Groups'}
                {!selectedGroup && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300 border border-sky-400/30">
                    Direct Challenge
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                {selectedGroup
                  ? `${resolvedMembers.length} ${resolvedMembers.length === 1 ? 'member' : 'members'} · Click Challenge to play`
                  : 'Join friends once, challenge each other anytime.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMsg && (
          <div
            className={`mt-3 p-2.5 rounded-xl text-xs flex items-center justify-between ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-red-950/70 border border-rose-300 dark:border-red-500/40 text-rose-800 dark:text-red-300'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="overflow-y-auto py-3 space-y-3.5 pr-1">
          {/* Sign In Prompt if user is not registered */}
          {!user && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-gradient-to-br dark:from-blue-950/40 dark:via-zinc-900 dark:to-zinc-900 border border-slate-200 dark:border-blue-500/30 space-y-2.5 shadow-sm">
              <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400">
                <Lock className="w-4 h-4" />
                <h4 className="font-bold text-xs text-slate-900 dark:text-zinc-100">Sign in to sync your groups</h4>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-relaxed">
                Create an account or sign in so your friends can see when you are online and challenge you directly.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('signup');
                    setShowAuthModal(true);
                  }}
                  className="py-1.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md tap-bounce transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('signin');
                    setShowAuthModal(true);
                  }}
                  className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 tap-bounce border border-slate-200 dark:border-zinc-700/80 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                  Sign In
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VIEW 1: MY GROUPS LIST */}
          {/* ========================================================= */}
          {!selectedGroup && (
            <>
              {/* Tabs: My Groups | + Create | Join Code */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800/80 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('my_groups')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-all tap-bounce ${
                    activeTab === 'my_groups'
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-sm'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  My Groups ({groups.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-all tap-bounce ${
                    activeTab === 'create'
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-sm'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  + Create
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('join')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-all tap-bounce ${
                    activeTab === 'join'
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-sm'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  Join Code
                </button>
              </div>

              {/* Tab: Groups List */}
              {activeTab === 'my_groups' && (
                <div className="space-y-2.5">
                  {groups.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-center space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-full bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                        No Friend Groups Yet
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mx-auto">
                        Create a group to invite your friends, or join an existing circle using an invite code.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!user) {
                              setAuthModalMode('signin');
                              setShowAuthModal(true);
                            } else {
                              setActiveTab('create');
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md tap-bounce"
                        >
                          {!user ? 'Sign In to Create' : '+ Create Group'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!user) {
                              setAuthModalMode('signin');
                              setShowAuthModal(true);
                            } else {
                              setActiveTab('join');
                            }
                          }}
                          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold text-xs border border-slate-200 dark:border-zinc-700/60 tap-bounce"
                        >
                          Join with Code
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 px-1 flex items-center justify-between">
                        <span>Your Circles:</span>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">Tap to open</span>
                      </div>

                      {groups.map((group) => {
                        return (
                          <div
                            key={group.id}
                            onClick={() => {
                              setSelectedGroupId(group.id);
                              setFeedbackMsg(null);
                            }}
                            className="group p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-850 border border-slate-200 dark:border-zinc-800/80 hover:border-sky-400/50 dark:hover:border-sky-500/40 transition-all cursor-pointer flex items-center justify-between gap-3 tap-bounce shadow-sm"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-xl flex-shrink-0 group-hover:scale-105 transition-transform">
                                {group.icon || '🛡️'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-zinc-100 truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                  {group.name}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-zinc-400">
                                  <span>{group.members.length} members</span>
                                  <span>•</span>
                                  <span className="font-mono text-slate-400 dark:text-zinc-500">
                                    {group.code}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Create Group */}
              {activeTab === 'create' && (
                !user ? (
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                      Sign in to create a group
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mx-auto">
                      You must have an account to create and manage friend circles.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalMode('signin');
                          setShowAuthModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md tap-bounce"
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalMode('signup');
                          setShowAuthModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs tap-bounce"
                      >
                        Register
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleCreateGroup} className="space-y-3 p-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                        Group Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Office Colleagues, Family Match"
                        value={groupNameInput}
                        onChange={(e) => setGroupNameInput(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
                      />
                      <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1">
                        An invite code will be automatically generated so your friends can join this group.
                      </p>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 tap-bounce shadow-md"
                    >
                      <Plus className="w-4 h-4" />
                      Create Group & Open
                    </button>
                  </form>
                )
              )}

              {/* Tab: Join Code */}
              {activeTab === 'join' && (
                !user ? (
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-full bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                      Sign in to join a group
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mx-auto">
                      You must have an account to join friend circles and challenge other players.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalMode('signin');
                          setShowAuthModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-md tap-bounce"
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalMode('signup');
                          setShowAuthModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs tap-bounce"
                      >
                        Register
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleJoinGroup} className="space-y-3 p-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                        Enter Group Invite Code
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. FAMILY-42"
                        value={groupCodeInput}
                        onChange={(e) => setGroupCodeInput(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 text-xs font-mono uppercase text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
                      />
                      <p className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1">
                        Enter the invite code shared by the group creator.
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={isJoining}
                      className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 tap-bounce shadow-md disabled:opacity-50"
                    >
                      <ArrowRight className="w-4 h-4" />
                      {isJoining ? 'Joining Group...' : 'Join Group'}
                    </button>
                  </form>
                )
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* VIEW 2: GROUP DETAILS & REAL MEMBERS */}
          {/* ========================================================= */}
          {selectedGroup && (
            <div className="space-y-3">
              {/* Group Info & Invite Code Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-xl flex-shrink-0">
                    {selectedGroup.icon || '🛡️'}
                  </div>
                  <div className="truncate">
                    {/* The group name is prominently shown */}
                    <div className="font-bold text-sm text-slate-900 dark:text-zinc-100 truncate">
                      {selectedGroup.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                      <span>Invite Code:</span>
                      <span className="font-mono font-bold text-sky-600 dark:text-sky-400 tracking-wider">
                        {selectedGroup.code}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyCode(selectedGroup.code)}
                  className="py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 font-semibold text-[11px] flex items-center gap-1 tap-bounce border border-slate-200 dark:border-zinc-700/60 shadow-sm"
                  title="Copy Invite Code"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setMemberFilter('all')}
                  className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                    memberFilter === 'all'
                      ? 'bg-slate-900 text-white dark:bg-zinc-200 dark:text-zinc-950 font-bold'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  All ({resolvedMembers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMemberFilter('online')}
                  className={`px-2.5 py-1 rounded-full font-medium flex items-center gap-1 transition-all ${
                    memberFilter === 'online'
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  Online ({onlineMembersCount})
                </button>
                <button
                  type="button"
                  onClick={() => setMemberFilter('in_game')}
                  className={`px-2.5 py-1 rounded-full font-medium flex items-center gap-1 transition-all ${
                    memberFilter === 'in_game'
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  In-Game ({inGameMembersCount})
                </button>
                <button
                  type="button"
                  onClick={() => setMemberFilter('offline')}
                  className={`px-2.5 py-1 rounded-full font-medium flex items-center gap-1 transition-all ${
                    memberFilter === 'offline'
                      ? 'bg-slate-300 dark:bg-zinc-700 text-slate-900 dark:text-zinc-200 font-bold'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-500" />
                  Offline ({offlineMembersCount})
                </button>
              </div>

              {/* Members List (Only real members) */}
              <div className="divide-y divide-slate-200 dark:divide-zinc-800/60 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                {filteredMembers.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-zinc-500">
                    No members currently {memberFilter.replace('_', ' ')}.
                  </div>
                ) : (
                  filteredMembers.map((member) => {
                    const isOnline = member.status === 'online';
                    const isInGame = member.status === 'in_game';
                    const isOffline = member.status === 'offline';

                    return (
                      <div
                        key={member.id}
                        className="p-3 flex items-center justify-between gap-2 hover:bg-slate-100/60 dark:hover:bg-zinc-900/50 transition-colors"
                      >
                        {/* Member Identity & Status Indicator */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative flex-shrink-0">
                            <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center font-bold text-sm text-slate-800 dark:text-zinc-200 shadow-sm">
                              {member.emoji ? (
                                <span className="text-base leading-none select-none">{member.emoji}</span>
                              ) : (
                                member.name[0]?.toUpperCase() || 'P'
                              )}
                            </div>

                            {/* Status Dot */}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-zinc-950 ${
                                isOnline
                                  ? 'bg-emerald-500 dark:bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                                  : isInGame
                                  ? 'bg-amber-400 animate-pulse'
                                  : 'bg-slate-400 dark:bg-zinc-600'
                              }`}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="font-bold text-xs text-slate-900 dark:text-zinc-200 flex items-center gap-1.5 truncate">
                              <span className="truncate">{member.name}</span>
                              {member.isYou && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-300 border border-sky-400/30">
                                  You
                                </span>
                              )}
                              {member.role === 'leader' && (
                                <span className="text-[9px] font-semibold px-1 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-400/20">
                                  Leader
                                </span>
                              )}
                            </div>

                            <div className="text-[10px] mt-0.5 flex items-center gap-1">
                              {isOnline && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                  🟢 Online · Ready to play
                                </span>
                              )}
                              {isInGame && (
                                <span className="text-amber-600 dark:text-amber-400 font-medium">
                                  🟡 In-Game · Playing match
                                </span>
                              )}
                              {isOffline && (
                                <span className="text-slate-400 dark:text-zinc-500">
                                  ⚫ Offline {member.lastActive ? `· ${member.lastActive}` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action: Challenge */}
                        {!member.isYou ? (
                          <div>
                            {isOnline ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onChallengePlayer) {
                                    onChallengePlayer(member, selectedGroup || undefined);
                                    onClose();
                                  } else if (onStartOnlineMatch) {
                                    onStartOnlineMatch(member.name);
                                    onClose();
                                  }
                                }}
                                className="py-1.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center gap-1.5 shadow-md tap-bounce transition-all"
                              >
                                <Swords className="w-3.5 h-3.5" />
                                <span>Challenge</span>
                              </button>
                            ) : isInGame ? (
                              <span className="py-1 px-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/20 text-[10px] font-semibold flex items-center gap-1">
                                <Gamepad2 className="w-3 h-3" />
                                In Match
                              </span>
                            ) : (
                              <span className="py-1 px-2.5 rounded-lg bg-slate-100 dark:bg-zinc-900 text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-zinc-800 text-[10px] font-semibold">
                                Offline
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 px-2">
                            Current Player
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Group Footer Controls: Invite & Leave */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => handleCopyCode(selectedGroup.code)}
                  className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                >
                  <Share2 className="w-3 h-3" />
                  Invite friends to this group
                </button>

                <button
                  type="button"
                  onClick={() => handleLeaveGroup(selectedGroup.id)}
                  className="text-rose-600 dark:text-red-400/80 hover:text-rose-700 dark:hover:text-red-300 text-[11px] font-semibold flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="w-3 h-3" />
                  Leave Group
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-200 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-500 flex-shrink-0">
          <span>Realtime Matchmaking</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* In-Website Registration & Sign In Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authModalMode}
      />
    </div>
  );
};
