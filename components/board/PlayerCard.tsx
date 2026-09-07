import React from 'react';
import { PlayerState, Wall } from '@/lib/game/types';
import { findShortestPath } from '@/lib/game/pathfinding';
import { Shield, Sparkles } from 'lucide-react';

interface PlayerCardProps {
  player: PlayerState;
  isCurrentTurn: boolean;
  walls: Wall[];
  isClientPlayer?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isCurrentTurn,
  walls,
  isClientPlayer,
}) => {
  const isP1 = player.id === 1;
  const path = findShortestPath(player.position, player.targetRow, walls);
  const stepsToGoal = path ? path.length - 1 : null;

  return (
    <div
      className={`w-full flex items-center justify-between px-3 py-1.5 sm:py-2 rounded-xl border transition-all duration-150 ${
        isCurrentTurn
          ? isP1
            ? 'bg-zinc-900/90 border-blue-500/50 shadow-tactile-sm ring-1 ring-blue-500/20'
            : 'bg-zinc-900/90 border-rose-500/50 shadow-tactile-sm ring-1 ring-rose-500/20'
          : 'bg-zinc-900/60 border-zinc-800/80 opacity-75'
      }`}
    >
      {/* Player identity */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-xs text-white shadow-tactile-sm border ${
            isP1
              ? 'bg-blue-600 border-blue-400/40'
              : 'bg-rose-600 border-rose-400/40'
          }`}
        >
          {isP1 ? 'P1' : 'P2'}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="font-bold text-xs sm:text-sm text-zinc-100 truncate max-w-[110px] sm:max-w-none">
              {player.name}
            </span>
            {isClientPlayer && (
              <span
                className={`text-[9px] font-bold px-1 rounded border ${
                  isP1
                    ? 'bg-blue-950 text-blue-300 border-blue-500/40'
                    : 'bg-rose-950 text-rose-300 border-rose-500/40'
                }`}
              >
                YOU
              </span>
            )}
            {isCurrentTurn && (
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white flex items-center gap-0.5 ${
                  isP1 ? 'bg-blue-500' : 'bg-rose-500'
                }`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                Turn
              </span>
            )}
          </div>
          <span className="text-[10px] text-zinc-400 leading-tight">
            Goal: Row {isP1 ? '1 (Top)' : '9 (Bottom)'}
            {stepsToGoal !== null && (
              <span className="text-zinc-500 ml-1.5">• {stepsToGoal} steps</span>
            )}
          </span>
        </div>
      </div>

      {/* Remaining walls count & clean mini pills */}
      <div className="flex flex-col items-end justify-center flex-shrink-0">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-300">
          <Shield className={`w-3 h-3 ${isP1 ? 'text-blue-400' : 'text-rose-400'}`} />
          <span>
            <strong className={`font-bold text-xs ${isP1 ? 'text-blue-300' : 'text-rose-300'}`}>
              {player.wallsLeft}
            </strong>
            <span className="text-zinc-500">/10</span>
          </span>
        </div>

        {/* 10 player-colored mini wall pills */}
        <div className="flex items-center gap-0.5 mt-0.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`w-1 h-2 rounded-sm transition-colors ${
                i < player.wallsLeft
                  ? isP1
                    ? 'bg-blue-400'
                    : 'bg-rose-400'
                  : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
