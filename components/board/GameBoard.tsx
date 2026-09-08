'use client';

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Coordinate, GameState, PlayerId, Wall, WallOrientation } from '@/lib/game/types';
import { BOARD_SIZE, isSameCoord, PLAYER_THEMES } from '@/lib/game/board';
import { canPlaceWall, getActivePlayerIds } from '@/lib/game/engine';
import { getValidPawnMoves } from '@/lib/game/pathfinding';
import { sounds } from '@/lib/audio/sounds';
import { User, Crown } from 'lucide-react';
import { getMergedWallGroups, computeWallLayout, getWallJunctions, MergedWallGroup } from '@/lib/game/wallLayout';

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
  activeDrag: ActiveDragInfo | null;
  disabled?: boolean;
  isFlipped?: boolean;
}

export const GameBoard = forwardRef<GameBoardHandle, GameBoardProps>(({
  gameState,
  onMovePawn,
  onPlaceWall,
  clientPlayerId,
  activeDrag,
  disabled = false,
  isFlipped = false,
}, ref) => {
  const innerGridRef = useRef<HTMLDivElement>(null);
  const boardSize = gameState.boardSize || 9;
  const isCoreRace = gameState.variant === 'core_race';

  const activePlayerTheme = PLAYER_THEMES[gameState.currentTurn] || PLAYER_THEMES[1];
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

      let normX = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
      let normY = Math.max(0, Math.min(1, (y - rect.top) / rect.height));

      if (isFlipped) {
        normX = 1 - normX;
        normY = 1 - normY;
      }

      const c = Math.max(0, Math.min(boardSize - 2, Math.round(normX * boardSize - 1)));
      const r = Math.max(0, Math.min(boardSize - 2, Math.round(normY * boardSize - 1)));

      return { r, c };
    },
  }), [isFlipped, boardSize]);

  // Compute valid pawn moves for the active player against all other active opponents
  const otherOpponentPositions = getActivePlayerIds(gameState)
    .filter((id) => id !== gameState.currentTurn)
    .map((id) => gameState.players[id]?.position)
    .filter(Boolean);

  const validPawnMoves = isMyTurn && gameState.players[gameState.currentTurn]
    ? getValidPawnMoves(
        gameState.players[gameState.currentTurn].position,
        otherOpponentPositions,
        gameState.walls,
        boardSize
      )
    : [];

  // Handle cell click (Pawn movement)
  const handleCellClick = (r: number, c: number) => {
    if (!isMyTurn) return;

    const isValid = validPawnMoves.some((m) => isSameCoord(m, { r, c }));
    if (isValid) {
      sounds.playMove();
      onMovePawn({ r, c });
    }
  };

  // Determine wall preview (Exclusively active during drag-and-drop)
  const previewWall = activeDrag?.snappedCoord
    ? {
        r: activeDrag.snappedCoord.r,
        c: activeDrag.snappedCoord.c,
        orientation: activeDrag.orientation,
        isValid: activeDrag.isValid,
      }
    : null;

  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      {/* Floating HUD Feedback Toast - ONLY active during drag-and-drop */}
      {activeDrag && (
        <div className="fixed top-12 sm:top-14 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-200 animate-fadeIn">
          <span
            className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold shadow-2xl backdrop-blur-md transition-colors ${
              activeDrag.snappedCoord
                ? activeDrag.isValid
                  ? 'bg-zinc-900/90 text-white border border-emerald-500/60'
                  : 'bg-red-950/90 text-red-200 border border-red-500/50 animate-bounce'
                : 'bg-zinc-900/90 text-zinc-300 border border-zinc-700/70'
            }`}
          >
            {activeDrag.snappedCoord
              ? activeDrag.isValid
                ? 'Release to place wall ✓'
                : '⚠️ Cannot place wall here'
              : 'Drag over a grid line'}
          </span>
        </div>
      )}

      {/* Main Board Outer Frame */}
      <div
        className={`relative w-[95vw] ${
          boardSize > 11 ? 'max-w-[450px]' : 'max-w-[390px]'
        } aspect-square p-2 sm:p-3 rounded-2xl bg-white/95 border border-slate-200/90 shadow-xl dark:bg-zinc-900/95 dark:border-zinc-800 dark:shadow-2xl backdrop-blur-md flex items-center justify-center`}
      >
        {/* Goal Line / Core Indicators */}
        {isCoreRace ? (
          <div className="absolute -top-3 left-6 right-6 flex items-center justify-center pointer-events-none z-20">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-3.5 py-1 rounded-full border shadow-md text-amber-950 bg-amber-300 border-amber-400 dark:text-amber-200 dark:bg-gradient-to-r dark:from-amber-950 dark:via-amber-900 dark:to-amber-950 dark:border-amber-400/60 flex items-center gap-1.5 animate-pulse">
              <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Race to the Center Core</span>
            </span>
          </div>
        ) : (
          <>
            <div className="absolute -top-2.5 left-6 right-6 flex items-center justify-center pointer-events-none z-20">
              <span
                className={`text-[9px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full border shadow-md ${
                  isFlipped
                    ? 'text-rose-700 bg-rose-50 border-rose-300 dark:text-rose-200 dark:bg-gradient-to-r dark:from-rose-950 dark:via-rose-900 dark:to-rose-950 dark:border-rose-400/40'
                    : 'text-blue-700 bg-blue-50 border-blue-300 dark:text-sky-200 dark:bg-gradient-to-r dark:from-blue-950 dark:via-blue-900 dark:to-blue-950 dark:border-sky-400/40'
                }`}
              >
                {isFlipped
                  ? `▲ ${gameState.players[2]?.name || 'Player 2'} Finish Line ▲`
                  : `▲ ${gameState.players[1]?.name || 'Player 1'} Finish Line ▲`}
              </span>
            </div>
            <div className="absolute -bottom-2.5 left-6 right-6 flex items-center justify-center pointer-events-none z-20">
              <span
                className={`text-[9px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full border shadow-md ${
                  isFlipped
                    ? 'text-blue-700 bg-blue-50 border-blue-300 dark:text-sky-200 dark:bg-gradient-to-r dark:from-blue-950 dark:via-blue-900 dark:to-blue-950 dark:border-sky-400/40'
                    : 'text-rose-700 bg-rose-50 border-rose-300 dark:text-rose-200 dark:bg-gradient-to-r dark:from-rose-950 dark:via-rose-900 dark:to-rose-950 dark:border-rose-400/40'
                }`}
              >
                {isFlipped
                  ? `▼ ${gameState.players[1]?.name || 'Player 1'} Finish Line ▼`
                  : `▼ ${gameState.players[2]?.name || 'Player 2'} Finish Line ▼`}
              </span>
            </div>
          </>
        )}

        {/* Dynamic CSS Grid: Cells + Grooves */}
        <div
          ref={innerGridRef}
          className="relative w-full h-full grid select-none touch-manipulation transition-transform duration-300"
          style={{
            transform: isFlipped ? 'rotate(180deg)' : undefined,
            gridTemplateColumns: `repeat(${boardSize - 1}, 1fr clamp(4px, 1.4vw, 8px)) 1fr`,
            gridTemplateRows: `repeat(${boardSize - 1}, 1fr clamp(4px, 1.4vw, 8px)) 1fr`,
          }}
        >
          {/* Classic Finish Zone Ambient Highlights */}
          {!isCoreRace && (
            <>
              <div
                className="absolute -top-1 left-0 right-0 h-11 rounded-t-xl bg-gradient-to-b from-blue-500/25 via-blue-500/5 to-transparent pointer-events-none z-0"
                aria-hidden="true"
              />
              <div
                className="absolute -top-2 left-0 right-0 h-1.5 rounded-full bg-gradient-to-r from-blue-700 via-sky-300 to-blue-700 shadow-[0_2px_12px_rgba(56,189,248,0.55)] pointer-events-none z-10"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-1 left-0 right-0 h-11 rounded-b-xl bg-gradient-to-t from-rose-500/25 via-rose-500/5 to-transparent pointer-events-none z-0"
                aria-hidden="true"
              />
              <div
                className="absolute -bottom-2 left-0 right-0 h-1.5 rounded-full bg-gradient-to-r from-rose-700 via-pink-300 to-rose-700 shadow-[0_-2px_12px_rgba(244,63,94,0.55)] pointer-events-none z-10"
                aria-hidden="true"
              />
            </>
          )}

          {/* 1. Render Cells with Pawns and Center Core highlights */}
          {Array.from({ length: boardSize }).map((_, r) =>
            Array.from({ length: boardSize }).map((_, c) => {
              const coord: Coordinate = { r, c };

              // Find active player standing on this square
              const activePlayerIdOnSquare = getActivePlayerIds(gameState).find(
                (id) => isSameCoord(gameState.players[id]?.position, coord)
              );
              const playerOnSquare = activePlayerIdOnSquare ? gameState.players[activePlayerIdOnSquare] : null;
              const playerTheme = activePlayerIdOnSquare ? PLAYER_THEMES[activePlayerIdOnSquare] : null;

              const isValidMove = validPawnMoves.some((m) => isSameCoord(m, coord));
              const isCoreTile = isCoreRace && (gameState.coreTargets || []).some((t) => isSameCoord(t, coord));
              const isP1FinishLine = !isCoreRace && r === 0;
              const isP2FinishLine = !isCoreRace && r === boardSize - 1;

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
                  className={`group relative w-full h-full rounded-lg flex items-center justify-center transition-all duration-150 focus:outline-none tap-bounce z-[1] ${
                    isValidMove ? 'cursor-pointer' : ''
                  } ${
                    isCoreTile
                      ? 'bg-amber-400/20 dark:bg-amber-500/15 border-2 border-amber-400/80 dark:border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)] hover:border-amber-300'
                      : isP1FinishLine
                      ? 'bg-blue-500/[0.08] dark:bg-blue-500/[0.04] border border-slate-200/90 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700/60'
                      : isP2FinishLine
                      ? 'bg-rose-500/[0.08] dark:bg-rose-500/[0.04] border border-slate-200/90 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700/60'
                      : 'bg-slate-100/90 dark:bg-zinc-800/25 border border-slate-200/90 dark:border-zinc-800/70 hover:border-slate-300 dark:hover:border-zinc-700/60'
                  }`}
                >
                  {/* Golden Crown on Empty Center Core Tile */}
                  {isCoreTile && !playerOnSquare && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-pulse">
                      <Crown className="w-4 h-4 text-amber-500 drop-shadow-[0_1px_4px_rgba(245,158,11,0.8)]" />
                    </div>
                  )}

                  {/* Render Active Player Pawn */}
                  {playerOnSquare && playerTheme && (
                    <div className="w-full h-full flex items-center justify-center pawn-transition animate-pawn-land z-10">
                      {playerOnSquare.emoji ? (
                        <span
                          style={{
                            transform: isFlipped ? 'rotate(180deg)' : undefined,
                            filter: `drop-shadow(0 2px 3px rgba(0,0,0,0.35)) drop-shadow(0 0 4px ${playerTheme.ringColor})`,
                          }}
                          className="text-xl sm:text-2xl select-none leading-none flex items-center justify-center transition-transform hover:scale-110"
                        >
                          {playerOnSquare.emoji}
                        </span>
                      ) : (
                        <div
                          className={`w-[82%] h-[82%] rounded-full ${playerTheme.bgClass} border border-white/40 shadow-md flex items-center justify-center font-bold text-white`}
                        >
                          <User
                            style={{ transform: isFlipped ? 'rotate(180deg)' : undefined }}
                            className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white/95 drop-shadow"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Clean move hint glowing circle */}
                  {isValidMove && !playerOnSquare && (
                    <div
                      style={{
                        filter: `drop-shadow(0 2px 3px rgba(0,0,0,0.35)) drop-shadow(0 0 5px ${activePlayerTheme.ringColor})`,
                      }}
                      className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-transform duration-200 group-hover:scale-125 group-active:scale-95 ${activePlayerTheme.bgClass} shadow-md`}
                    />
                  )}
                </button>
              );
            })
          )}

          {/* 2. Render Placed Walls with Seamless Connections */}
          {getMergedWallGroups(gameState.walls).map((group) => {
            const layout = computeWallLayout(group, gameState.walls);
            const wallTheme = PLAYER_THEMES[group.placedBy] || PLAYER_THEMES[1];

            return (
              <div
                key={group.wallIds.join('-')}
                style={{
                  gridRowStart: layout.gridRowStart,
                  gridRowEnd: layout.gridRowEnd,
                  gridColumnStart: layout.gridColStart,
                  gridColumnEnd: layout.gridColEnd,
                  marginRight: layout.marginRight,
                  marginLeft: layout.marginLeft,
                  marginTop: layout.marginTop,
                  marginBottom: layout.marginBottom,
                  zIndex: layout.zIndex ?? 20,
                }}
                className={`pointer-events-none self-stretch h-full w-full border ${layout.shadowClass || 'wall-slab'} ${layout.roundedClass} ${layout.borderClass} ${
                  group.isLatest ? 'animate-wall-slam' : ''
                } ${wallTheme.wallBg} ${wallTheme.wallBorder}`}
              />
            );
          })}

          {/* 2b. Render Seamless Wall Junction Connectors for Perpendicular Intersections */}
          {getWallJunctions(gameState.walls).map((junction) => {
            const junctionTheme = PLAYER_THEMES[junction.placedBy] || PLAYER_THEMES[1];

            return (
              <div
                key={`junction-${junction.placedBy}-${junction.r}-${junction.c}`}
                style={{
                  gridRowStart: junction.gridRowStart,
                  gridRowEnd: junction.gridRowEnd,
                  gridColumnStart: junction.gridColStart,
                  gridColumnEnd: junction.gridColEnd,
                  zIndex: 25,
                }}
                className="relative w-full h-full pointer-events-none"
              >
                <div
                  style={{
                    top: junction.top,
                    bottom: junction.bottom,
                    left: junction.left,
                    right: junction.right,
                    boxShadow: junction.boxShadow,
                  }}
                  className={`absolute ${junction.borderClasses} ${junction.roundedClasses} ${junctionTheme.wallBg} ${junctionTheme.wallBorder}`}
                />
              </div>
            );
          })}

          {/* 3. Render Wall Intersection Snap Guides */}
          {Array.from({ length: boardSize - 1 }).map((_, r) =>
            Array.from({ length: boardSize - 1 }).map((_, c) => {
              const targetRow = 2 * r + 2;
              const targetCol = 2 * c + 2;

              return (
                <div
                  key={`slot-${r}-${c}`}
                  style={{
                    gridRowStart: targetRow,
                    gridRowEnd: targetRow + 1,
                    gridColumnStart: targetCol,
                    gridColumnEnd: targetCol + 1,
                  }}
                  className="relative z-30 flex items-center justify-center pointer-events-none select-none"
                >
                  {/* Subtle snap guide dot ONLY during active wall drag */}
                  {activeDrag && (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400/60 dark:bg-zinc-600/40 pointer-events-none" />
                  )}
                </div>
              );
            })
          )}

          {/* 4. Active Snapped Wall Preview with Seamless Connection */}
          {previewWall && (() => {
            const previewGroup: MergedWallGroup = {
              orientation: previewWall.orientation,
              placedBy: gameState.currentTurn,
              r: previewWall.r,
              c: previewWall.c,
              rStart: previewWall.r,
              rEnd: previewWall.r,
              cStart: previewWall.c,
              cEnd: previewWall.c,
              isLatest: false,
              wallIds: ['preview'],
            };
            const previewLayout = computeWallLayout(previewGroup, gameState.walls);
            const previewJunctions = previewWall.isValid
              ? getWallJunctions([
                  ...gameState.walls,
                  {
                    r: previewWall.r,
                    c: previewWall.c,
                    orientation: previewWall.orientation,
                    placedBy: gameState.currentTurn,
                  },
                ]).filter((j) => j.placedBy === gameState.currentTurn)
              : [];

            return (
              <>
                <div
                  style={{
                    gridRowStart: previewLayout.gridRowStart,
                    gridRowEnd: previewLayout.gridRowEnd,
                    gridColumnStart: previewLayout.gridColStart,
                    gridColumnEnd: previewLayout.gridColEnd,
                    marginRight: previewLayout.marginRight,
                    marginLeft: previewLayout.marginLeft,
                    marginTop: previewLayout.marginTop,
                    marginBottom: previewLayout.marginBottom,
                    zIndex: previewLayout.zIndex ?? 25,
                  }}
                  className={`pointer-events-none self-stretch h-full w-full transition-all duration-75 border ${previewLayout.shadowClass || 'shadow-md'} ${previewLayout.roundedClass} ${previewLayout.borderClass} ${
                    previewWall.isValid
                      ? `${activePlayerTheme.wallBg}/40 ${activePlayerTheme.wallBorder} shadow-md`
                      : 'bg-red-500/35 border-red-400/70 shadow-md animate-pulse'
                  }`}
                />
                {previewJunctions.map((j) => (
                  <div
                    key={`preview-j-${j.r}-${j.c}`}
                    style={{
                      gridRowStart: j.gridRowStart,
                      gridRowEnd: j.gridRowEnd,
                      gridColumnStart: j.gridColStart,
                      gridColumnEnd: j.gridColEnd,
                      zIndex: 26,
                    }}
                    className="relative w-full h-full pointer-events-none"
                  >
                    <div
                      style={{
                        top: j.top,
                        bottom: j.bottom,
                        left: j.left,
                        right: j.right,
                        boxShadow: j.boxShadow,
                      }}
                      className={`absolute ${j.borderClasses} ${j.roundedClasses} ${activePlayerTheme.wallBg}/40 ${activePlayerTheme.wallBorder}`}
                    />
                  </div>
                ))}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
});

GameBoard.displayName = 'GameBoard';
