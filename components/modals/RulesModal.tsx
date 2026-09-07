'use client';

import React from 'react';
import { X, Target, Navigation, ShieldAlert, Sparkles } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">How to Play Blockade / Quoridor</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4 text-xs sm:text-sm text-slate-300 max-h-[70vh] overflow-y-auto pr-1">
          {/* Goal */}
          <div className="flex gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 h-fit">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Objective</h4>
              <p className="text-slate-400 mt-0.5">
                The board is a 9x9 grid. The first player to reach <strong>any square on the opponent&apos;s opposite side</strong> wins the match!
                (Player 1 aims for Row 1 at top, Player 2 aims for Row 9 at bottom).
              </p>
            </div>
          </div>

          {/* Turn Actions */}
          <div className="flex gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 h-fit">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Your Turn: Choose 1 Action</h4>
              <ul className="list-disc list-inside mt-1 space-y-1 text-slate-400">
                <li>
                  <strong className="text-slate-200">Move Pawn</strong>: Move 1 square orthogonally (up, down, left, or right) into an open adjacent square.
                </li>
                <li>
                  <strong className="text-slate-200">Jumping</strong>: If you face your opponent head-to-head with no wall in between, you can jump over them! If a wall is behind them, you can jump diagonally to their flank.
                </li>
                <li>
                  <strong className="text-slate-200">Place a Wall</strong>: Place a 2-square long wall horizontally or vertically to slow down your opponent.
                </li>
              </ul>
            </div>
          </div>

          {/* Rules on Walls */}
          <div className="flex gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 h-fit">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-white">The Golden Wall Rule</h4>
              <ul className="list-disc list-inside mt-1 space-y-1 text-slate-400">
                <li>Each player starts with a limited supply of <strong>10 walls</strong>.</li>
                <li>Walls cannot overlap or cross directly through each other.</li>
                <li>
                  <strong className="text-amber-300">No complete blockage</strong>: A wall cannot completely trap a player. There must always be at least one open path to the goal row for both players!
                </li>
              </ul>
            </div>
          </div>

          {/* Controls Tip */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
            💡 <strong>Pro Tip:</strong> Press <kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-700 font-mono text-amber-300">Space</kbd> or <kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-700 font-mono text-amber-300">R</kbd> at any time to toggle between Horizontal and Vertical wall orientation!
          </div>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-colors"
          >
            Got It, Let&apos;s Play!
          </button>
        </div>
      </div>
    </div>
  );
};
