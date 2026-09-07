'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameState, PlayerId } from '@/lib/game/types';
import { sounds } from '@/lib/audio/sounds';
import {
  Trophy,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Loader2,
  Check,
  X,
  XCircle,
  AlertCircle,
  Swords,
} from 'lucide-react';

export type RematchStatus =
  | 'idle'
  | 'requested'
  | 'received'
  | 'declined'
  | 'accepted'
  | 'opponent_left';

interface GameOverModalProps {
  gameState: GameState;
  onRestart: () => void;
  onExitToMenu?: () => void;
  clientPlayerId?: PlayerId;
  rematchStatus?: RematchStatus;
  onRequestRematch?: () => void;
  onAcceptRematch?: () => void;
  onDeclineRematch?: () => void;
  onCancelRematch?: () => void;
  opponentName?: string;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  gameState,
  onRestart,
  onExitToMenu,
  clientPlayerId,
  rematchStatus = 'idle',
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  onCancelRematch,
  opponentName,
}) => {
  const winner = gameState.winner;
  if (!winner) return null;

  const winningPlayer = gameState.players[winner];
  const isClientWinner = clientPlayerId ? winner === clientPlayerId : false;

  useEffect(() => {
    sounds.playWin();

    // Trigger confetti explosion
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  const totalMoves = gameState.history.length;
  const wallsPlacedByWinner = gameState.walls.filter((w) => w.placedBy === winner).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl text-center">
        {/* Victory Badge */}
        <div
          className={`absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full flex items-center justify-center shadow-xl border-2 border-white/80 ${
            winner === 1
              ? 'bg-blue-600 shadow-tactile-p1'
              : 'bg-rose-600 shadow-tactile-p2'
          }`}
        >
          <Trophy className="w-12 h-12 text-white animate-bounce" />
        </div>

        <div className="mt-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            Victory!
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            {gameState.mode === 'online'
              ? isClientWinner
                ? 'You Won!'
                : `${winningPlayer.name} Won!`
              : `${winningPlayer.name} Wins!`}
          </h2>

          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">
            Successfully crossed to the other side of the grid!
          </p>

          {/* Match summary stats */}
          <div className="grid grid-cols-2 gap-3 my-6 p-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 text-xs">
            <div>
              <div className="text-slate-500 dark:text-zinc-400">Total Turns</div>
              <div className="text-lg font-bold text-slate-900 dark:text-zinc-100">{totalMoves}</div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-zinc-400">Walls Placed</div>
              <div className="text-lg font-bold text-amber-600 dark:text-amber-300">{wallsPlacedByWinner}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3 mt-4">
            {/* Non-online mode: Simple Play Again */}
            {gameState.mode !== 'online' && (
              <button
                type="button"
                onClick={onRestart}
                className={`w-full py-3 px-4 rounded-xl font-bold text-white text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 ${
                  winner === 1
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>
            )}

            {/* Online mode: Interactive Rematch Flow */}
            {gameState.mode === 'online' && (
              <>
                {/* Rematch Request Received: Prompt user to Accept or Decline */}
                {rematchStatus === 'received' && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-slate-800 dark:text-zinc-100 text-sm space-y-3 animate-fadeIn">
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                      <Swords className="w-4 h-4" />
                      <span>{opponentName || 'Opponent'} wants a rematch!</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={onAcceptRematch}
                        className="flex-1 py-2.5 px-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 text-sm flex items-center justify-center gap-1.5 shadow-sm transition-transform active:scale-95"
                      >
                        <Check className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={onDeclineRematch}
                        className="flex-1 py-2.5 px-3 rounded-xl font-medium text-slate-700 dark:text-zinc-300 bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-sm flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                      >
                        <X className="w-4 h-4" />
                        Decline
                      </button>
                    </div>
                  </div>
                )}

                {/* Rematch Requested: Waiting for opponent */}
                {rematchStatus === 'requested' && (
                  <div className="space-y-2">
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm flex items-center justify-center gap-2 animate-fadeIn">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      <span>Waiting for {opponentName || 'opponent'} to respond...</span>
                    </div>
                    {onCancelRematch && (
                      <button
                        type="button"
                        onClick={onCancelRematch}
                        className="w-full py-2 px-3 rounded-xl font-medium text-xs sm:text-sm text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                      >
                        Cancel Rematch Request
                      </button>
                    )}
                  </div>
                )}

                {/* Rematch Accepted: Starting game */}
                {rematchStatus === 'accepted' && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm flex items-center justify-center gap-2 animate-fadeIn">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    <span>Starting rematch...</span>
                  </div>
                )}

                {/* Rematch Declined */}
                {rematchStatus === 'declined' && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-400 text-sm flex items-center justify-center gap-2 animate-fadeIn">
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <span>{opponentName || 'Opponent'} declined the rematch.</span>
                  </div>
                )}

                {/* Opponent Left Room */}
                {rematchStatus === 'opponent_left' && (
                  <div className="p-3.5 rounded-xl bg-slate-500/10 border border-slate-500/30 text-slate-700 dark:text-zinc-400 text-sm flex items-center justify-center gap-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    <span>{opponentName || 'Opponent'} left the room.</span>
                  </div>
                )}

                {/* Idle: Show Request Rematch Button */}
                {rematchStatus === 'idle' && onRequestRematch && (
                  <button
                    type="button"
                    onClick={onRequestRematch}
                    className="w-full py-3 px-4 rounded-xl font-bold text-white text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 bg-emerald-600 hover:bg-emerald-500"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Request Rematch
                  </button>
                )}
              </>
            )}

            {/* Return to Menu Button */}
            {onExitToMenu && (
              <button
                type="button"
                onClick={onExitToMenu}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-95 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700/60"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Menu
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
