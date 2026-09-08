'use client';

import React from 'react';
import { UserX, ArrowLeft } from 'lucide-react';

interface OpponentLeftModalProps {
  isOpen: boolean;
  opponentName: string;
  onExitToMenu: () => void;
  title?: string;
  message?: string;
}

export const OpponentLeftModal: React.FC<OpponentLeftModalProps> = ({
  isOpen,
  opponentName,
  onExitToMenu,
  title = 'Opponent Left',
  message,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-sm p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl text-center space-y-4">
        {/* Opponent Left Icon Badge */}
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400 shadow-lg">
          <UserX className="w-8 h-8" />
        </div>

        <div>
          <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-sm text-slate-600 dark:text-zinc-400 mt-2 leading-relaxed">
            {message ? (
              message
            ) : (
              <>
                <strong className="text-slate-900 dark:text-zinc-200 font-semibold">{opponentName}</strong> has left the game. The match has ended and the room is closed.
              </>
            )}
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onExitToMenu}
            className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 tap-bounce"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
