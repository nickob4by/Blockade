'use client';

import React, { useRef, useState } from 'react';
import { PlayerId, WallOrientation } from '@/lib/game/types';
import { sounds } from '@/lib/audio/sounds';
import { SplitSquareHorizontal, SplitSquareVertical, Move } from 'lucide-react';
import { PLAYER_THEMES } from '@/lib/game/board';

interface WallTrayProps {
  wallsLeft: number;
  currentTurn: PlayerId;
  isMyTurn: boolean;
  onDragStart: (orientation: WallOrientation, startX: number, startY: number, isTouch: boolean) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export const WallTray: React.FC<WallTrayProps> = ({
  wallsLeft,
  currentTurn,
  isMyTurn,
  onDragStart,
  onDragMove,
  onDragEnd,
  isDragging,
}) => {
  const [activeToken, setActiveToken] = useState<WallOrientation | null>(null);
  const activePointerId = useRef<number | null>(null);

  const canDrag = isMyTurn && wallsLeft > 0;
  const theme = PLAYER_THEMES[currentTurn] || PLAYER_THEMES[1];

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

    sounds.playPickup();
    setActiveToken(orientation);
    activePointerId.current = e.pointerId;

    const isTouch = e.pointerType === 'touch';
    onDragStart(orientation, e.clientX, e.clientY, isTouch);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (activePointerId.current !== null && moveEvent.pointerId === activePointerId.current) {
        moveEvent.preventDefault();
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
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-zinc-400 flex items-center gap-1">
          <Move className={`w-3 h-3 ${theme.textClass}`} />
          Drag Wall onto Board
        </span>
        <span className={`text-[11px] font-semibold ${theme.textClass}`}>
          {wallsLeft} <span className="text-slate-400 dark:text-zinc-500 font-normal">left</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full">
        {/* Horizontal Wall Handle */}
        <button
          type="button"
          onPointerDown={(e) => handlePointerDown(e, 'H')}
          disabled={!canDrag}
          style={
            activeToken === 'H'
              ? {
                  borderColor: theme.ringColor,
                  backgroundColor: theme.ringColor.replace(/[\d.]+\)$/, '0.18)'),
                }
              : undefined
          }
          className={`relative flex items-center justify-center gap-2 py-2 px-3 rounded-xl border transition-all duration-150 touch-none select-none ${
            !canDrag
              ? 'opacity-40 bg-slate-100 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 cursor-not-allowed text-slate-400 dark:text-zinc-500'
              : activeToken === 'H'
              ? 'shadow-sm scale-98'
              : 'bg-white dark:bg-zinc-900/90 hover:bg-slate-50 dark:hover:bg-zinc-800/90 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 shadow-sm dark:shadow-tactile-sm active:scale-95'
          }`}
          aria-label="Drag Horizontal Wall"
        >
          <SplitSquareHorizontal className={`w-4 h-4 flex-shrink-0 ${theme.textClass}`} />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs font-bold tracking-wide text-slate-800 dark:text-zinc-100">Horizontal</span>
            <span className="text-[9px] text-slate-500 dark:text-zinc-400">Hold & Drag</span>
          </div>
          <div
            className={`w-6 h-1.5 rounded-full shadow-sm ml-auto flex-shrink-0 border ${theme.wallBg} ${theme.wallBorder}`}
          />
        </button>

        {/* Vertical Wall Handle */}
        <button
          type="button"
          onPointerDown={(e) => handlePointerDown(e, 'V')}
          disabled={!canDrag}
          style={
            activeToken === 'V'
              ? {
                  borderColor: theme.ringColor,
                  backgroundColor: theme.ringColor.replace(/[\d.]+\)$/, '0.18)'),
                }
              : undefined
          }
          className={`relative flex items-center justify-center gap-2 py-2 px-3 rounded-xl border transition-all duration-150 touch-none select-none ${
            !canDrag
              ? 'opacity-40 bg-slate-100 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 cursor-not-allowed text-slate-400 dark:text-zinc-500'
              : activeToken === 'V'
              ? 'shadow-sm scale-98'
              : 'bg-white dark:bg-zinc-900/90 hover:bg-slate-50 dark:hover:bg-zinc-800/90 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 shadow-sm dark:shadow-tactile-sm active:scale-95'
          }`}
          aria-label="Drag Vertical Wall"
        >
          <SplitSquareVertical className={`w-4 h-4 flex-shrink-0 ${theme.textClass}`} />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs font-bold tracking-wide text-slate-800 dark:text-zinc-100">Vertical</span>
            <span className="text-[9px] text-slate-500 dark:text-zinc-400">Hold & Drag</span>
          </div>
          <div
            className={`w-1.5 h-5 rounded-full shadow-sm ml-auto flex-shrink-0 border ${theme.wallBg} ${theme.wallBorder}`}
          />
        </button>
      </div>
    </div>
  );
};
