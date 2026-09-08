'use client';

import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { PlayerId } from '@/lib/game/types';
import { PLAYER_THEMES } from '@/lib/game/board';

interface TurnTimerBarProps {
  timeLimit: number; // In seconds, e.g. 15
  currentTurn: PlayerId;
  playerName: string;
  isMyTurn: boolean;
  onTimeout?: () => void;
  disabled?: boolean;
}

export const TurnTimerBar: React.FC<TurnTimerBarProps> = ({
  timeLimit,
  currentTurn,
  playerName,
  isMyTurn,
  onTimeout,
  disabled = false,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(timeLimit);

  // Reset timer whenever the active turn changes
  useEffect(() => {
    setSecondsLeft(timeLimit);
  }, [currentTurn, timeLimit]);

  useEffect(() => {
    if (disabled || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onTimeout) onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [disabled, secondsLeft, onTimeout]);

  const theme = PLAYER_THEMES[currentTurn] || PLAYER_THEMES[1];
  const percent = Math.max(0, Math.min(100, (secondsLeft / timeLimit) * 100));

  const isUrgent = secondsLeft <= 4;
  const isWarning = secondsLeft <= 8 && secondsLeft > 4;

  const barColor = isUrgent
    ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]'
    : isWarning
    ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
    : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';

  return (
    <div className="w-full max-w-[390px] mx-auto px-1 py-1">
      <div className="flex items-center justify-between text-[11px] font-bold mb-1">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${theme.bgClass} animate-pulse`} />
          <span className={theme.textClass}>
            {isMyTurn ? 'Your Turn' : `${playerName}'s Turn`}
          </span>
        </div>
        <div className={`flex items-center gap-1 font-mono ${isUrgent ? 'text-rose-500 animate-pulse font-extrabold' : 'text-slate-600 dark:text-zinc-400'}`}>
          <Clock className="w-3 h-3" />
          <span>{secondsLeft}s</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden shadow-inner">
        <div
          style={{ width: `${percent}%` }}
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
        />
      </div>
    </div>
  );
};
