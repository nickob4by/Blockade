'use client';

import React from 'react';
import { WallOrientation } from '@/lib/game/types';
import { WallTray } from './WallTray';
import { sounds } from '@/lib/audio/sounds';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  BookOpen,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';

interface MobileControlsProps {
  orientation: WallOrientation;
  onToggleOrientation: () => void;
  selectedWall: { r: number; c: number; orientation: WallOrientation } | null;
  onConfirmWall: () => void;
  onCancelWall: () => void;
  onRestart: () => void;
  onOpenRules: () => void;
  wallsLeft: number;
  isMyTurn: boolean;
  isValidWallPlacement: boolean;
  onDragStart: (orientation: WallOrientation, startX: number, startY: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  orientation,
  onToggleOrientation,
  selectedWall,
  onConfirmWall,
  onCancelWall,
  onRestart,
  onOpenRules,
  wallsLeft,
  isMyTurn,
  isValidWallPlacement,
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
      {/* 1. Drag-and-Drop Wall Tray */}
      <WallTray
        wallsLeft={wallsLeft}
        isMyTurn={isMyTurn}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        isDragging={isDragging}
      />

      {/* 2. Action Bar / Secondary Controls */}
      {selectedWall && isMyTurn ? (
        /* Tap Selection Confirmation Bar */
        <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-slate-900/95 border border-amber-500/50 shadow-lg animate-fadeIn">
          <button
            type="button"
            onClick={onCancelWall}
            className="flex-1 py-2 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1 tap-bounce border border-slate-700"
          >
            <X className="w-3.5 h-3.5 text-rose-400" />
            Cancel
          </button>

          <button
            type="button"
            onClick={onToggleOrientation}
            className="flex-1 py-2 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1 tap-bounce border border-amber-500/40"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin-reverse" />
            Rotate ({selectedWall.orientation})
          </button>

          <button
            type="button"
            onClick={onConfirmWall}
            disabled={!isValidWallPlacement}
            className={`flex-[1.2] py-2 px-2.5 rounded-lg font-black text-xs flex items-center justify-center gap-1.5 tap-bounce shadow-md ${
              isValidWallPlacement
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            Confirm
          </button>
        </div>
      ) : (
        /* Bottom Utilities Strip (Rules, Sound, Restart) */
        <div className="flex items-center justify-between px-2 py-1 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400">
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            Tap cell to Move • Drag wall to Block
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenRules}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 tap-bounce"
              title="Game Rules"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleToggleSound}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 tap-bounce"
              title="Toggle Sound"
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>

            <button
              type="button"
              onClick={onRestart}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700/60 tap-bounce"
              title="Restart Match"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
