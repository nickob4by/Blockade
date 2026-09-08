import React from 'react';
import { PlayerState, Wall } from '@/lib/game/types';
import { PLAYER_THEMES } from '@/lib/game/board';
import { Shield, Sparkles, User } from 'lucide-react';

interface PlayerCardProps {
  player: PlayerState;
  isCurrentTurn: boolean;
  walls: Wall[];
  isClientPlayer?: boolean;
  targetDescription?: string;
  totalWalls?: number;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isCurrentTurn,
  isClientPlayer,
  targetDescription,
  totalWalls = 10,
}) => {
  const theme = PLAYER_THEMES[player.id] || PLAYER_THEMES[1];

  return (
    <div
      className={`w-full flex items-center justify-between px-3 py-1.5 sm:py-2 rounded-xl border transition-all duration-150 ${
        isCurrentTurn
          ? `bg-slate-50/90 dark:bg-zinc-900/90 ${theme.borderClass} shadow-sm ring-1`
          : 'bg-white/80 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800/80 opacity-80'
      }`}
      style={isCurrentTurn ? { borderColor: theme.ringColor } : undefined}
    >
      {/* Player identity */}
      <div className="flex items-center gap-2 min-w-0">
        {player.emoji ? (
          <span
            className="text-xl sm:text-2xl leading-none select-none flex-shrink-0"
            style={{
              filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.3)) drop-shadow(0 0 3px ${theme.ringColor})`,
            }}
          >
            {player.emoji}
          </span>
        ) : (
          <div
            className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs sm:text-sm border shadow-sm ${theme.bgClass} text-white`}
          >
            <User className="w-3.5 h-3.5 text-white/95 drop-shadow" />
          </div>
        )}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-zinc-100 truncate max-w-[150px] sm:max-w-none">
              {player.name}
            </span>
            {isClientPlayer && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded border bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-500/40">
                YOU
              </span>
            )}
            {isCurrentTurn && (
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full text-white flex items-center gap-0.5 ${theme.bgClass}`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                Turn
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-zinc-400 leading-tight">
            Target: {targetDescription ?? (player.id === 1 ? 'Top Row (Row 1)' : 'Bottom Row')}
          </span>
        </div>
      </div>

      {/* Remaining walls count & clean mini pills */}
      <div className="flex flex-col items-end justify-center flex-shrink-0">
        <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 dark:text-zinc-300">
          <Shield className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
          <span>
            <strong className={`font-bold text-xs ${theme.textClass}`}>
              {player.wallsLeft}
            </strong>
            <span className="text-slate-400 dark:text-zinc-500">/{totalWalls}</span>
          </span>
        </div>

        {/* Player-colored mini wall pills */}
        <div className="flex items-center gap-0.5 mt-0.5">
          {Array.from({ length: totalWalls }).map((_, i) => (
            <div
              key={i}
              className={`w-1 h-2 rounded-sm transition-colors ${
                i < player.wallsLeft ? theme.bgClass : 'bg-slate-200 dark:bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
