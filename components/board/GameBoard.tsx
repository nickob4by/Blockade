'use client';

import React, { useState, useEffect } from 'react';
import { Coordinate, GameState, PlayerId, Wall, WallOrientation } from '@/lib/game/types';
import { BOARD_SIZE, isSameCoord } from '@/lib/game/board';
import { canPlaceWall } from '@/lib/game/engine';
import { getValidPawnMoves } from '@/lib/game/pathfinding';
import { sounds } from '@/lib/audio/sounds';

interface GameBoardProps {
  gameState: GameState;
  onMovePawn: (target: Coordinate) => void;
  onPlaceWall: (placement: { r: number; c: number; orientation: WallOrientation }) => void;
  clientPlayerId: PlayerId;
  orientation: WallOrientation;
  onToggleOrientation: () => void;
  selectedWall: { r: number; c: number; orientation: WallOrientation } | null;
  setSelectedWall: (wall: { r: number; c: number; orientation: WallOrientation } | null) => void;
  disabled?: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  onMovePawn,
  onPlaceWall,
  clientPlayerId,
  orientation,
  onToggleOrientation,
  selectedWall,
  setSelectedWall,
  disabled = false,
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);

  const isMyTurn = !disabled && gameState.currentTurn === clientPlayerId && gameState.status === 'playing';

  // Compute valid pawn moves for the active player
  const validPawnMoves = isMyTurn
    ? getValidPawnMoves(
        gameState.players[gameState.currentTurn].position,
        gameState.players[gameState.currentTurn === 1 ? 2 : 1].position,
        gameState.walls
      )
    : [];

  // Re-validate selected wall whenever selectedWall or orientation changes
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

    // If a ghost wall was selected, tapping a valid move deselects the wall and moves
    const isValid = validPawnMoves.some((m) => isSameCoord(m, { r, c }));
    if (isValid) {
      setSelectedWall(null);
      sounds.playMove();
      onMovePawn({ r, c });
    }
  };

  // Handle wall slot tap (Phone-optimized 2-step placement)
  const handleWallSlotTap = (r: number, c: number) => {
    if (!isMyTurn) return;

    if (gameState.players[gameState.currentTurn].wallsLeft <= 0) {
      sounds.playInvalid();
      setValidationError('No walls remaining');
      return;
    }

    // If tapping the already selected wall slot: confirm placement!
    if (selectedWall && selectedWall.r === r && selectedWall.c === c) {
      const check = canPlaceWall(gameState, { r, c, orientation: selectedWall.orientation });
      if (check.valid) {
        sounds.playWall();
        onPlaceWall({ r, c, orientation: selectedWall.orientation });
        setSelectedWall(null);
        setValidationError(null);
      } else {
        sounds.playInvalid();
        setValidationError(check.reason || 'Cannot place wall here');
      }
      return;
    }

    // Otherwise, select this wall slot as preview
    setSelectedWall({ r, c, orientation });
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {/* Mobile feedback banner */}
      <div className="h-5 mb-1 flex items-center justify-center text-center">
        {validationError ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/90 text-rose-300 border border-rose-500/60 animate-bounce shadow-md">
            ⚠️ {validationError}
          </span>
        ) : selectedWall ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40">
            Tap slot again or press Confirm
          </span>
        ) : null}
      </div>

      {/* Main Board Container */}
      <div className="relative w-[94vw] max-w-[390px] aspect-square p-2 sm:p-3 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md flex items-center justify-center">
        {/* Subtle Top & Bottom Goal Line Marks */}
        <div className="absolute -top-2 left-6 right-6 flex items-center justify-center pointer-events-none">
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-sky-400/70 bg-slate-900 px-2 rounded border border-sky-400/20">
            ▲ P1 Goal (Top) ▲
          </span>
        </div>
        <div className="absolute -bottom-2 left-6 right-6 flex items-center justify-center pointer-events-none">
          <span className="text-[9px] font-extrabold uppercase tracking-widest text-rose-400/70 bg-slate-900 px-2 rounded border border-rose-400/20">
            ▼ P2 Goal (Bottom) ▼
          </span>
        </div>

        {/* 17x17 CSS Grid: 9 Cells + 8 Grooves */}
        <div
          className="w-full h-full grid select-none touch-manipulation"
          style={{
            gridTemplateColumns:
              'repeat(8, 1fr clamp(6px, 1.8vw, 10px)) 1fr',
            gridTemplateRows:
              'repeat(8, 1fr clamp(6px, 1.8vw, 10px)) 1fr',
          }}
        >
          {/* 1. Render Cells (9x9) */}
          {Array.from({ length: BOARD_SIZE }).map((_, r) =>
            Array.from({ length: BOARD_SIZE }).map((_, c) => {
              const coord: Coordinate = { r, c };
              const isP1 = isSameCoord(gameState.players[1].position, coord);
              const isP2 = isSameCoord(gameState.players[2].position, coord);
              const isValidMove = validPawnMoves.some((m) => isSameCoord(m, coord));

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
                  className={`relative w-full h-full rounded-md flex items-center justify-center transition-all duration-150 focus:outline-none tap-bounce ${
                    isValidMove
                      ? 'bg-emerald-950/60 border-2 border-emerald-400/90 shadow-[0_0_10px_rgba(52,211,153,0.5)] cursor-pointer'
                      : 'bg-slate-800/80 border border-slate-700/50'
                  }`}
                >
                  {/* Pawn 1 */}
                  {isP1 && (
                    <div className="w-[82%] h-[82%] rounded-full bg-gradient-to-tr from-sky-600 via-sky-500 to-sky-300 border-2 border-white shadow-neon-p1 flex items-center justify-center font-black text-[10px] sm:text-xs text-white pawn-transition">
                      P1
                    </div>
                  )}

                  {/* Pawn 2 */}
                  {isP2 && (
                    <div className="w-[82%] h-[82%] rounded-full bg-gradient-to-tr from-rose-600 via-rose-500 to-rose-300 border-2 border-white shadow-neon-p2 flex items-center justify-center font-black text-[10px] sm:text-xs text-white pawn-transition">
                      P2
                    </div>
                  )}

                  {/* Move hint target dot */}
                  {isValidMove && !isP1 && !isP2 && (
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-300 shadow-[0_0_6px_rgba(110,231,183,0.9)] animate-ping" />
                  )}
                </button>
              );
            })
          )}

          {/* 2. Render Placed Walls */}
          {gameState.walls.map((wall, index) => {
            const isHorizontal = wall.orientation === 'H';
            const gridRowStart = isHorizontal ? 2 * wall.r + 2 : 2 * wall.r + 1;
            const gridRowEnd = isHorizontal ? 2 * wall.r + 3 : 2 * wall.r + 4;
            const gridColStart = isHorizontal ? 2 * wall.c + 1 : 2 * wall.c + 2;
            const gridColEnd = isHorizontal ? 2 * wall.c + 4 : 2 * wall.c + 3;

            return (
              <div
                key={`placed-wall-${index}`}
                style={{
                  gridRowStart,
                  gridRowEnd,
                  gridColumnStart: gridColStart,
                  gridColumnEnd: gridColEnd,
                }}
                className="z-20 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 border border-amber-200 shadow-neon-wall pointer-events-none"
              />
            );
          })}

          {/* 3. Render Wall Slots & Touch Hitboxes (8x8 Intersections) */}
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
                  {/* Expanded invisible touch hit area (covers 28px around intersection for easy thumb taps) */}
                  <span className="absolute -inset-2 sm:-inset-3 z-30 rounded-full active:bg-amber-400/20" />
                </button>
              );
            })
          )}

          {/* 4. Active Ghost Wall Preview (Phone Tap Selection) */}
          {isMyTurn && selectedWall && (
            <div
              style={{
                gridRowStart:
                  selectedWall.orientation === 'H'
                    ? 2 * selectedWall.r + 2
                    : 2 * selectedWall.r + 1,
                gridRowEnd:
                  selectedWall.orientation === 'H'
                    ? 2 * selectedWall.r + 3
                    : 2 * selectedWall.r + 4,
                gridColumnStart:
                  selectedWall.orientation === 'H'
                    ? 2 * selectedWall.c + 1
                    : 2 * selectedWall.c + 2,
                gridColumnEnd:
                  selectedWall.orientation === 'H'
                    ? 2 * selectedWall.c + 4
                    : 2 * selectedWall.c + 3,
              }}
              className={`z-25 rounded-full pointer-events-none transition-all duration-150 border-2 ${
                validationError
                  ? 'bg-rose-500/70 border-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.7)] animate-pulse'
                  : 'bg-amber-400/85 border-white shadow-[0_0_16px_rgba(251,191,36,0.9)]'
              }`}
            />
          )}
        </div>
      </div>
    </div>
  );
};
