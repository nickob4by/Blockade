'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { sounds } from '@/lib/audio/sounds';
import { X, Settings, User, Check, Loader2, Sparkles, Smile } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMOJI_CATEGORIES = [
  {
    name: 'Strategy & Legends',
    emojis: ['👑', '⚔️', '🛡️', '🧙', '🥷', '🏹', '♟️', '🏰', '💎', '🏆'],
  },
  {
    name: 'Beasts & Creatures',
    emojis: ['🦁', '🐯', '🐉', '🐺', '🦊', '🦅', '🦈', '🐻', '🦉', '🐍'],
  },
  {
    name: 'Elements & Cosmic',
    emojis: ['⚡', '🔥', '❄️', '🌟', '🚀', '☄️', '🌪️', '🌊', '🪐', '🌙'],
  },
  {
    name: 'Fun & Arcade',
    emojis: ['🤖', '👻', '👾', '🎯', '🎲', '😎', '🐱', '🐶', '🦄', '🍄'],
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { profile, updateProfile } = useAuth();
  const [name, setName] = useState(profile.name || '');
  const [selectedEmoji, setSelectedEmoji] = useState(profile.emoji || '');
  const [customInput, setCustomInput] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(profile.name || '');
      setSelectedEmoji(profile.emoji || '');
      setCustomInput('');
      setSaveSuccess(false);
      setError(null);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleSelectEmoji = (emoji: string) => {
    sounds.playSnap();
    setSelectedEmoji(emoji);
    setCustomInput('');
  };

  const handleCustomEmojiChange = (val: string) => {
    setCustomInput(val);
    if (val.trim()) {
      // Pick the last grapheme/emoji entered
      const chars = Array.from(val.trim());
      const lastChar = chars[chars.length - 1];
      if (lastChar) {
        setSelectedEmoji(lastChar);
      }
    }
  };

  const handleResetToGeneric = () => {
    sounds.playSnap();
    setSelectedEmoji('');
    setCustomInput('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await updateProfile({
        name: name.trim() || profile.name || 'Blockade Player',
        emoji: selectedEmoji.trim(),
      });
      sounds.playMove();
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center shadow-sm">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white leading-none">Player Settings</h3>
              <span className="text-[11px] text-zinc-400">Customize your name & pawn icon</span>
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

        {error && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Display Name Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Display Nickname
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 16))}
              placeholder="Your nickname"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-sky-400 transition-colors"
            />
          </div>

          {/* Live Pawn Preview */}
          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400">Pawn Icon Preview</span>
              <button
                type="button"
                onClick={handleResetToGeneric}
                className={`text-[11px] font-semibold transition-colors ${
                  !selectedEmoji ? 'text-sky-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Reset to Generic Icon
              </button>
            </div>

            <div className="flex items-center justify-around py-3 bg-zinc-900/50 rounded-lg border border-zinc-800/40">
              {/* Blue Theme Preview */}
              <div className="flex flex-col items-center gap-1.5">
                {selectedEmoji ? (
                  <div className="w-12 h-12 flex items-center justify-center">
                    <span
                      className="text-3xl select-none leading-none"
                      style={{
                        filter:
                          'drop-shadow(0 3px 6px rgba(0,0,0,0.85)) drop-shadow(0 0 10px rgba(56,189,248,0.9)) drop-shadow(0 0 2px rgba(255,255,255,0.95))',
                      }}
                    >
                      {selectedEmoji}
                    </span>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-300/50 shadow-tactile-p1 flex items-center justify-center">
                    <User className="w-5 h-5 text-white/90 drop-shadow" />
                  </div>
                )}
                <span className="text-[10px] font-bold text-blue-400">Player 1 (Blue)</span>
              </div>

              {/* Rose Theme Preview */}
              <div className="flex flex-col items-center gap-1.5">
                {selectedEmoji ? (
                  <div className="w-12 h-12 flex items-center justify-center">
                    <span
                      className="text-3xl select-none leading-none"
                      style={{
                        filter:
                          'drop-shadow(0 3px 6px rgba(0,0,0,0.85)) drop-shadow(0 0 10px rgba(244,63,94,0.9)) drop-shadow(0 0 2px rgba(255,255,255,0.95))',
                      }}
                    >
                      {selectedEmoji}
                    </span>
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-b from-rose-500 to-rose-600 border border-rose-300/50 shadow-tactile-p2 flex items-center justify-center">
                    <User className="w-5 h-5 text-white/90 drop-shadow" />
                  </div>
                )}
                <span className="text-[10px] font-bold text-rose-400">Player 2 (Rose)</span>
              </div>
            </div>
          </div>

          {/* Emoji Selection Section */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5 text-amber-400" />
                Choose Pawn Emoji
              </span>
              <span className="text-[10px] text-zinc-500">Tap to select</span>
            </div>

            {/* Category tabs */}
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              {EMOJI_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setActiveCategory(idx)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeCategory === idx
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Emoji Grid */}
            <div className="grid grid-cols-5 gap-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800/80 max-h-36 overflow-y-auto">
              {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => {
                const isSelected = selectedEmoji === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelectEmoji(emoji)}
                    className={`h-11 rounded-xl flex items-center justify-center text-xl transition-all tap-bounce ${
                      isSelected
                        ? 'bg-sky-500/25 border-2 border-sky-400 scale-105 shadow-md shadow-sky-500/20'
                        : 'bg-zinc-900 hover:bg-zinc-850 border border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>

            {/* Custom Emoji Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customInput}
                onChange={(e) => handleCustomEmojiChange(e.target.value)}
                placeholder="Type or paste any custom emoji..."
                className="flex-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving || saveSuccess}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all tap-bounce ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/20'
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Settings...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  Saved Successfully!
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
