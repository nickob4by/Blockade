'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  User,
  ShieldAlert,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface AuthSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMessage?: string | null;
}

export const AuthSetupModal: React.FC<AuthSetupModalProps> = ({
  isOpen,
  onClose,
  errorMessage,
}) => {
  const { profile, setGuestName } = useAuth();
  const [customName, setCustomName] = useState(profile.name || 'Player 1');
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const callbackUrl = 'https://ckaltvgkapwwhfmmjofs.supabase.co/auth/v1/callback';

  const handleCopyCallback = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (customName.trim()) {
      setGuestName(customName.trim());
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col max-h-[90dvh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-1.5">
                Google Sign-In Setup
              </h3>
              <p className="text-[11px] text-zinc-400">
                Supabase OAuth Provider Configuration
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

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-4 space-y-4 pr-1 text-xs">
          {/* Error Banner */}
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-xs">
              <span>⚠️ Provider Not Enabled in Supabase</span>
            </div>
            <p className="text-[11px] text-amber-300/90 leading-relaxed">
              Supabase returned: <code className="bg-amber-950/80 px-1 py-0.5 rounded font-mono text-[10px]">{errorMessage || '400: unsupported provider'}</code>.
              Google OAuth needs to be toggled ON in your Supabase dashboard.
            </p>
          </div>

          {/* Quick Option 1: Customize Your Player Name Right Now */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                <User className="w-4 h-4 text-sky-400" />
                Play Immediately as Custom Player
              </div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                Instant
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              You do not have to wait for Google OAuth! Set your player name now and it will appear on your cards, lobbies, and game board:
            </p>

            <form onSubmit={handleSaveProfile} className="flex gap-2">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter your player name..."
                maxLength={20}
                className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="py-2 px-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center gap-1 tap-bounce shadow-md"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    Saved!
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </form>
          </div>

          {/* Option 2: How to Enable Google OAuth in Supabase */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              How to Enable Google Provider (2 Mins)
            </div>

            <ol className="list-decimal list-inside space-y-2 text-zinc-300 text-[11px] leading-relaxed">
              <li>
                Open your Supabase Project:{' '}
                <a
                  href="https://supabase.com/dashboard/project/ckaltvgkapwwhfmmjofs/auth/providers"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:underline inline-flex items-center gap-0.5 font-semibold"
                >
                  Auth Providers Dashboard <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                Scroll to <strong>Google</strong> and toggle <strong>Enable Google provider</strong> to <strong>ON</strong>.
              </li>
              <li>
                Paste your <strong>Client ID</strong> and <strong>Client Secret</strong> from Google Cloud Console.
              </li>
              <li>
                In your Google Cloud Console OAuth credentials, paste this <strong>Authorized Redirect URI</strong>:
              </li>
            </ol>

            {/* Copyable Redirect URI */}
            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2">
              <code className="text-[10px] font-mono text-zinc-300 truncate select-all">
                {callbackUrl}
              </code>
              <button
                type="button"
                onClick={handleCopyCallback}
                className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex-shrink-0 transition-colors"
                title="Copy Callback URL"
              >
                {copiedCallback ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Blockade Auth System</span>
          <button
            type="button"
            onClick={onClose}
            className="py-1 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
