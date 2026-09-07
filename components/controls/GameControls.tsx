'use client';

import React, { useState } from 'react';
import { WallOrientation } from '@/lib/game/types';
import { sounds } from '@/lib/audio/sounds';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  BookOpen,
  SplitSquareVertical,
  SplitSquareHorizontal,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface GameControlsProps {
  orientation: WallOrientation;
  onToggleOrientation: () => void;
  onRestart: () => void;
  onOpenRules: () => void;
  wallsLeft: number;
}

export const GameControls: React.FC<GameControlsProps> = ({
  orientation,
  onToggleOrientation,
  onRestart,
  onOpenRules,
  wallsLeft,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleToggleSound = () => {
    const isEnabled = sounds.toggleSound();
    setSoundEnabled(isEnabled);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 shadow-lg">
      {/* Wall Orientation Toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleOrientation}
          disabled={wallsLeft <= 0}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 border ${
            wallsLeft <= 0
              ? 'opacity-40 cursor-not-allowed bg-slate-800 border-slate-700 text-slate-400'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30 hover:border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.15)]'
          }`}
          title="Toggle wall orientation (Shortcut: Space or R)"
        >
          {orientation === 'H' ? (
            <>
              <SplitSquareHorizontal className="w-4 h-4 text-amber-400" />
              <span>Wall: Horizontal</span>
            </>
          ) : (
            <>
              <SplitSquareVertical className="w-4 h-4 text-amber-400" />
              <span>Wall: Vertical</span>
            </>
          )}
          <span className="hidden sm:inline-block text-[10px] bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
            [Space / R]
          </span>
        </button>
      </div>

      {/* Action buttons (Rules, Sound, Restart) */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenRules}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          title="How to play / Rules"
        >
          <BookOpen className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleToggleSound}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-500" />
          )}
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs sm:text-sm font-medium transition-colors"
          title="Restart Game"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
