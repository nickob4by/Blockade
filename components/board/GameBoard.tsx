'use client';

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Coordinate, GameState, PlayerId, Wall, WallOrientation } from '@/lib/game/types';
import { BOARD_SIZE, isSameCoord } from '@/lib/game/board';
import { canPlaceWall } from '@/lib/game/engine';
import { getValidPawnMoves } from '@/lib/game/pathfinding';
import { sounds } from '@/lib/audio/sounds';

export interface GameBoardHandle {
  getSnappedIntersection: (x: number, y: number) => { r: number; c: number } | null;
}

export interface ActiveDragInfo {
  orientation: WallOrientation;
  currentX: number;
  currentY: number;
  snappedCoord: { r: number; c: number } | null;
  isValid: boolean;
  isTouch?: boolean;
}

interface GameBoardProps {
  gameState: GameState;
  onMovePawn: (target: Coordinate) => void;
  onPlaceWall: (placement: { r: number; c: number; orientation: WallOrientation }) => void;
  clientPlayerId: PlayerId;
  selectedWall: { r: number; c: number; orientation: WallOrientation } | null;
  setSelectedWall: (wall: { r: number; c: number; orientation: WallOrientation } | null) => void;
  activeDrag: ActiveDragInfo | null;
  disabled?: boolean;
}

