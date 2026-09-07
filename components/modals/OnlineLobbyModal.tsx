'use client';

import React, { useState } from 'react';
import { X, Users, Copy, Check, ArrowRight, Loader2, Play } from 'lucide-react';

interface OnlineLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  currentRoomCode: string | null;
  waitingForOpponent: boolean;
  playerName: string;
  setPlayerName: (name: string) => void;
  isHost?: boolean;
}

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
  onJoinRoom,
  currentRoomCode,
  waitingForOpponent,
  playerName,
  setPlayerName,
  isHost = true,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (!currentRoomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${currentRoomCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-md p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-500 dark:text-sky-400" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Online Multiplayer</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentRoomCode ? (
          /* Waiting for opponent / Connecting in room / Match details */
          <div className="mt-6 text-center space-y-4">
            {waitingForOpponent ? (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-sky-500/10 border border-sky-400/30 flex items-center justify-center text-sky-500 dark:text-sky-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>

                <div>
                  <h4 className="text-xl font-bold text-slate-900 dark:text-white">
                    {isHost ? 'Waiting for Opponent...' : 'Connecting to Room...'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {isHost
                      ? 'Share this room code with your friend on their device to start!'
                      : `Connecting to room ${currentRoomCode}... Syncing game with host.`}
                  </p>
                </div>
              </>
            ) : (
              <div>
                <h4 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">Match in Progress</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Playing in room <strong className="font-mono text-amber-600 dark:text-amber-400">{currentRoomCode}</strong>
                </p>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">Room Code:</div>
              <div className="font-mono text-3xl font-extrabold tracking-widest text-amber-600 dark:text-amber-400">
                {currentRoomCode}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 text-sm font-medium transition-colors tap-bounce"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                  Invite Link Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                  Copy Shareable Invite Link
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline pt-1"
            >
              {waitingForOpponent ? 'Cancel' : 'Close'}
            </button>
          </div>
        ) : (
          /* Create or Join Room form */
          <div className="mt-4 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-400 mb-1.5">
                Your Nickname
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
                placeholder="Enter your name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => onCreateRoom(playerName || 'Player 1')}
                className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-transform active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                Create New Room
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Or Join Room
              </span>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="6-LETTER CODE"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white font-mono text-center tracking-widest text-sm focus:outline-none focus:border-sky-500 uppercase transition-colors"
              />
              <button
                type="button"
                onClick={() => onJoinRoom(joinCode, playerName || 'Player 2')}
                disabled={joinCode.trim().length < 4}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5 transition-colors ${
                  joinCode.trim().length >= 4
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-sm'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                Join
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
