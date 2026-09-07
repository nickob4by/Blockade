'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { sounds } from '@/lib/audio/sounds';
import {
  Bot,
  Users,
  Globe,
  Sparkles,
  BookOpen,
  Volume2,
  VolumeX,
  LogIn,
  LogOut,
  Swords,
  ShieldAlert,
  ArrowRight,
  Zap,
  User,
  UserPlus,
  Settings,
  Sun,
  Moon,
} from 'lucide-react';
import { AuthModal } from '@/components/modals/AuthModal';
import { SettingsModal } from '@/components/modals/SettingsModal';

interface MainMenuProps {
  onSelectMode: (mode: 'ai' | 'local' | 'online') => void;
  onOpenRules: () => void;
  onOpenGroups: () => void;
  onOpenOnlineLobby: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onSelectMode,
  onOpenRules,
  onOpenGroups,
  onOpenOnlineLobby,
}) => {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signup');

  const handleToggleSound = () => {
    const isEnabled = sounds.toggleSound();
    setSoundEnabled(isEnabled);
  };

  return (
    <div className="w-full h-full min-h-[100dvh] flex flex-col justify-between items-center px-4 py-4 sm:py-6 max-w-md mx-auto select-none text-slate-800 dark:text-zinc-100">
      {/* 1. Top Navbar: Brand & Auth Profile */}
      <header className="w-full flex items-center justify-between gap-2 pt-safe pb-2 border-b border-slate-200 dark:border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 border border-white/20 flex items-center justify-center font-black text-white text-base shadow-tactile-sm">
            B
          </div>
          <span className="font-extrabold text-base tracking-wider uppercase bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-zinc-100 dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent">
            Blockade
          </span>
        </div>

        {/* User Account / Sign-In Chip & Theme Switcher */}
        <div className="flex items-center gap-2">
          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-1.5 rounded-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-sm tap-bounce"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 pl-2 pr-1.5 py-1 rounded-full shadow-sm">
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-1.5 text-left hover:opacity-85 transition-opacity"
                title="Open Player Settings"
              >
                <div className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-300 font-bold text-[10px] flex items-center justify-center border border-sky-400/30">
                  {profile.emoji ? (
                    <span className="text-xs leading-none select-none">{profile.emoji}</span>
                  ) : (
                    profile.name[0]?.toUpperCase()
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200 max-w-[85px] sm:max-w-[110px] truncate">
                  {profile.name}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                title="Player Settings"
                className="text-slate-400 hover:text-sky-600 dark:text-zinc-400 dark:hover:text-sky-300 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full p-1 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => signOut()}
                title="Sign Out"
                className="text-slate-400 hover:text-rose-500 dark:text-zinc-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full p-1 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('signin');
                  setShowAuthModal(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/80 text-xs font-semibold shadow-sm transition-all tap-bounce"
              >
                <LogIn className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('signup');
                  setShowAuthModal(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold shadow-md transition-all tap-bounce"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. Hero Section */}
      <div className="my-auto w-full flex flex-col items-center text-center py-4 space-y-6">
        {/* Title & Tagline */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-sky-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Tactical Quoridor Grid Strategy
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            RACE. BLOCK. <span className="text-blue-600 dark:text-sky-400">WIN.</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-[320px] mx-auto">
            Sprint to the opposing finish line while tactically erecting wall barriers to trap your opponent.
          </p>
        </div>

        {/* 3. Game Mode Action Cards */}
        <div className="w-full space-y-3">
          {/* Card 1: Play vs AI */}
          <button
            type="button"
            onClick={() => onSelectMode('ai')}
            className="w-full group p-4 rounded-2xl bg-white dark:bg-zinc-900/90 hover:bg-slate-50 dark:hover:bg-zinc-850 border border-slate-200 dark:border-zinc-800 hover:border-sky-500/50 shadow-md dark:shadow-xl transition-all duration-150 flex items-center justify-between text-left tap-bounce"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/30 flex items-center justify-center text-rose-500 dark:text-rose-400 group-hover:scale-105 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-sm sm:text-base text-slate-800 dark:text-zinc-100 group-hover:text-slate-950 dark:group-hover:text-white flex items-center gap-1.5">
                  Play vs AI
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30">
                    Solo
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Single player match against the smart computer bot.
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 dark:text-zinc-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Card 2: Pass & Play (Local 2P) */}
          <button
            type="button"
            onClick={() => onSelectMode('local')}
            className="w-full group p-4 rounded-2xl bg-white dark:bg-zinc-900/90 hover:bg-slate-50 dark:hover:bg-zinc-850 border border-slate-200 dark:border-zinc-800 hover:border-blue-500/50 shadow-md dark:shadow-xl transition-all duration-150 flex items-center justify-between text-left tap-bounce"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-600/10 border border-blue-500/30 flex items-center justify-center text-blue-500 dark:text-blue-400 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-sm sm:text-base text-slate-800 dark:text-zinc-100 group-hover:text-slate-950 dark:group-hover:text-white flex items-center gap-1.5">
                  Pass & Play (Local 2P)
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-500/30">
                    1 Phone
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Head-to-head match with a friend on the same device.
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-400 dark:text-zinc-500 group-hover:text-sky-500 dark:group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Card 3: Play with Friends (Online Hub) */}
          <div className="w-full p-4 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-zinc-900/95 dark:via-zinc-900/90 dark:to-slate-900 border border-slate-200 dark:border-zinc-800 shadow-md dark:shadow-xl text-left space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-sm sm:text-base text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                    Play with Friends
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30">
                      Online
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    Multiplayer over the internet.
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-actions for Online */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              {/* Option A: Groups (No codes needed) */}
              <button
                type="button"
                onClick={onOpenGroups}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-sky-500/30 text-left transition-all tap-bounce group"
              >
                <div className="flex items-center justify-between text-blue-500 dark:text-sky-400 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-[9px] font-bold uppercase bg-sky-500/20 px-1.5 py-0.2 rounded text-blue-600 dark:text-sky-300">
                    Groups
                  </span>
                </div>
                <div className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-slate-950 dark:group-hover:text-white">
                  Friend Groups
                </div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight mt-0.5">
                  Play friends without sending codes
                </div>
              </button>

              {/* Option B: Room Code & Link */}
              <button
                type="button"
                onClick={onOpenOnlineLobby}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/80 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 text-left transition-all tap-bounce group"
              >
                <div className="flex items-center justify-between text-emerald-500 dark:text-emerald-400 mb-1">
                  <Zap className="w-4 h-4" />
                  <span className="text-[9px] font-bold uppercase bg-slate-200 dark:bg-zinc-700/60 px-1.5 py-0.2 rounded text-slate-700 dark:text-zinc-300">
                    Code
                  </span>
                </div>
                <div className="font-bold text-xs text-slate-800 dark:text-zinc-200 group-hover:text-slate-950 dark:group-hover:text-white">
                  Room Code
                </div>
                <div className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight mt-0.5">
                  Create room & send 6-letter invite
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Footer Toolbar */}
      <footer className="w-full flex items-center justify-between pt-3 pb-safe border-t border-zinc-800/80 text-xs text-zinc-400">
        <button
          type="button"
          onClick={onOpenRules}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors tap-bounce"
        >
          <BookOpen className="w-4 h-4 text-sky-400" />
          <span>Rules & Guide</span>
        </button>

        <button
          type="button"
          onClick={handleToggleSound}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-zinc-800/60 hover:text-zinc-200 transition-colors tap-bounce"
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>Sound On</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 text-zinc-500" />
              <span>Muted</span>
            </>
          )}
        </button>
      </footer>

      {/* In-Website Registration & Sign In Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        defaultMode={authModalMode}
      />

      {/* Player Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </div>
  );
};
