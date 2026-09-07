import React from 'react';
import { PlayerId, PlayerState } from '@/lib/game/types';
import { findShortestPath } from '@/lib/game/pathfinding';
import { Wall } from '@/lib/game/types';
import { Shield, Trophy, Flame } from 'lucide-react';

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
      className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-xl border transition-all duration-300 ${
        isCurrentTurn
          ? isP1
            ? 'bg-sky-950/40 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.25)] ring-1 ring-sky-400/50'
            : 'bg-rose-950/40 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.25)] ring-1 ring-rose-400/50'
          : 'bg-slate-900/60 border-slate-800 opacity-85 hover:opacity-100'
      }`}
    >
      {/* Turn indicator badge */}
      {isCurrentTurn && (
        <div
          className={`absolute -top-2.5 left-4 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 text-white shadow-sm ${
            isP1 ? 'bg-sky-500 animate-pulse' : 'bg-rose-500 animate-pulse'
          }`}
        >
          <Flame className="w-3 h-3" />
          Turn
        </div>
      )}

      {/* Player info & avatar */}
      <div className="flex items-center gap-3">
        <div
          className={`relative w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-md border ${
            isP1
              ? 'bg-gradient-to-tr from-sky-600 to-sky-400 border-sky-300/50 glow-p1'
              : 'bg-gradient-to-tr from-rose-600 to-rose-400 border-rose-300/50 glow-p2'
          }`}
        >
          {isP1 ? 'P1' : 'P2'}
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm sm:text-base text-slate-100">
              {player.name}
            </span>
            {isClientPlayer && (
              <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                You
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span className="flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              Target: Row {isP1 ? '1 (Top)' : '9 (Bottom)'}
            </span>
            {stepsToGoal !== null && (
              <span className="hidden xs:inline-block text-slate-500">• {stepsToGoal} steps</span>
            )}
          </div>
        </div>
      </div>

      {/* Walls counter & sticks visualizer */}
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1 text-xs font-medium text-slate-300">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>
            <strong className="text-amber-300 font-bold text-sm">{player.wallsLeft}</strong>/10
          </span>
          <span className="hidden sm:inline text-slate-400 text-[11px]">walls</span>
        </div>

        {/* Mini wall sticks display */}
        <div className="flex items-center gap-0.5 h-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`w-1 sm:w-1.5 h-3 rounded-full transition-all duration-200 ${
                i < player.wallsLeft
                  ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.6)]'
                  : 'bg-slate-800 border border-slate-700/50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
