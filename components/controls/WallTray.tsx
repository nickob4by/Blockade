'use client';

import React, { useRef, useState } from 'react';
import { PlayerId, WallOrientation } from '@/lib/game/types';
import { sounds } from '@/lib/audio/sounds';
import { SplitSquareHorizontal, SplitSquareVertical, Move } from 'lucide-react';

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
  const isP1 = currentTurn === 1;

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
        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
          <Move className={`w-3 h-3 ${isP1 ? 'text-sky-400' : 'text-rose-400'}`} />
          Drag Wall onto Board
        </span>
        <span className={`text-[11px] font-semibold ${isP1 ? 'text-sky-300' : 'text-rose-300'}`}>
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
              ? isP1
                ? 'bg-sky-500/30 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)] scale-98'
                : 'bg-rose-500/30 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)] scale-98'
              : isP1
              ? 'bg-slate-900/90 hover:bg-slate-800 border-sky-500/40 text-sky-300 shadow-md active:scale-95'
              : 'bg-slate-900/90 hover:bg-slate-800 border-rose-500/40 text-rose-300 shadow-md active:scale-95'
          }`}
          aria-label="Drag Horizontal Wall"
        >
          <SplitSquareHorizontal className={`w-4 h-4 flex-shrink-0 ${isP1 ? 'text-sky-400' : 'text-rose-400'}`} />
          <div className="flex flex-col items-start leading-tight">
            <span className={`text-xs font-black tracking-wide ${isP1 ? 'text-sky-200' : 'text-rose-200'}`}>Horizontal</span>
            <span className="text-[9px] text-slate-400">Hold & Drag</span>
          </div>
          <div
            className={`w-6 h-1.5 rounded-full shadow-sm ml-auto flex-shrink-0 ${
              isP1
                ? 'bg-gradient-to-r from-sky-400 to-cyan-400 shadow-[0_0_4px_rgba(56,189,248,0.8)]'
                : 'bg-gradient-to-r from-rose-400 to-pink-400 shadow-[0_0_4px_rgba(244,63,94,0.8)]'
            }`}
          />
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
              ? isP1
                ? 'bg-sky-500/30 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)] scale-98'
                : 'bg-rose-500/30 border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.5)] scale-98'
              : isP1
              ? 'bg-slate-900/90 hover:bg-slate-800 border-sky-500/40 text-sky-300 shadow-md active:scale-95'
              : 'bg-slate-900/90 hover:bg-slate-800 border-rose-500/40 text-rose-300 shadow-md active:scale-95'
          }`}
          aria-label="Drag Vertical Wall"
        >
          <SplitSquareVertical className={`w-4 h-4 flex-shrink-0 ${isP1 ? 'text-sky-400' : 'text-rose-400'}`} />
          <div className="flex flex-col items-start leading-tight">
            <span className={`text-xs font-black tracking-wide ${isP1 ? 'text-sky-200' : 'text-rose-200'}`}>Vertical</span>
            <span className="text-[9px] text-slate-400">Hold & Drag</span>
          </div>
          <div
            className={`w-1.5 h-5 rounded-full shadow-sm ml-auto flex-shrink-0 ${
              isP1
                ? 'bg-gradient-to-b from-sky-400 to-cyan-400 shadow-[0_0_4px_rgba(56,189,248,0.8)]'
                : 'bg-gradient-to-b from-rose-400 to-pink-400 shadow-[0_0_4px_rgba(244,63,94,0.8)]'
            }`}
          />
        </button>
      </div>
    </div>
  );
};
