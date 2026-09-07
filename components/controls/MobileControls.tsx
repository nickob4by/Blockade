'use client';

import React from 'react';
import { WallOrientation } from '@/lib/game/types';
import { sounds } from '@/lib/audio/sounds';
import {
  RotateCcw,
  Volume2,
  VolumeX,
  BookOpen,
  SplitSquareVertical,
  SplitSquareHorizontal,
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
}) => {
  const [soundEnabled, setSoundEnabled] = React.useState(true);

  const handleToggleSound = () => {
    const isEnabled = sounds.toggleSound();
    setSoundEnabled(isEnabled);
  };

  return (
    <div className="w-full max-w-[420px] mx-auto px-2 py-1.5 pb-safe">
      {selectedWall && isMyTurn ? (
        /* State 2: Active Wall Confirmation Bar */
        <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-slate-900/95 border border-amber-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)] animate-fadeIn">
          {/* Cancel button */}
          <button
            type="button"
            onClick={onCancelWall}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1 tap-bounce border border-slate-700"
          >
            <X className="w-4 h-4 text-rose-400" />
            Cancel
          </button>

          {/* Rotate button */}
          <button
            type="button"
            onClick={onToggleOrientation}
            className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-1 tap-bounce border border-amber-500/40"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin-reverse" />
            Rotate ({orientation})
          </button>

          {/* Confirm button */}
          <button
            type="button"
            onClick={onConfirmWall}
            disabled={!isValidWallPlacement}
            className={`flex-[1.2] py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 tap-bounce shadow-lg ${
              isValidWallPlacement
                ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-emerald-500/30'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            Place Wall
          </button>
        </div>
      ) : (
        /* State 1: Normal Thumb Bar */
        <div className="flex items-center justify-between gap-1.5 p-1.5 sm:p-2 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-md">
          {/* Orientation Toggle Button */}
          <button
            type="button"
            onClick={onToggleOrientation}
            disabled={wallsLeft <= 0 || !isMyTurn}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all tap-bounce border ${
              wallsLeft <= 0 || !isMyTurn
                ? 'opacity-40 bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(251,191,36,0.2)]'
            }`}
          >
            {orientation === 'H' ? (
              <>
                <SplitSquareHorizontal className="w-4 h-4 text-amber-400" />
                <span>Wall: H</span>
              </>
            ) : (
              <>
                <SplitSquareVertical className="w-4 h-4 text-amber-400" />
                <span>Wall: V</span>
              </>
            )}
            <span className="text-[10px] text-amber-400/80 font-normal">({wallsLeft})</span>
          </button>

          {/* Secondary Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenRules}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 tap-bounce"
              aria-label="Game Rules"
            >
              <BookOpen className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleToggleSound}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 tap-bounce"
              aria-label="Toggle Sound"
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
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700/60 tap-bounce"
              aria-label="Restart Match"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
