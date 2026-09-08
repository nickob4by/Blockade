'use client';

import React from 'react';
import { Flag, Trophy, Swords, ArrowLeft, Check, X } from 'lucide-react';
import { RematchStatus } from './GameOverModal';

interface OpponentResignedModalProps {
  isOpen: boolean;
  opponentName: string;
  onContinue: () => void;
  onExitToMenu: () => void;
  rematchStatus?: RematchStatus;
  onAcceptRematch?: () => void;
  onDeclineRematch?: () => void;
}

export const OpponentResignedModal: React.FC<OpponentResignedModalProps> = ({
  isOpen,
  opponentName,
  onContinue,
  onExitToMenu,
  rematchStatus = 'idle',
  onAcceptRematch,
  onDeclineRematch,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl text-center space-y-4">
        {/* Opponent Resigned Icon Badge */}
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-lg relative">
          <Flag className="w-8 h-8 text-rose-500" />
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md">
            <Trophy className="w-3.5 h-3.5" />
          </span>
        </div>

        <div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">Opponent Resigned</h3>
          <p className="text-sm text-slate-600 dark:text-zinc-400 mt-2 leading-relaxed">
            <strong className="text-slate-900 dark:text-zinc-200 font-semibold">{opponentName}</strong> has resigned from the match. You win!
          </p>
        </div>

        {/* If opponent already requested a rematch while this popup is open */}
        {rematchStatus === 'received' && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-slate-800 dark:text-zinc-100 text-xs space-y-2.5 animate-fadeIn">
            <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 text-sm">
              <Swords className="w-4 h-4" />
              <span>{opponentName} wants a rematch!</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onAcceptRematch}
                className="flex-1 py-2 px-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 text-xs flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                Accept
              </button>
              <button
                type="button"
                onClick={onDeclineRematch}
                className="flex-1 py-2 px-3 rounded-xl font-medium text-slate-700 dark:text-zinc-300 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs flex items-center justify-center gap-1.5 transition-transform active:scale-95"
              >
                <X className="w-3.5 h-3.5" />
                Decline
              </button>
            </div>
          </div>
        )}

        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={onContinue}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 tap-bounce"
          >
            <Swords className="w-4 h-4" />
            View Rematch & Results
          </button>
          <button
            type="button"
            onClick={onExitToMenu}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold text-sm flex items-center justify-center gap-2 tap-bounce"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
