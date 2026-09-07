import React from 'react';
import { PlayerState, Wall } from '@/lib/game/types';
import { Shield, Sparkles, User } from 'lucide-react';

interface PlayerCardProps {
  player: PlayerState;
  isCurrentTurn: boolean;
  walls: Wall[];
  isClientPlayer?: boolean;
  targetDescription?: string;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isCurrentTurn,
  isClientPlayer,
  targetDescription,
}) => {
  const isP1 = player.id === 1;

  return (
    <div
      className={`w-full flex items-center justify-between px-3 py-1.5 sm:py-2 rounded-xl border transition-all duration-150 ${
        isCurrentTurn
          ? isP1
            ? 'bg-blue-50/90 dark:bg-zinc-900/90 border-blue-400/60 dark:border-blue-500/50 shadow-sm ring-1 ring-blue-500/20'
            : 'bg-rose-50/90 dark:bg-zinc-900/90 border-rose-400/60 dark:border-rose-500/50 shadow-sm ring-1 ring-rose-500/20'
          : 'bg-white/80 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800/80 opacity-80'
      }`}
    >
      {/* Player identity */}
      <div className="flex items-center gap-2 min-w-0">
        {player.emoji ? (
          <span
            className="text-xl sm:text-2xl leading-none select-none flex-shrink-0"
            style={{
              filter: isP1
                ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.3)) drop-shadow(0 0 3px rgba(56,189,248,0.45))'
                : 'drop-shadow(0 1px 2px rgba(0,0,0,0.3)) drop-shadow(0 0 3px rgba(244,63,94,0.45))',
            }}
          >
            {player.emoji}
          </span>
        ) : (
          <div
            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs sm:text-sm border shadow-sm ${
              isP1
                ? 'bg-blue-100 dark:bg-blue-950/80 border-blue-300 dark:border-blue-500/40 text-blue-600 dark:text-blue-400'
                : 'bg-rose-100 dark:bg-rose-950/80 border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400'
            }`}
          >
            <User className="w-3.5 h-3.5 text-slate-700 dark:text-white/90" />
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-zinc-100 truncate max-w-[150px] sm:max-w-none">
              {player.name}
            </span>
            {isClientPlayer && (
              <span
                className={`text-[9px] font-bold px-1 rounded border ${
                  isP1
                    ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-500/40'
                    : 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-500/40'
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
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight">
            Target: {targetDescription ?? (isP1 ? 'Top Row (Row 1)' : 'Bottom Row (Row 9)')}
          </span>
        </div>
      </div>

      {/* Remaining walls count & clean mini pills */}
      <div className="flex flex-col items-end justify-center flex-shrink-0">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
          <Shield className={`w-3 h-3 ${isP1 ? 'text-blue-500 dark:text-blue-400' : 'text-rose-500 dark:text-rose-400'}`} />
          <span>
            <strong className={`font-bold text-xs ${isP1 ? 'text-blue-600 dark:text-blue-300' : 'text-rose-600 dark:text-rose-300'}`}>
              {player.wallsLeft}
            </strong>
            <span className="text-slate-400 dark:text-zinc-500">/10</span>
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
                    ? 'bg-blue-500 dark:bg-blue-400'
                    : 'bg-rose-500 dark:bg-rose-400'
                  : 'bg-slate-200 dark:bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
