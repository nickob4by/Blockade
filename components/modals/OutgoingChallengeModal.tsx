'use client';

import React, { useEffect } from 'react';
import { MatchChallenge } from '@/lib/challenges/challengeService';
import { Swords, X, Loader2, CheckCircle2, XCircle, Users } from 'lucide-react';

export type OutgoingChallengeStatus = 'waiting' | 'accepted' | 'declined' | 'cancelled';

interface OutgoingChallengeModalProps {
  challenge: MatchChallenge | null;
  status: OutgoingChallengeStatus;
  onCancel: (challenge: MatchChallenge) => void;
  onClose: () => void;
}

export const OutgoingChallengeModal: React.FC<OutgoingChallengeModalProps> = ({
  challenge,
  status,
  onCancel,
  onClose,
}) => {
  useEffect(() => {
    if (status === 'declined' || status === 'cancelled') {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  if (!challenge) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm p-6 rounded-3xl bg-white dark:bg-zinc-900 border-2 border-indigo-400 dark:border-indigo-500/50 shadow-[0_10px_35px_rgba(99,102,241,0.25)] text-center space-y-4">
        {/* Animated Status Icon */}
        <div className="relative w-16 h-16 mx-auto">
          {status === 'waiting' && (
            <>
              <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-sky-600 border-2 border-white dark:border-zinc-800 flex items-center justify-center text-white shadow-xl">
                <Swords className="w-8 h-8 animate-pulse" />
              </div>
            </>
          )}

          {status === 'accepted' && (
            <div className="relative w-16 h-16 rounded-full bg-emerald-500 border-2 border-white dark:border-zinc-800 flex items-center justify-center text-white shadow-xl animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
          )}

          {(status === 'declined' || status === 'cancelled') && (
            <div className="relative w-16 h-16 rounded-full bg-rose-500 border-2 border-white dark:border-zinc-800 flex items-center justify-center text-white shadow-xl">
              <XCircle className="w-9 h-9" />
            </div>
          )}
        </div>

        {/* Title and Context */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 mb-2">
            Match Invitation
          </div>

          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            {status === 'waiting' && 'Challenging Opponent...'}
            {status === 'accepted' && 'Challenge Accepted!'}
            {status === 'declined' && 'Challenge Declined'}
            {status === 'cancelled' && 'Challenge Cancelled'}
          </h3>

          {challenge.groupName && (
            <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
              <Users className="w-3.5 h-3.5 text-sky-500" />
              <span>Circle: <strong className="text-slate-800 dark:text-zinc-200">{challenge.groupName}</strong></span>
            </div>
          )}
        </div>

        {/* Target Opponent Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-center gap-3 text-left">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-400/40 flex items-center justify-center text-2xl flex-shrink-0 font-bold text-indigo-600 dark:text-indigo-400 shadow-sm">
            {challenge.targetUserName[0]?.toUpperCase() || 'P'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-slate-500 dark:text-zinc-400">Opponent:</div>
            <div className="font-extrabold text-base text-slate-900 dark:text-white truncate">
              {challenge.targetUserName}
            </div>
            <div className="text-[11px] font-medium mt-0.5">
              {status === 'waiting' && (
                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Waiting for response...
                </span>
              )}
              {status === 'accepted' && (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  Joining game room #{challenge.roomCode}...
                </span>
              )}
              {status === 'declined' && (
                <span className="text-rose-500 dark:text-rose-400">
                  {challenge.targetUserName} cannot play right now.
                </span>
              )}
              {status === 'cancelled' && (
                <span className="text-slate-500 dark:text-zinc-400">
                  Invitation cancelled.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {status === 'waiting' ? (
            <button
              type="button"
              onClick={() => onCancel(challenge)}
              className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 font-bold text-sm flex items-center justify-center gap-1.5 border border-slate-200 dark:border-zinc-700/60 tap-bounce transition-colors"
            >
              <X className="w-4 h-4 text-rose-500" />
              Cancel Challenge
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 font-bold text-sm flex items-center justify-center gap-1.5 border border-slate-200 dark:border-zinc-700/60 tap-bounce transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
