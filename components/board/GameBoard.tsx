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
  disabled?: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  onMovePawn,
  onPlaceWall,
  clientPlayerId,
  orientation,
  onToggleOrientation,
  disabled = false,
}) => {
  const [hoveredWall, setHoveredWall] = useState<{
    r: number;
    c: number;
    orientation: WallOrientation;
  } | null>(null);
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

  // Update wall preview validation when hovered or orientation changes
  useEffect(() => {
    if (!hoveredWall || !isMyTurn) {
      setValidationError(null);
      return;
    }

    const check = canPlaceWall(gameState, {
      r: hoveredWall.r,
      c: hoveredWall.c,
      orientation: hoveredWall.orientation,
    });

    if (!check.valid) {
      setValidationError(check.reason || 'Invalid placement');
    } else {
      setValidationError(null);
    }
  }, [hoveredWall, gameState, isMyTurn]);

  // Handle cell click
  const handleCellClick = (r: number, c: number) => {
    if (!isMyTurn) return;

    const isValid = validPawnMoves.some((m) => isSameCoord(m, { r, c }));
    if (isValid) {
      sounds.playMove();
      onMovePawn({ r, c });
    }
  };

  // Handle wall placement click
  const handleWallClick = (r: number, c: number) => {
    if (!isMyTurn) return;

    const candidate = { r, c, orientation };
    const check = canPlaceWall(gameState, candidate);

    if (check.valid) {
      sounds.playWall();
      onPlaceWall(candidate);
      setHoveredWall(null);
    } else {
      sounds.playInvalid();
      setValidationError(check.reason || 'Invalid wall placement');
    }
  };

  // Hotkey listener: Spacebar or 'R' toggles orientation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space' || e.key.toLowerCase() === 'r') {
        e.preventDefault();
        onToggleOrientation();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleOrientation]);

  return (
    <div className="relative flex flex-col items-center">
      {/* Dynamic feedback banner for invalid placement */}
      <div className="h-6 mb-1 text-center">
        {validationError && (
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-500/50 animate-bounce">
            ⚠️ {validationError}
          </span>
        )}
      </div>

      {/* Main Board Container */}
      <div className="relative p-3 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-md">
        {/* Goal edge indicators */}
        <div className="absolute top-1 left-6 right-6 flex items-center justify-center gap-2 text-[11px] font-bold text-sky-400/80 tracking-widest uppercase pointer-events-none">
          <span>▲ Player 1 Goal Line (Top) ▲</span>
        </div>
        <div className="absolute bottom-1 left-6 right-6 flex items-center justify-center gap-2 text-[11px] font-bold text-rose-400/80 tracking-widest uppercase pointer-events-none">
          <span>▼ Player 2 Goal Line (Bottom) ▼</span>
        </div>

        {/* 17x17 Grid: 9 Cells + 8 Grooves */}
        <div
          className="grid select-none"
          style={{
            gridTemplateColumns:
              'repeat(8, minmax(28px, 48px) minmax(8px, 12px)) minmax(28px, 48px)',
            gridTemplateRows:
              'repeat(8, minmax(28px, 48px) minmax(8px, 12px)) minmax(28px, 48px)',
          }}
        >
          {/* 1. Render all 9x9 Cells */}
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
                  className={`relative aspect-square rounded-lg flex items-center justify-center transition-all duration-150 focus:outline-none ${
                    isValidMove
                      ? 'bg-emerald-950/40 border-2 border-emerald-400/80 cursor-pointer shadow-[0_0_12px_rgba(52,211,153,0.4)] hover:bg-emerald-900/50 scale-95 hover:scale-100'
                      : 'bg-slate-800/80 border border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  {/* Pawn 1 */}
                  {isP1 && (
                    <div className="w-4/5 h-4/5 rounded-full bg-gradient-to-tr from-sky-600 to-sky-300 border-2 border-white shadow-neon-p1 flex items-center justify-center font-bold text-xs text-white pawn-transition animate-pulse-subtle">
                      P1
                    </div>
                  )}

                  {/* Pawn 2 */}
                  {isP2 && (
                    <div className="w-4/5 h-4/5 rounded-full bg-gradient-to-tr from-rose-600 to-rose-300 border-2 border-white shadow-neon-p2 flex items-center justify-center font-bold text-xs text-white pawn-transition animate-pulse-subtle">
                      P2
                    </div>
                  )}

                  {/* Valid move target pulse ring */}
                  {isValidMove && !isP1 && !isP2 && (
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-ping" />
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
                key={`wall-${index}`}
                style={{
                  gridRowStart,
                  gridRowEnd,
                  gridColumnStart: gridColStart,
                  gridColumnEnd: gridColEnd,
                }}
                className={`z-20 rounded-full shadow-neon-wall flex items-center justify-center pointer-events-none transition-all duration-200 ${
                  wall.placedBy === 1
                    ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 border border-amber-200'
                    : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 border border-amber-200'
                }`}
              />
            );
          })}

          {/* 3. Render Wall Placement Hover Zones (8x8 Intersections) */}
          {Array.from({ length: BOARD_SIZE - 1 }).map((_, r) =>
            Array.from({ length: BOARD_SIZE - 1 }).map((_, c) => {
              const isHovered =
                hoveredWall?.r === r &&
                hoveredWall?.c === c &&
                hoveredWall?.orientation === orientation;

              // Invisible interactive target at the intersection
              const targetRow = 2 * r + 2;
              const targetCol = 2 * c + 2;

              return (
                <button
                  key={`slot-${r}-${c}`}
                  type="button"
                  onClick={() => handleWallClick(r, c)}
                  onMouseEnter={() => setHoveredWall({ r, c, orientation })}
                  onMouseLeave={() => setHoveredWall(null)}
                  disabled={!isMyTurn}
                  aria-label={`Wall slot ${r}, ${c}`}
                  style={{
                    gridRowStart: targetRow,
                    gridRowEnd: targetRow + 1,
                    gridColumnStart: targetCol,
                    gridColumnEnd: targetCol + 1,
                  }}
                  className={`z-30 rounded-full transition-colors duration-100 flex items-center justify-center cursor-pointer ${
                    isMyTurn ? 'hover:bg-amber-400/40' : 'cursor-default'
                  }`}
                />
              );
            })
          )}

          {/* 4. Render Active Hover Preview Wall */}
          {isMyTurn && hoveredWall && (
            <div
              style={{
                gridRowStart:
                  hoveredWall.orientation === 'H'
                    ? 2 * hoveredWall.r + 2
                    : 2 * hoveredWall.r + 1,
                gridRowEnd:
                  hoveredWall.orientation === 'H'
                    ? 2 * hoveredWall.r + 3
                    : 2 * hoveredWall.r + 4,
                gridColumnStart:
                  hoveredWall.orientation === 'H'
                    ? 2 * hoveredWall.c + 1
                    : 2 * hoveredWall.c + 2,
                gridColumnEnd:
                  hoveredWall.orientation === 'H'
                    ? 2 * hoveredWall.c + 4
                    : 2 * hoveredWall.c + 3,
              }}
              className={`z-25 rounded-full pointer-events-none transition-all duration-75 border ${
                validationError
                  ? 'bg-rose-500/60 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse'
                  : 'bg-amber-400/75 border-amber-200 shadow-[0_0_14px_rgba(251,191,36,0.8)]'
              }`}
            />
          )}
        </div>
      </div>
    </div>
  );
};
