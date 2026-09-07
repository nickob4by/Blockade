'use client';

import React from 'react';
import { PlayerId, WallOrientation } from '@/lib/game/types';
import { WallTray } from './WallTray';
import { sounds } from '@/lib/audio/sounds';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  BookOpen,
} from 'lucide-react';

interface MobileControlsProps {
  onRestart?: () => void;
  onOpenRules: () => void;
  wallsLeft: number;
  currentTurn: PlayerId;
  isMyTurn: boolean;
  onDragStart: (orientation: WallOrientation, startX: number, startY: number, isTouch: boolean) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onRestart,
  onOpenRules,
  wallsLeft,
  currentTurn,
  isMyTurn,
  onDragStart,
  onDragMove,
  onDragEnd,
  isDragging,
}) => {
  const [soundEnabled, setSoundEnabled] = React.useState(true);

  const handleToggleSound = () => {
    const isEnabled = sounds.toggleSound();
    setSoundEnabled(isEnabled);
  };

  return (
    <div className="w-full max-w-[400px] mx-auto px-1 py-1 pb-safe space-y-1.5">
      {/* 1. Player-Themed Drag-and-Drop Wall Tray */}
      <WallTray
        wallsLeft={wallsLeft}
        currentTurn={currentTurn}
        isMyTurn={isMyTurn}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        isDragging={isDragging}
      />

      {/* 2. Bottom Utilities Strip (Rules, Sound, Restart) */}
      <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-white/80 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 text-xs text-slate-500 dark:text-zinc-400">
        <span className="text-[10px] text-slate-500 dark:text-zinc-400 flex items-center gap-1">
          Tap cell to Move • Drag wall to Block
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenRules}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 tap-bounce"
            title="Game Rules"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleToggleSound}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 tap-bounce"
            title="Toggle Sound"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
            )}
          </button>

          {onRestart && (
            <button
              type="button"
              onClick={onRestart}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 dark:bg-zinc-800 dark:hover:bg-red-950/40 text-slate-700 hover:text-rose-600 dark:text-zinc-300 dark:hover:text-red-300 border border-slate-200 dark:border-zinc-700/60 tap-bounce"
              title="Restart Match"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
