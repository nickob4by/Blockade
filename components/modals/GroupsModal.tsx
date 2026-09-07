'use client';

import React, { useState } from 'react';
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
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { AuthModal } from './AuthModal';

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
  const [activeTab, setActiveTab] = useState<'my_groups' | 'create' | 'join'>('my_groups');
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');

  // Mock initial demo group so user can immediately experience the UI
  const demoMembers = [
    { id: '1', name: 'Alex_Tactics', status: 'online', isYou: false },
    { id: '2', name: profile.name || 'You', status: 'online', isYou: true },
    { id: '3', name: 'BoardMaster99', status: 'in_game', isYou: false },
    { id: '4', name: 'Sara_Block', status: 'offline', isYou: false },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-1.5">
                Friend Groups
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
                  No Codes Needed
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Join a group once, play friends anytime with 1 tap.
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

        {/* Content Body */}
        <div className="overflow-y-auto py-4 space-y-4 pr-1">
          {/* Sign In Prompt if user is a guest */}
          {!user ? (
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/40 via-zinc-900 to-zinc-900 border border-blue-500/30 text-center space-y-3 shadow-lg">
              <div className="w-10 h-10 mx-auto rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-zinc-100">Account Required for Groups</h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-[280px] mx-auto">
                  Create an account or sign in so your friends can see when you are online and challenge you directly.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('signup');
                    setShowAuthModal(true);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md tap-bounce transition-all"
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
                  className="py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 tap-bounce border border-zinc-700/80 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 text-sky-400" />
                  Sign In
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="w-8 h-8 rounded-full border border-sky-400/40"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center font-bold text-sky-300">
                    {profile.name[0]}
                  </div>
                )}
                <div>
                  <div className="font-bold text-zinc-100">{profile.name}</div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Online & Ready
                  </div>
                </div>
              </div>
              <div className="text-[10px] font-semibold text-zinc-400 bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800">
                Google Verified
              </div>
            </div>
          )}

          {/* Group Tabs */}
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
              Group Lobby
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

          {/* Tab 1: Group Lobby & Member Challenge List */}
          {activeTab === 'my_groups' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs px-1">
                <span className="font-bold text-zinc-300">Circle: ⚔️ Blockade Warriors</span>
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/80 px-1.5 py-0.5 rounded border border-zinc-700/50">
                  CODE: WARRIORS-9
                </span>
              </div>

              <div className="divide-y divide-zinc-800/60 rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
                {demoMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-2.5 sm:p-3 flex items-center justify-between gap-2 hover:bg-zinc-900/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-200">
                          {member.name[0]}
                        </div>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${
                            member.status === 'online'
                              ? 'bg-emerald-400'
                              : member.status === 'in_game'
                              ? 'bg-amber-400 animate-pulse'
                              : 'bg-zinc-600'
                          }`}
                        />
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-xs text-zinc-200 flex items-center gap-1.5">
                          <span className="truncate">{member.name}</span>
                          {member.isYou && (
                            <span className="text-[9px] font-semibold px-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          {member.status === 'online'
                            ? '🟢 Available for match'
                            : member.status === 'in_game'
                            ? '🟡 Currently in game'
                            : '⚫ Offline'}
                        </div>
                      </div>
                    </div>

                    {!member.isYou && (
                      <button
                        type="button"
                        disabled={member.status !== 'online'}
                        onClick={() => {
                          if (onStartOnlineMatch) {
                            onStartOnlineMatch(member.name);
                            onClose();
                          }
                        }}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all tap-bounce ${
                          member.status === 'online'
                            ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-md'
                            : 'bg-zinc-800/60 text-zinc-500 cursor-not-allowed border border-zinc-800'
                        }`}
                      >
                        <Swords className="w-3.5 h-3.5" />
                        Challenge
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 2: Create Group */}
          {activeTab === 'create' && (
            <div className="space-y-3 p-1">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g. Office Colleagues, Family Match"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (groupName.trim()) {
                    setActiveTab('my_groups');
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 tap-bounce shadow-md"
              >
                <Plus className="w-4 h-4" />
                Create Group & Invite Friends
              </button>
            </div>
          )}

          {/* Tab 3: Join Group via Code */}
          {activeTab === 'join' && (
            <div className="space-y-3 p-1">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Enter Group Invite Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. WARRIORS-9"
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono uppercase text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Once you join, this group is permanently saved to your account!
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (groupCode.trim()) {
                    setActiveTab('my_groups');
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 tap-bounce shadow-md"
              >
                <ArrowRight className="w-4 h-4" />
                Join Group
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Realtime Matchmaking</span>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            Close
          </button>
        </div>
      </div>

      {/* Simple In-Website Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authModalMode}
      />
    </div>
  );
};
