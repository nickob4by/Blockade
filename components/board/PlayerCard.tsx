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
      className={`w-full flex items-center justify-between px-3 py-1.5 sm:py-2 rounded-xl border transition-all duration-200 ${
        isCurrentTurn
          ? isP1
            ? 'bg-sky-950/70 border-sky-400/80 shadow-[0_0_12px_rgba(56,189,248,0.25)] ring-1 ring-sky-400/40'
            : 'bg-rose-950/70 border-rose-400/80 shadow-[0_0_12px_rgba(244,63,94,0.25)] ring-1 ring-rose-400/40'
          : 'bg-slate-900/60 border-slate-800/80 opacity-80'
      }`}
    >
      {/* Player identity */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-black text-xs text-white shadow-sm border ${
            isP1
              ? 'bg-gradient-to-tr from-sky-600 to-sky-400 border-sky-300/40'
              : 'bg-gradient-to-tr from-rose-600 to-rose-400 border-rose-300/40'
          }`}
        >
          {isP1 ? 'P1' : 'P2'}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="font-bold text-xs sm:text-sm text-slate-100 truncate max-w-[110px] sm:max-w-none">
              {player.name}
            </span>
            {isClientPlayer && (
              <span className="text-[9px] bg-slate-800 text-sky-300 font-bold px-1 rounded border border-slate-700">
                YOU
              </span>
            )}
            {isCurrentTurn && (
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full text-white flex items-center gap-0.5 animate-pulse ${
                  isP1 ? 'bg-sky-500' : 'bg-rose-500'
                }`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                Turn
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 leading-tight">
            Goal: Row {isP1 ? '1 (Top)' : '9 (Bottom)'}
            {stepsToGoal !== null && (
              <span className="text-slate-500 ml-1.5">• {stepsToGoal} steps</span>
            )}
          </span>
        </div>
      </div>

      {/* Remaining walls count & mini sticks */}
      <div className="flex flex-col items-end justify-center flex-shrink-0">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-300">
          <Shield className="w-3 h-3 text-amber-400" />
          <span>
            <strong className="text-amber-300 font-bold text-xs">{player.wallsLeft}</strong>
            <span className="text-slate-500">/10</span>
          </span>
        </div>

        {/* 10 mini wall bars */}
        <div className="flex items-center gap-0.5 mt-0.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`w-1 h-2 rounded-full transition-colors ${
                i < player.wallsLeft
                  ? 'bg-amber-400 shadow-[0_0_2px_rgba(251,191,36,0.6)]'
                  : 'bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
