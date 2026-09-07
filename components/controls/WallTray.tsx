'use client';

import React, { useRef, useState, useEffect } from 'react';
import { WallOrientation } from '@/lib/game/types';
import { sounds } from '@/lib/audio/sounds';
import { SplitSquareHorizontal, SplitSquareVertical, Move } from 'lucide-react';

export interface DraggingWallInfo {
  orientation: WallOrientation;
  x: number;
  y: number;
}

interface WallTrayProps {
  wallsLeft: number;
  isMyTurn: boolean;
  onDragStart: (orientation: WallOrientation, startX: number, startY: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export const WallTray: React.FC<WallTrayProps> = ({
  wallsLeft,
  isMyTurn,
  onDragStart,
  onDragMove,
  onDragEnd,
  isDragging,
}) => {
  const [activeToken, setActiveToken] = useState<WallOrientation | null>(null);
  const activePointerId = useRef<number | null>(null);

  const canDrag = isMyTurn && wallsLeft > 0;

  const handlePointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    orientation: WallOrientation
  ) => {
    if (!canDrag) {
      sounds.playInvalid();
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    // Visual feedback & sound
    sounds.playPickup();
    setActiveToken(orientation);
    activePointerId.current = e.pointerId;

    // Trigger drag start
    onDragStart(orientation, e.clientX, e.clientY);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (activePointerId.current !== null && moveEvent.pointerId === activePointerId.current) {
        onDragMove(moveEvent.clientX, moveEvent.clientY);
      }
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      if (activePointerId.current !== null && upEvent.pointerId === activePointerId.current) {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
        activePointerId.current = null;
        setActiveToken(null);
        onDragEnd();
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp, { passive: false });
    window.addEventListener('pointercancel', handlePointerUp, { passive: false });
  };

  return (
    <div className="w-full flex flex-col items-center gap-1">
      <div className="flex items-center justify-between w-full px-1">
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
          <Move className="w-3 h-3 text-amber-400" />
          Drag Wall onto Board
        </span>
        <span className="text-[11px] font-semibold text-amber-300">
          {wallsLeft} <span className="text-slate-500 font-normal">left</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full">
        {/* Horizontal Wall Handle */}
        <button
          type="button"
          onPointerDown={(e) => handlePointerDown(e, 'H')}
          disabled={!canDrag}
          className={`relative flex items-center justify-center gap-2 py-2 px-3 rounded-xl border transition-all duration-150 touch-none select-none ${
            !canDrag
              ? 'opacity-40 bg-slate-900 border-slate-800 cursor-not-allowed text-slate-500'
              : activeToken === 'H'
              ? 'bg-amber-500/30 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-98'
              : 'bg-slate-900/90 hover:bg-slate-800 border-amber-500/40 text-amber-300 shadow-md active:scale-95'
          }`}
          aria-label="Drag Horizontal Wall"
        >
          <SplitSquareHorizontal className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs font-black tracking-wide text-amber-300">Horizontal</span>
            <span className="text-[9px] text-slate-400">Hold & Drag</span>
          </div>
          {/* Visual wood bar preview */}
          <div className="w-6 h-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 shadow-sm ml-auto flex-shrink-0" />
        </button>

        {/* Vertical Wall Handle */}
        <button
          type="button"
          onPointerDown={(e) => handlePointerDown(e, 'V')}
          disabled={!canDrag}
          className={`relative flex items-center justify-center gap-2 py-2 px-3 rounded-xl border transition-all duration-150 touch-none select-none ${
            !canDrag
              ? 'opacity-40 bg-slate-900 border-slate-800 cursor-not-allowed text-slate-500'
              : activeToken === 'V'
              ? 'bg-amber-500/30 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)] scale-98'
              : 'bg-slate-900/90 hover:bg-slate-800 border-amber-500/40 text-amber-300 shadow-md active:scale-95'
          }`}
          aria-label="Drag Vertical Wall"
        >
          <SplitSquareVertical className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs font-black tracking-wide text-amber-300">Vertical</span>
            <span className="text-[9px] text-slate-400">Hold & Drag</span>
          </div>
          {/* Visual wood bar preview */}
          <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-amber-400 to-amber-500 shadow-sm ml-auto flex-shrink-0" />
        </button>
      </div>
    </div>
  );
};
