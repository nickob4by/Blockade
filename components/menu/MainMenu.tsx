'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
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
} from 'lucide-react';

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
  const { user, profile, signInWithGoogle, signOut, isLoading, isConfigured } = useAuth();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleToggleSound = () => {
    const isEnabled = sounds.toggleSound();
    setSoundEnabled(isEnabled);
  };

  const handleGoogleSignIn = async () => {
    try {
      setSigningIn(true);
      setAuthError(null);
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setAuthError(err?.message || 'Could not initiate Google Sign-In');
    } finally {
      setSigningIn(false);
    }
  };

  return (
    <div className="w-full h-full min-h-[100dvh] flex flex-col justify-between items-center px-4 py-4 sm:py-6 max-w-md mx-auto select-none">
      {/* 1. Top Navbar: Brand & Auth Profile */}
      <header className="w-full flex items-center justify-between gap-2 pt-safe pb-2 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-sky-500 border border-white/20 flex items-center justify-center font-black text-white text-base shadow-tactile-sm">
            B
          </div>
          <span className="font-extrabold text-base tracking-wider uppercase bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Blockade
          </span>
        </div>

        {/* User Account / Google Sign-In Chip */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 px-2.5 py-1 rounded-full shadow-sm">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  className="w-5 h-5 rounded-full border border-sky-400/40"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-bold text-[10px] flex items-center justify-center">
                  {profile.name[0]}
                </div>
              )}
              <span className="text-xs font-semibold text-zinc-200 max-w-[90px] truncate">
                {profile.name}
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                title="Sign Out"
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={signingIn || isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 text-xs font-semibold shadow-sm transition-all tap-bounce"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{signingIn ? 'Connecting...' : 'Google Sign-In'}</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Hero Section */}
      <div className="my-auto w-full flex flex-col items-center text-center py-4 space-y-6">
        {/* Title & Tagline */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-sky-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Tactical Quoridor Grid Strategy
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            RACE. BLOCK. <span className="text-sky-400">WIN.</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-[320px] mx-auto">
            Sprint to the opposing finish line while tactically erecting wall barriers to trap your opponent.
          </p>
        </div>

        {/* 3. Game Mode Action Cards */}
        <div className="w-full space-y-3">
          {/* Card 1: Play vs AI */}
          <button
            type="button"
            onClick={() => onSelectMode('ai')}
            className="w-full group p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-sky-500/50 shadow-xl transition-all duration-150 flex items-center justify-between text-left tap-bounce"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-600/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-sm sm:text-base text-zinc-100 group-hover:text-white flex items-center gap-1.5">
                  Play vs AI
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/30">
                    Solo
                  </span>
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Single player match against the smart computer bot.
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Card 2: Pass & Play (Local 2P) */}
          <button
            type="button"
            onClick={() => onSelectMode('local')}
            className="w-full group p-4 rounded-2xl bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-blue-500/50 shadow-xl transition-all duration-150 flex items-center justify-between text-left tap-bounce"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-sky-600/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-sm sm:text-base text-zinc-100 group-hover:text-white flex items-center gap-1.5">
                  Pass & Play (Local 2P)
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-500/30">
                    1 Phone
                  </span>
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Head-to-head match with a friend on the same device.
                </div>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-zinc-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* Card 3: Play with Friends (Online Hub) */}
          <div className="w-full p-4 rounded-2xl bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-slate-900 border border-zinc-800 shadow-xl text-left space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-sm sm:text-base text-zinc-100 flex items-center gap-1.5">
                    Play with Friends
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                      Online
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
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
                className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-sky-500/30 text-left transition-all tap-bounce group"
              >
                <div className="flex items-center justify-between text-sky-400 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-[9px] font-bold uppercase bg-sky-500/20 px-1.5 py-0.2 rounded text-sky-300">
                    Groups
                  </span>
                </div>
                <div className="font-bold text-xs text-zinc-200 group-hover:text-white">
                  Friend Groups
                </div>
                <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
                  Play friends without sending codes
                </div>
              </button>

              {/* Option B: Room Code & Link */}
              <button
                type="button"
                onClick={onOpenOnlineLobby}
                className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/80 text-left transition-all tap-bounce group"
              >
                <div className="flex items-center justify-between text-emerald-400 mb-1">
                  <Zap className="w-4 h-4" />
                  <span className="text-[9px] font-bold uppercase bg-zinc-700/60 px-1.5 py-0.2 rounded text-zinc-300">
                    Code
                  </span>
                </div>
                <div className="font-bold text-xs text-zinc-200 group-hover:text-white">
                  Room Code
                </div>
                <div className="text-[10px] text-zinc-400 leading-tight mt-0.5">
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
    </div>
  );
};
