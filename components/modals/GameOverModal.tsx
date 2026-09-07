'use client';

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameState, PlayerId } from '@/lib/game/types';
import { sounds } from '@/lib/audio/sounds';
import { Trophy, RotateCcw, Sparkles } from 'lucide-react';

interface GameOverModalProps {
  gameState: GameState;
  onRestart: () => void;
  clientPlayerId?: PlayerId;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  gameState,
  onRestart,
  clientPlayerId,
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
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-center">
        {/* Glow effect */}
        <div
          className={`absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full flex items-center justify-center shadow-2xl border-2 border-white ${
            winner === 1
              ? 'bg-gradient-to-tr from-sky-600 to-sky-400 shadow-neon-p1'
              : 'bg-gradient-to-tr from-rose-600 to-rose-400 shadow-neon-p2'
          }`}
        >
          <Trophy className="w-12 h-12 text-white animate-bounce" />
        </div>

        <div className="mt-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Victory!
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            {gameState.mode === 'online'
              ? isClientWinner
                ? 'You Won!'
                : `${winningPlayer.name} Won!`
              : `${winningPlayer.name} Wins!`}
          </h2>

          <p className="text-sm text-slate-400 mt-2">
            Successfully crossed to the other side of the grid!
          </p>

          {/* Match summary stats */}
          <div className="grid grid-cols-2 gap-3 my-6 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs">
            <div>
              <div className="text-slate-400">Total Turns</div>
              <div className="text-lg font-bold text-slate-100">{totalMoves}</div>
            </div>
            <div>
              <div className="text-slate-400">Walls Placed</div>
              <div className="text-lg font-bold text-amber-300">{wallsPlacedByWinner}</div>
            </div>
          </div>

          {/* Play again button */}
          <button
            type="button"
            onClick={onRestart}
            className={`w-full py-3 px-4 rounded-xl font-bold text-white text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 ${
              winner === 1
                ? 'bg-sky-500 hover:bg-sky-400 shadow-sky-500/30'
                : 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/30'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};
