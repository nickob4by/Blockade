'use client';

import React, { useEffect, useState } from 'react';
import { MatchChallenge } from '@/lib/challenges/challengeService';
import { sounds } from '@/lib/audio/sounds';
import { Swords, X, Check, Clock, Users } from 'lucide-react';

interface IncomingChallengeModalProps {
  challenge: MatchChallenge | null;
  onAccept: (challenge: MatchChallenge) => void;
  onDecline: (challenge: MatchChallenge) => void;
}

export const IncomingChallengeModal: React.FC<IncomingChallengeModalProps> = ({
  challenge,
  onAccept,
  onDecline,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(30);

  useEffect(() => {
    if (!challenge) {
      setTimeLeft(30);
      return;
    }

    // Play incoming challenge chime
    sounds.playChallenge();

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onDecline(challenge);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [challenge, onDecline]);

  if (!challenge) return null;

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / 30) * 100));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-zinc-900 border-2 border-amber-400 dark:border-amber-500/60 shadow-[0_10px_35px_rgba(245,158,11,0.25)] text-center space-y-4">
        {/* Animated Header Badge */}
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 border-2 border-white dark:border-zinc-800 flex items-center justify-center text-white shadow-xl">
            <Swords className="w-8 h-8 animate-bounce" />
          </div>
        </div>

        {/* Title */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 mb-2">
            Match Challenge
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Direct Challenge!
          </h3>
          {challenge.groupName && (
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
              <Users className="w-3.5 h-3.5 text-sky-500" />
              <span>From circle: <strong className="text-slate-800 dark:text-zinc-200">{challenge.groupName}</strong></span>
            </div>
          )}
        </div>

        {/* Challenger Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-center gap-3 text-left">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-sky-500/20 border border-sky-400/40 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
            {challenge.challengerEmoji ? (
              <span className="leading-none select-none">{challenge.challengerEmoji}</span>
            ) : (
              challenge.challengerName[0]?.toUpperCase() || 'P'
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-500 dark:text-zinc-400">Challenged by:</div>
            <div className="font-extrabold text-base text-slate-900 dark:text-white truncate">
              {challenge.challengerName}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              Ready for 1v1 Quoridor Match
            </div>
          </div>
        </div>

        {/* Countdown Timer Bar */}
        <div className="space-y-1 text-left">
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> Auto-declines in:
            </span>
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              {timeLeft}s
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000 ease-linear"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action Buttons: Accept & Decline */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => onDecline(challenge)}
            className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 font-bold text-sm flex items-center justify-center gap-1.5 border border-slate-200 dark:border-zinc-700/60 tap-bounce transition-colors"
          >
            <X className="w-4 h-4 text-rose-500" />
            Decline
          </button>

          <button
            type="button"
            onClick={() => onAccept(challenge)}
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 tap-bounce transition-transform active:scale-95"
          >
            <Check className="w-4 h-4" />
            Accept & Play
          </button>
        </div>
      </div>
    </div>
  );
};
