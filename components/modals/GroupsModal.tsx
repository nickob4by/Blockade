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
  joinGroupByCode,
  leaveGroup,
  subscribeToGroupPresence,
} from '@/lib/groups/groupService';

interface GroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartOnlineMatch?: (opponentName: string) => void;
}

export const GroupsModal: React.FC<GroupsModalProps> = ({
  isOpen,
  onClose,
  onStartOnlineMatch,
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
  const [livePresences, setLivePresences] = useState<Record<string, { name: string; status: MemberStatus }>>({});

  const currentUserId = user?.id || profile.id || 'guest_user';
  const currentUserName = profile.name || 'Player 1';

  // Load groups when modal opens or user changes
  useEffect(() => {
    if (isOpen) {
      const userGroups = getUserGroups(currentUserId, currentUserName);
      setGroups(userGroups);
      setFeedbackMsg(null);
    }
  }, [isOpen, currentUserId, currentUserName]);

  // Selected group object
  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return groups.find((g) => g.id === selectedGroupId) || null;
  }, [groups, selectedGroupId]);

  // Subscribe to real-time presence when a group is selected
  useEffect(() => {
    if (!selectedGroup || !user) {
      setLivePresences({});
      return;
    }

    const { unsubscribe } = subscribeToGroupPresence(
      selectedGroup.code,
      {
        id: currentUserId,
        name: currentUserName,
        status: 'online',
      },
      (presences) => {
        setLivePresences(presences);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [selectedGroup?.code, user, currentUserId, currentUserName]);

  if (!isOpen) return null;

  // Handle Copy Code to Clipboard
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
    const clean = groupNameInput.trim();
    if (!clean) {
      setFeedbackMsg({ type: 'error', text: 'Please enter a group name.' });
      return;
    }

    const newGroup = createGroup(currentUserId, currentUserName, clean);
    setGroups(getUserGroups(currentUserId, currentUserName));
    setGroupNameInput('');
    setSelectedGroupId(newGroup.id);
    setActiveTab('my_groups');
    setFeedbackMsg({ type: 'success', text: `Group "${newGroup.name}" created!` });
  };

  // Handle Join Group by Code
  const handleJoinGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = groupCodeInput.trim().toUpperCase();
    if (!clean) {
      setFeedbackMsg({ type: 'error', text: 'Please enter a valid invite code.' });
      return;
    }

    const res = joinGroupByCode(currentUserId, currentUserName, clean);
    if (res.success && res.group) {
      setGroups(getUserGroups(currentUserId, currentUserName));
      setGroupCodeInput('');
      setSelectedGroupId(res.group.id);
      setActiveTab('my_groups');
      setFeedbackMsg({ type: 'success', text: `Joined ${res.group.name}!` });
    } else {
      setFeedbackMsg({ type: 'error', text: res.error || 'Failed to join group.' });
    }
  };

  // Handle Leave Group
  const handleLeaveGroup = (groupId: string) => {
    const updated = leaveGroup(currentUserId, currentUserName, groupId);
    setGroups(updated);
    setSelectedGroupId(null);
    setFeedbackMsg({ type: 'success', text: 'You left the group.' });
  };

  // Calculate live members for selected group
  const resolvedMembers: GroupMember[] = selectedGroup
    ? selectedGroup.members.map((member) => {
        if (member.isYou) {
          return { ...member, status: 'online' };
        }
        const live =
          livePresences[member.id] ||
          Object.values(livePresences).find(
            (p) => p.name.toLowerCase() === member.name.toLowerCase()
          );
        return {
          ...member,
          status: live ? live.status : member.status,
        };
      })
    : [];

  const filteredMembers = resolvedMembers.filter((m) => {
    if (memberFilter === 'all') return true;
    return m.status === memberFilter;
  });

  const onlineMembersCount = resolvedMembers.filter((m) => m.status === 'online').length;
  const inGameMembersCount = resolvedMembers.filter((m) => m.status === 'in_game').length;
  const offlineMembersCount = resolvedMembers.filter((m) => m.status === 'offline').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {selectedGroupId ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedGroupId(null);
                  setFeedbackMsg(null);
                }}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors tap-bounce"
                title="Back to My Groups"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
                <Users className="w-4 h-4" />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-1.5">
                {selectedGroup ? selectedGroup.name : 'Friend Groups'}
                {!selectedGroup && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                    No Codes Needed
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {selectedGroup
                  ? `${resolvedMembers.length} members · Click Challenge to play`
                  : 'Join once, play friends anytime with 1 tap.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert Toast */}
        {feedbackMsg && (
          <div
            className={`mt-3 p-2.5 rounded-xl text-xs flex items-center justify-between ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/70 border border-red-500/40 text-red-300'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackMsg(null)}
              className="text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="overflow-y-auto py-3 space-y-3.5 pr-1">
          {/* Sign In Prompt if user is not registered */}
          {!user && (
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-950/40 via-zinc-900 to-zinc-900 border border-blue-500/30 space-y-2.5 shadow-lg">
              <div className="flex items-center gap-2 text-sky-400">
                <Lock className="w-4 h-4" />
                <h4 className="font-bold text-xs text-zinc-100">Sign in to save your groups & sync</h4>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
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
                  className="py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 tap-bounce border border-zinc-700/80 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-sky-400" />
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
              <div className="flex items-center gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-800/80 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('my_groups')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-all tap-bounce ${
                    activeTab === 'my_groups'
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  My Groups ({groups.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('create')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-all tap-bounce ${
                    activeTab === 'create'
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  + Create
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('join')}
                  className={`flex-1 py-1.5 rounded-lg font-semibold transition-all tap-bounce ${
                    activeTab === 'join'
                      ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Join Code
                </button>
              </div>

              {/* Tab: Groups List */}
              {activeTab === 'my_groups' && (
                <div className="space-y-2.5">
                  <div className="text-[11px] font-semibold text-zinc-400 px-1 flex items-center justify-between">
                    <span>Select a group to see who is online:</span>
                    <span className="text-[10px] text-zinc-500">Tap to open</span>
                  </div>

                  {groups.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 text-center space-y-2">
                      <Users className="w-8 h-8 mx-auto text-zinc-600" />
                      <p className="text-xs text-zinc-400">You haven't joined any groups yet.</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('create')}
                        className="text-xs font-bold text-sky-400 hover:underline inline-block"
                      >
                        Create your first group
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {groups.map((group) => {
                        const onlineCount = group.members.filter(
                          (m) => m.status === 'online' || m.isYou
                        ).length;
                        const inGameCount = group.members.filter(
                          (m) => m.status === 'in_game'
                        ).length;

                        return (
                          <div
                            key={group.id}
                            onClick={() => setSelectedGroupId(group.id)}
                            className="group p-3 sm:p-3.5 rounded-2xl bg-zinc-950 hover:bg-zinc-850/90 border border-zinc-800 hover:border-sky-500/50 cursor-pointer transition-all duration-150 flex items-center justify-between gap-3 shadow-md tap-bounce"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/30 flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-105 transition-transform">
                                {group.icon || '⚔️'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-xs sm:text-sm text-zinc-100 group-hover:text-white flex items-center gap-1.5 truncate">
                                  <span className="truncate">{group.name}</span>
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                                    {group.code}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400 flex-wrap">
                                  <span>{group.members.length} members</span>
                                  <span className="text-zinc-600">•</span>
                                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {onlineCount} Online
                                  </span>
                                  {inGameCount > 0 && (
                                    <>
                                      <span className="text-zinc-600">•</span>
                                      <span className="text-amber-400 font-medium flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                        {inGameCount} In-Game
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Create Group */}
              {activeTab === 'create' && (
                <form onSubmit={handleCreateGroup} className="space-y-3 p-1">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Group / Circle Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Office Colleagues, Family Match"
                      value={groupNameInput}
                      onChange={(e) => setGroupNameInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      A unique invite code will be automatically generated for your circle.
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
              )}

              {/* Tab: Join Code */}
              {activeTab === 'join' && (
                <form onSubmit={handleJoinGroup} className="space-y-3 p-1">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Enter Group Invite Code
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. WARRIORS-9 or CHAMPS-4"
                      value={groupCodeInput}
                      onChange={(e) => setGroupCodeInput(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono uppercase text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Once you join, this group is permanently pinned to your groups list!
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 tap-bounce shadow-md"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Join Group
                  </button>
                </form>
              )}
            </>
          )}

          {/* ========================================================= */}
          {/* VIEW 2: GROUP DETAILS & MEMBERS (ONLINE / IN-GAME / OFFLINE) */}
          {/* ========================================================= */}
          {selectedGroup && (
            <div className="space-y-3">
              {/* Group Info & Invite Code Banner */}
              <div className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl">{selectedGroup.icon || '🛡️'}</span>
                  <div className="truncate">
                    <div className="font-bold text-xs text-zinc-200 truncate">
                      {selectedGroup.name}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Code:{' '}
                      <span className="font-mono font-bold text-sky-400">
                        {selectedGroup.code}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyCode(selectedGroup.code)}
                  className="py-1.5 px-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-semibold text-[11px] flex items-center gap-1 tap-bounce border border-zinc-700/60"
                  title="Copy Invite Code"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copied!</span>
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
                      ? 'bg-zinc-200 text-zinc-950 font-bold'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All ({resolvedMembers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMemberFilter('online')}
                  className={`px-2.5 py-1 rounded-full font-medium flex items-center gap-1 transition-all ${
                    memberFilter === 'online'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Online ({onlineMembersCount})
                </button>
                <button
                  type="button"
                  onClick={() => setMemberFilter('in_game')}
                  className={`px-2.5 py-1 rounded-full font-medium flex items-center gap-1 transition-all ${
                    memberFilter === 'in_game'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
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
                      ? 'bg-zinc-700 text-zinc-200 border border-zinc-600 font-bold'
                      : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  Offline ({offlineMembersCount})
                </button>
              </div>

              {/* Members List */}
              <div className="divide-y divide-zinc-800/60 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                {filteredMembers.length === 0 ? (
                  <div className="p-5 text-center text-xs text-zinc-500">
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
                        className="p-3 flex items-center justify-between gap-2 hover:bg-zinc-900/50 transition-colors"
                      >
                        {/* Member Identity & Status Indicator */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative flex-shrink-0">
                            <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-200">
                              {member.name[0]?.toUpperCase() || 'P'}
                            </div>

                            {/* Status Dot */}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-950 ${
                                isOnline
                                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                                  : isInGame
                                  ? 'bg-amber-400 animate-pulse'
                                  : 'bg-zinc-600'
                              }`}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="font-bold text-xs text-zinc-200 flex items-center gap-1.5 truncate">
                              <span className="truncate">{member.name}</span>
                              {member.isYou && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                                  You
                                </span>
                              )}
                              {member.role === 'leader' && (
                                <span className="text-[9px] font-semibold px-1 rounded bg-amber-500/10 text-amber-300 border border-amber-400/20">
                                  Leader
                                </span>
                              )}
                            </div>

                            <div className="text-[10px] mt-0.5 flex items-center gap-1">
                              {isOnline && (
                                <span className="text-emerald-400 font-medium">
                                  🟢 Online · Ready to play
                                </span>
                              )}
                              {isInGame && (
                                <span className="text-amber-400 font-medium">
                                  🟡 In-Game · Playing match
                                </span>
                              )}
                              {isOffline && (
                                <span className="text-zinc-500">
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
                                  if (onStartOnlineMatch) {
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
                              <span className="py-1 px-2.5 rounded-lg bg-amber-950/40 text-amber-400 border border-amber-500/20 text-[10px] font-semibold flex items-center gap-1">
                                <Gamepad2 className="w-3 h-3" />
                                In Match
                              </span>
                            ) : (
                              <span className="py-1 px-2.5 rounded-lg bg-zinc-900 text-zinc-500 border border-zinc-800 text-[10px] font-semibold">
                                Offline
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-medium text-zinc-500 px-2">
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
                  className="text-sky-400 hover:underline flex items-center gap-1 text-[11px] font-semibold"
                >
                  <Share2 className="w-3 h-3" />
                  Invite friends to this group
                </button>

                <button
                  type="button"
                  onClick={() => handleLeaveGroup(selectedGroup.id)}
                  className="text-red-400/80 hover:text-red-300 text-[11px] font-semibold flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="w-3 h-3" />
                  Leave Group
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 flex-shrink-0">
          <span>Realtime Presence & Matchmaking</span>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
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
