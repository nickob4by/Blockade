'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  useAuth,
  RememberedAccount,
  getRememberedAccounts,
  removeRememberedAccount,
} from '@/lib/auth/AuthContext';
import {
  X,
  User,
  Lock,
  Sparkles,
  ArrowRight,
  Check,
  Loader2,
  LogIn,
  UserPlus,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'signup',
}) => {
  const { signIn, signUp, setGuestName, profile } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(defaultMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('👑');
  const [guestInput, setGuestInput] = useState(profile.name || 'Player 1');
  const [rememberMe, setRememberMe] = useState(true);
  const [rememberedAccounts, setRememberedAccounts] = useState<RememberedAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Sync mode, remembered accounts, and inputs whenever the modal opens or defaultMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(defaultMode);
      setErrorMsg(null);
      setSuccessMsg(null);
      setPassword('');
      const accounts = getRememberedAccounts();
      setRememberedAccounts(accounts);
      if (defaultMode === 'signin' && accounts.length > 0) {
        setUsername(accounts[0].username);
        setTimeout(() => passwordInputRef.current?.focus(), 150);
      } else {
        setUsername('');
      }
    }
  }, [isOpen, defaultMode]);

  const handleSwitchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPassword('');
    if (newMode === 'signin') {
      const accounts = getRememberedAccounts();
      setRememberedAccounts(accounts);
      if (accounts.length > 0) {
        setUsername(accounts[0].username);
        setTimeout(() => passwordInputRef.current?.focus(), 150);
      } else {
        setUsername('');
      }
    } else {
      setUsername('');
    }
  };

  const handleSelectAccount = (account: RememberedAccount) => {
    setUsername(account.username);
    setPassword('');
    setErrorMsg(null);
    setTimeout(() => passwordInputRef.current?.focus(), 50);
  };

  const handleForgetAccount = (usernameToForget: string) => {
    removeRememberedAccount(usernameToForget);
    const updated = getRememberedAccounts();
    setRememberedAccounts(updated);
    if (username.toLowerCase() === usernameToForget.toLowerCase()) {
      if (updated.length > 0) {
        setUsername(updated[0].username);
      } else {
        setUsername('');
      }
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setErrorMsg('Please enter a username.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(cleanUsername, password, cleanUsername, selectedEmoji, rememberMe);
        setSuccessMsg(`Welcome, ${cleanUsername}! Account created.`);
      } else {
        await signIn(cleanUsername, password, rememberMe);
        setSuccessMsg(`Welcome back, ${cleanUsername}!`);
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Auth Error:', err);
      let message = err?.message || 'Authentication failed. Please try again.';
      if (message.includes('User already registered')) {
        message = 'This username is already registered. Please sign in instead.';
      } else if (message.includes('Invalid login credentials')) {
        message = 'Incorrect username or password. Please try again.';
      }
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGuest = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = guestInput.trim();
    if (clean) {
      setGuestName(clean);
      setSuccessMsg(`Playing as ${clean}!`);
      setTimeout(() => {
        onClose();
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-400">
              {mode === 'signup' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">
                {mode === 'signup' ? 'Sign Up' : 'Sign In'}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {mode === 'signup'
                  ? 'Create an account to play & save groups'
                  : 'Welcome back to Blockade'}
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

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 mt-4 bg-zinc-950 rounded-xl border border-zinc-800/80 text-xs">
          <button
            type="button"
            onClick={() => handleSwitchMode('signup')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all tap-bounce ${
              mode === 'signup'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('signin')}
            className={`flex-1 py-1.5 rounded-lg font-semibold transition-all tap-bounce ${
              mode === 'signin'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto py-3 space-y-3">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-500/40 text-[11px] text-red-300 animate-fadeIn">
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-[11px] text-emerald-300 flex items-center gap-1.5 animate-fadeIn">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              {successMsg}
            </div>
          )}

          <form
            key={`${mode}-${isOpen ? 'open' : 'closed'}`}
            onSubmit={handleSubmit}
            autoComplete="on"
            className="space-y-3"
          >
            {/* Remembered / Previously Logged In Account Card */}
            {mode === 'signin' && rememberedAccounts.length > 0 && (
              <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-sky-500/30 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-sky-400" />
                    Previous account:
                  </span>
                  {username.toLowerCase() === rememberedAccounts[0].username.toLowerCase() && (
                    <button
                      type="button"
                      onClick={() => handleForgetAccount(rememberedAccounts[0].username)}
                      className="text-[10px] text-zinc-500 hover:text-rose-400 transition-colors"
                      title="Forget this saved account"
                    >
                      Forget
                    </button>
                  )}
                </div>

                <div
                  onClick={() => handleSelectAccount(rememberedAccounts[0])}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                    username.toLowerCase() === rememberedAccounts[0].username.toLowerCase()
                      ? 'bg-sky-500/15 border border-sky-500/40 text-sky-200 shadow-sm'
                      : 'bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-base flex-shrink-0">
                      {rememberedAccounts[0].emoji || '👤'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                        <span>{rememberedAccounts[0].displayName || rememberedAccounts[0].username}</span>
                        {username.toLowerCase() === rememberedAccounts[0].username.toLowerCase() && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/25 text-sky-300 font-normal">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        @{rememberedAccounts[0].username}
                      </div>
                    </div>
                  </div>

                  {username.toLowerCase() !== rememberedAccounts[0].username.toLowerCase() && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAccount(rememberedAccounts[0]);
                      }}
                      className="text-[10px] px-2 py-1 rounded-md bg-sky-500 hover:bg-sky-400 text-white font-semibold transition-colors shadow-sm"
                    >
                      Use
                    </button>
                  )}
                </div>

                {/* Additional accounts if more than 1 were remembered */}
                {rememberedAccounts.length > 1 && (
                  <div className="pt-1 flex items-center gap-1.5 overflow-x-auto text-[10px] no-scrollbar">
                    <span className="text-zinc-500 flex-shrink-0">Other:</span>
                    {rememberedAccounts.slice(1).map((acc) => (
                      <button
                        key={acc.username}
                        type="button"
                        onClick={() => handleSelectAccount(acc)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] transition-all flex-shrink-0 ${
                          username.toLowerCase() === acc.username.toLowerCase()
                            ? 'bg-sky-500/20 border-sky-500/40 text-sky-200'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                        }`}
                      >
                        <span>{acc.emoji || '👤'}</span>
                        <span className="truncate max-w-[85px]">{acc.displayName || acc.username}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Username / Player Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  type="text"
                  name="username"
                  id="blockade_username"
                  required
                  autoComplete="username"
                  placeholder="e.g. Nicko"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                />
                {username && (
                  <button
                    type="button"
                    onClick={() => setUsername('')}
                    tabIndex={-1}
                    aria-label="Clear username"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-zinc-300 rounded-full hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                <input
                  ref={passwordInputRef}
                  type="password"
                  name="password"
                  id="blockade_password"
                  required
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                />
                {password && (
                  <button
                    type="button"
                    onClick={() => setPassword('')}
                    tabIndex={-1}
                    aria-label="Clear password"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-zinc-300 rounded-full hover:bg-zinc-800 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="pt-0.5 pb-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-zinc-950 border-zinc-700 text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-sky-500"
                />
                <span className="text-[11px] text-zinc-400 hover:text-zinc-300 transition-colors">
                  Remember this account on this device
                </span>
              </label>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span>Choose Your Player Icon</span>
                  <span className="text-sm select-none">{selectedEmoji}</span>
                </label>
                <div className="grid grid-cols-6 gap-1.5 p-1.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  {['👑', '🦁', '⚡', '🤖', '⚔️', '🦊', '🐉', '💎', '🚀', '👻', '👾', '🎯'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`h-8 rounded-lg flex items-center justify-center text-lg transition-all tap-bounce ${
                        selectedEmoji === emoji
                          ? 'bg-sky-500/25 border-2 border-sky-400 scale-105 shadow-sm'
                          : 'hover:bg-zinc-800 border border-transparent'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md tap-bounce transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'signup' ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Quick Guest Alternative */}
          <div className="pt-3 border-t border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Or play as guest without an account:</span>
            </div>

            <form onSubmit={handleSaveGuest} className="flex gap-2">
              <input
                type="text"
                placeholder="Guest name..."
                value={guestInput}
                onChange={(e) => setGuestInput(e.target.value)}
                maxLength={20}
                className="flex-1 px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
              />
              <button
                type="submit"
                className="py-1.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 font-semibold text-xs tap-bounce border border-zinc-700/60"
              >
                Set Name
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2.5 border-t border-zinc-800 text-center text-[10px] text-zinc-500">
          {mode === 'signup' ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('signin')}
                className="text-sky-400 font-semibold hover:underline"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              New player?{' '}
              <button
                type="button"
                onClick={() => handleSwitchMode('signup')}
                className="text-sky-400 font-semibold hover:underline"
              >
                Sign Up
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