export const GameBoard = forwardRef<GameBoardHandle, GameBoardProps>(({
  gameState,
  onMovePawn,
  onPlaceWall,
  clientPlayerId,
  selectedWall,
  setSelectedWall,
  activeDrag,
  disabled = false,
}, ref) => {
  const innerGridRef = useRef<HTMLDivElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isP1Turn = gameState.currentTurn === 1;
  const isMyTurn = !disabled && gameState.currentTurn === clientPlayerId && gameState.status === 'playing';

  // Expose snapping coordinate calculator to parent via ref
  useImperativeHandle(ref, () => ({
    getSnappedIntersection: (x: number, y: number) => {
      if (!innerGridRef.current) return null;
      const rect = innerGridRef.current.getBoundingClientRect();

      const buffer = 50;
      if (
        x < rect.left - buffer ||
        x > rect.right + buffer ||
        y < rect.top - buffer ||
        y > rect.bottom + buffer
      ) {
        return null;
      }

      const normX = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
      const normY = Math.max(0, Math.min(1, (y - rect.top) / rect.height));

      const c = Math.max(0, Math.min(7, Math.round(normX * 9 - 1)));
      const r = Math.max(0, Math.min(7, Math.round(normY * 9 - 1)));

      return { r, c };
    },
  }));

  // Compute valid pawn moves for the active player
  const validPawnMoves = isMyTurn
    ? getValidPawnMoves(
        gameState.players[gameState.currentTurn].position,
        gameState.players[gameState.currentTurn === 1 ? 2 : 1].position,
        gameState.walls
      )
    : [];

  // Update validation error for selected wall (tap flow)
  useEffect(() => {
    if (!selectedWall || !isMyTurn) {
      setValidationError(null);
      return;
    }

    const check = canPlaceWall(gameState, {
      r: selectedWall.r,
      c: selectedWall.c,
      orientation: selectedWall.orientation,
    });

    if (!check.valid) {
      setValidationError(check.reason || 'Invalid placement');
    } else {
      setValidationError(null);
    }
  }, [selectedWall, gameState, isMyTurn]);

  // Handle cell click (Pawn movement)
  const handleCellClick = (r: number, c: number) => {
    if (!isMyTurn) return;

    const isValid = validPawnMoves.some((m) => isSameCoord(m, { r, c }));
    if (isValid) {
      setSelectedWall(null);
      sounds.playMove();
      onMovePawn({ r, c });
    }
  };

  // Handle wall slot tap (Alternative tap-to-place flow)
  const handleWallSlotTap = (r: number, c: number) => {
    if (!isMyTurn) return;

    if (gameState.players[gameState.currentTurn].wallsLeft <= 0) {
      sounds.playInvalid();
      setValidationError('No walls remaining');
      return;
    }

    const currentOri = selectedWall?.orientation || 'H';

    if (selectedWall && selectedWall.r === r && selectedWall.c === c) {
      const check = canPlaceWall(gameState, { r, c, orientation: currentOri });
      if (check.valid) {
        sounds.playWall();
        onPlaceWall({ r, c, orientation: currentOri });
        setSelectedWall(null);
        setValidationError(null);
      } else {
        sounds.playInvalid();
        setValidationError(check.reason || 'Cannot place wall here');
      }
      return;
    }

    setSelectedWall({ r, c, orientation: currentOri });
  };

  // Determine wall preview (Drag takes precedence over tap-selected wall)
  const previewWall = activeDrag?.snappedCoord
    ? {
        r: activeDrag.snappedCoord.r,
        c: activeDrag.snappedCoord.c,
        orientation: activeDrag.orientation,
        isValid: activeDrag.isValid,
      }
    : selectedWall
    ? {
        r: selectedWall.r,
        c: selectedWall.c,
        orientation: selectedWall.orientation,
        isValid: canPlaceWall(gameState, selectedWall).valid,
      }
    : null;

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {/* Feedback banner */}
      <div className="h-5 mb-1.5 flex items-center justify-center text-center">
        {activeDrag ? (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold shadow-sm transition-colors ${
              activeDrag.snappedCoord
                ? activeDrag.isValid
                  ? isP1Turn
                    ? 'bg-blue-950/80 text-blue-200 border border-blue-500/40'
                    : 'bg-rose-950/80 text-rose-200 border border-rose-500/40'
                  : 'bg-red-950/80 text-red-200 border border-red-500/40 animate-bounce'
                : 'bg-zinc-800/90 text-zinc-300 border border-zinc-700/60'
            }`}
          >
            {activeDrag.snappedCoord
              ? activeDrag.isValid
                ? 'Release to place wall ✓'
                : '⚠️ Cannot place wall here'
              : 'Drag over a grid line'}
          </span>
        ) : validationError ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-red-950/80 text-red-200 border border-red-500/40 shadow-sm animate-bounce">
            ⚠️ {validationError}
          </span>
        ) : selectedWall ? (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold border ${
              isP1Turn
                ? 'bg-blue-950/80 text-blue-200 border-blue-500/40'
                : 'bg-rose-950/80 text-rose-200 border-rose-500/40'
            }`}
          >
            Tap slot again or press Confirm
          </span>
        ) : null}
      </div>

      {/* Main Board Outer Frame */}
      <div className="relative w-[94vw] max-w-[390px] aspect-square p-2.5 sm:p-3.5 rounded-2xl bg-zinc-900/95 border border-zinc-800 shadow-2xl backdrop-blur-md flex items-center justify-center">
        {/* Clean Goal Line Indicators */}
        <div className="absolute -top-3.5 left-6 right-6 flex items-center justify-center pointer-events-none z-20">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-sky-200 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 px-3 py-0.5 rounded-full border border-sky-400/40 shadow-md">
            ▲ Player 1 Finish Line ▲
          </span>
        </div>
        <div className="absolute -bottom-3.5 left-6 right-6 flex items-center justify-center pointer-events-none z-20">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-200 bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 px-3 py-0.5 rounded-full border border-rose-400/40 shadow-md">
            ▼ Player 2 Finish Line ▼
          </span>
        </div>

        {/* 17x17 CSS Grid: 9 Cells + 8 Grooves */}
        <div
          ref={innerGridRef}
          className="relative w-full h-full grid select-none touch-manipulation"
          style={{
            gridTemplateColumns:
              'repeat(8, 1fr clamp(6px, 1.8vw, 10px)) 1fr',
            gridTemplateRows:
              'repeat(8, 1fr clamp(6px, 1.8vw, 10px)) 1fr',
          }}
        >
          {/* Player 1 Finish Zone Ambient Gradient Wash */}
          <div
            className="absolute -top-1 left-0 right-0 h-11 rounded-t-xl bg-gradient-to-b from-blue-500/25 via-blue-500/5 to-transparent pointer-events-none z-0"
            aria-hidden="true"
          />
          {/* Player 1 Continuous Straight Gradient Finish Line */}
          <div
            className="absolute -top-2 left-0 right-0 h-1.5 rounded-full bg-gradient-to-r from-blue-700 via-sky-300 to-blue-700 shadow-[0_2px_12px_rgba(56,189,248,0.55)] pointer-events-none z-10"
            aria-hidden="true"
          />

          {/* Player 2 Finish Zone Ambient Gradient Wash */}
          <div
            className="absolute -bottom-1 left-0 right-0 h-11 rounded-b-xl bg-gradient-to-t from-rose-500/25 via-rose-500/5 to-transparent pointer-events-none z-0"
            aria-hidden="true"
          />
          {/* Player 2 Continuous Straight Gradient Finish Line */}
          <div
            className="absolute -bottom-2 left-0 right-0 h-1.5 rounded-full bg-gradient-to-r from-rose-700 via-pink-300 to-rose-700 shadow-[0_-2px_12px_rgba(244,63,94,0.55)] pointer-events-none z-10"
            aria-hidden="true"
          />

          {/* 1. Render Cells (9x9) with clean movement highlights */}
          {Array.from({ length: BOARD_SIZE }).map((_, r) =>
            Array.from({ length: BOARD_SIZE }).map((_, c) => {
              const coord: Coordinate = { r, c };
              const isP1 = isSameCoord(gameState.players[1].position, coord);
              const isP2 = isSameCoord(gameState.players[2].position, coord);
              const isValidMove = validPawnMoves.some((m) => isSameCoord(m, coord));
              const isP1FinishLine = r === 0;
              const isP2FinishLine = r === BOARD_SIZE - 1;

              const gridRow = 2 * r + 1;
              const gridCol = 2 * c + 1;

              return (
                <button
                  key={`cell-${r}-${c}`}
                  type="button"
                  onClick={() => handleCellClick(r, c)}
                  disabled={!isValidMove}
                  aria-label={`Square ${r}, ${c}`}
                  style={{
                    gridRowStart: gridRow,
                    gridRowEnd: gridRow + 1,
                    gridColumnStart: gridCol,
                    gridColumnEnd: gridCol + 1,
                  }}
                  className={`relative w-full h-full rounded-lg flex items-center justify-center transition-all duration-150 focus:outline-none tap-bounce z-[1] ${
                    isValidMove
                      ? isP1Turn
                        ? 'bg-blue-500/25 border-2 border-blue-400/80 cursor-pointer hover:bg-blue-500/35 shadow-sm'
                        : 'bg-rose-500/25 border-2 border-rose-400/80 cursor-pointer hover:bg-rose-500/35 shadow-sm'
                      : isP1FinishLine
                      ? 'bg-blue-500/[0.04] border border-zinc-800/80 hover:border-zinc-700/60'
                      : isP2FinishLine
                      ? 'bg-rose-500/[0.04] border border-zinc-800/80 hover:border-zinc-700/60'
                      : 'bg-zinc-800/25 border border-zinc-800/70 hover:border-zinc-700/60'
                  }`}
                >
                  {/* Pawn 1 */}
                  {isP1 && (
                    <div className="w-[82%] h-[82%] rounded-full bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-300/50 shadow-tactile-p1 tactile-pawn flex items-center justify-center font-bold text-[11px] sm:text-xs text-white pawn-transition animate-pawn-land">
                      P1
                    </div>
                  )}

                  {/* Pawn 2 */}
                  {isP2 && (
                    <div className="w-[82%] h-[82%] rounded-full bg-gradient-to-b from-rose-500 to-rose-600 border border-rose-300/50 shadow-tactile-p2 tactile-pawn flex items-center justify-center font-bold text-[11px] sm:text-xs text-white pawn-transition animate-pawn-land">
                      P2
                    </div>
                  )}

                  {/* Clean move hint target dot */}
                  {isValidMove && !isP1 && !isP2 && (
                    <div
                      className={`w-2.5 h-2.5 rounded-full transition-transform ${
                        isP1Turn
                          ? 'bg-blue-400 shadow-sm'
                          : 'bg-rose-400 shadow-sm'
                      }`}
                    />
                  )}
                </button>
              );
            })
          )}

          {/* 2. Render Placed Walls with Modern Tactile Slabs */}
          {gameState.walls.map((wall, index) => {
            const isHorizontal = wall.orientation === 'H';
            const gridRowStart = isHorizontal ? 2 * wall.r + 2 : 2 * wall.r + 1;
            const gridRowEnd = isHorizontal ? 2 * wall.r + 3 : 2 * wall.r + 4;
            const gridColStart = isHorizontal ? 2 * wall.c + 1 : 2 * wall.c + 2;
            const gridColEnd = isHorizontal ? 2 * wall.c + 4 : 2 * wall.c + 3;
            const isP1Wall = wall.placedBy === 1;
            const isLatest = index === gameState.walls.length - 1;

            return (
              <div
                key={`placed-wall-${index}`}
                style={{
                  gridRowStart,
                  gridRowEnd,
                  gridColumnStart: gridColStart,
                  gridColumnEnd: gridColEnd,
                }}
                className={`z-20 rounded-full pointer-events-none transition-all duration-150 border wall-slab ${
                  isLatest ? 'animate-wall-slam' : ''
                } ${
                  isP1Wall
                    ? 'bg-blue-500 border-blue-300/40 shadow-tactile-md'
                    : 'bg-rose-500 border-rose-300/40 shadow-tactile-md'
                }`}
              />
            );
          })}

          {/* 3. Render Wall Slots (8x8 Intersections) */}
          {Array.from({ length: BOARD_SIZE - 1 }).map((_, r) =>
            Array.from({ length: BOARD_SIZE - 1 }).map((_, c) => {
              const targetRow = 2 * r + 2;
              const targetCol = 2 * c + 2;

              return (
                <button
                  key={`slot-${r}-${c}`}
                  type="button"
                  onClick={() => handleWallSlotTap(r, c)}
                  disabled={!isMyTurn}
                  aria-label={`Wall slot ${r}, ${c}`}
                  style={{
                    gridRowStart: targetRow,
                    gridRowEnd: targetRow + 1,
                    gridColumnStart: targetCol,
                    gridColumnEnd: targetCol + 1,
                  }}
                  className={`relative z-30 rounded-full flex items-center justify-center focus:outline-none ${
                    isMyTurn ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  {/* Subtle snap guide dot ONLY during active wall drag */}
                  {activeDrag && (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600/40 pointer-events-none" />
                  )}
                  <span
                    className={`absolute -inset-2.5 sm:-inset-3 z-30 rounded-full ${
                      isP1Turn ? 'active:bg-blue-400/20' : 'active:bg-rose-400/20'
                    }`}
                  />
                </button>
              );
            })
          )}

          {/* 4. Active Snapped Wall Preview */}
          {previewWall && (
            <div
              style={{
                gridRowStart:
                  previewWall.orientation === 'H'
                    ? 2 * previewWall.r + 2
                    : 2 * previewWall.r + 1,
                gridRowEnd:
                  previewWall.orientation === 'H'
                    ? 2 * previewWall.r + 3
                    : 2 * previewWall.r + 4,
                gridColumnStart:
                  previewWall.orientation === 'H'
                    ? 2 * previewWall.c + 1
                    : 2 * previewWall.c + 2,
                gridColumnEnd:
                  previewWall.orientation === 'H'
                    ? 2 * previewWall.c + 4
                    : 2 * previewWall.c + 3,
              }}
              className={`z-25 rounded-full pointer-events-none transition-all duration-75 border ${
                previewWall.isValid
                  ? isP1Turn
                    ? 'bg-blue-500/45 border-blue-400/80 shadow-md'
                    : 'bg-rose-500/45 border-rose-400/80 shadow-md'
                  : 'bg-red-500/35 border-red-400/70 shadow-md animate-pulse'
              }`}
            />
          )}
        </div>
      </div>
    </div>
  );
});

GameBoard.displayName = 'GameBoard';
