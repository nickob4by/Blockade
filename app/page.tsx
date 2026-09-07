'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Coordinate, GameMode, GameState, PlayerId, WallOrientation } from '@/lib/game/types';
import { createInitialGameState } from '@/lib/game/board';
import { applyPawnMove, applyWallPlacement } from '@/lib/game/engine';
import { computeAIMove } from '@/lib/game/ai';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { subscribeToGameRoom, RealtimePayload } from '@/lib/supabase/realtime';
import { GameBoard } from '@/components/board/GameBoard';
import { PlayerCard } from '@/components/board/PlayerCard';
import { GameControls } from '@/components/controls/GameControls';
import { GameOverModal } from '@/components/modals/GameOverModal';
import { RulesModal } from '@/components/modals/RulesModal';
import { OnlineLobbyModal } from '@/components/modals/OnlineLobbyModal';
import { SupabaseConfigModal } from '@/components/modals/SupabaseConfigModal';
import { sounds } from '@/lib/audio/sounds';
import { Users, Bot, Gamepad2, Globe, Sparkles, BookOpen } from 'lucide-react';

export default function GamePage() {
  const [mode, setMode] = useState<GameMode>('local');
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState('local'));
  const [orientation, setOrientation] = useState<WallOrientation>('H');
  const [clientPlayerId, setClientPlayerId] = useState<PlayerId>(1);

  // Modals state
  const [showRules, setShowRules] = useState(false);
  const [showLobby, setShowLobby] = useState(false);
  const [showSupabaseConfig, setShowSupabaseConfig] = useState(false);

  // Online Multiplayer State
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [playerName, setPlayerName] = useState('Player 1');
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');

  const realtimeBroadcastRef = useRef<((payload: RealtimePayload) => void) | null>(null);

  // Toggle wall orientation
  const handleToggleOrientation = useCallback(() => {
    setOrientation((prev) => (prev === 'H' ? 'V' : 'H'));
  }, []);

  // Reset / Restart Game
  const handleRestart = useCallback(() => {
    const newState = createInitialGameState(mode);
    setGameState(newState);

    if (mode === 'online' && realtimeBroadcastRef.current) {
      realtimeBroadcastRef.current({
        type: 'SYNC_STATE',
        state: newState,
      });
    }
  }, [mode]);

  // Switch Game Mode
  const handleSelectMode = (newMode: GameMode) => {
    if (newMode === 'online') {
      if (!isSupabaseConfigured()) {
        setShowSupabaseConfig(true);
        return;
      }
      setShowLobby(true);
      return;
    }

    setMode(newMode);
    setGameState(createInitialGameState(newMode));
    setClientPlayerId(1);
    setRoomCode(null);
    setWaitingForOpponent(false);
  };

  // Perform Pawn Move
  const handleMovePawn = (target: Coordinate) => {
    const res = applyPawnMove(gameState, target);
    if (!res.success) return;

    setGameState(res.nextState);

    if (mode === 'online' && realtimeBroadcastRef.current) {
      realtimeBroadcastRef.current({
        type: 'MOVE_PAWN',
        playerId: clientPlayerId,
        target,
      });
    }
  };

  // Perform Wall Placement
  const handlePlaceWall = (placement: { r: number; c: number; orientation: WallOrientation }) => {
    const res = applyWallPlacement(gameState, placement);
    if (!res.success) return;

    setGameState(res.nextState);

    if (mode === 'online' && realtimeBroadcastRef.current) {
      realtimeBroadcastRef.current({
        type: 'PLACE_WALL',
        playerId: clientPlayerId,
        ...placement,
      });
    }
  };

  // AI Turn Execution
  useEffect(() => {
    if (
      mode === 'ai' &&
      gameState.currentTurn === 2 &&
      gameState.status === 'playing'
    ) {
      const timer = setTimeout(() => {
        const action = computeAIMove(gameState);
        if (action.type === 'move') {
          sounds.playMove();
          setGameState((prev) => applyPawnMove(prev, action.target).nextState);
        } else {
          sounds.playWall();
          setGameState(
            (prev) =>
              applyWallPlacement(prev, {
                r: action.r,
                c: action.c,
                orientation: action.orientation,
              }).nextState
          );
        }
      }, 550);

      return () => clearTimeout(timer);
    }
  }, [mode, gameState]);

  // Online Realtime Room Setup
  const setupRealtimeRoom = useCallback(
    (code: string, isHost: boolean) => {
      setRoomCode(code);
      setClientPlayerId(isHost ? 1 : 2);
      setMode('online');

      const { broadcast, leave } = subscribeToGameRoom(
        code,
        (payload) => {
          if (payload.type === 'PLAYER_JOIN') {
            if (isHost) {
              setWaitingForOpponent(false);
              setShowLobby(false);
              // Transmit initial state to guest
              broadcast({
                type: 'SYNC_STATE',
                state: gameState,
              });
            }
          } else if (payload.type === 'SYNC_STATE') {
            setGameState(payload.state);
            setWaitingForOpponent(false);
            setShowLobby(false);
          } else if (payload.type === 'MOVE_PAWN') {
            sounds.playMove();
            setGameState((prev) => applyPawnMove(prev, payload.target).nextState);
          } else if (payload.type === 'PLACE_WALL') {
            sounds.playWall();
            setGameState(
              (prev) =>
                applyWallPlacement(prev, {
                  r: payload.r,
                  c: payload.c,
                  orientation: payload.orientation,
                }).nextState
            );
          } else if (payload.type === 'RESTART_GAME') {
            handleRestart();
          }
        },
        (status) => {
          setConnectionStatus(status);
        }
      );

      realtimeBroadcastRef.current = broadcast;

      return () => {
        leave();
      };
    },
    [gameState, handleRestart]
  );

  // Online: Create Room
  const handleCreateRoom = (hostName: string) => {
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setWaitingForOpponent(true);
    setupRealtimeRoom(randomCode, true);
  };

  // Online: Join Room
  const handleJoinRoom = (code: string, guestName: string) => {
    setupRealtimeRoom(code.toUpperCase(), false);
    setTimeout(() => {
      if (realtimeBroadcastRef.current) {
        realtimeBroadcastRef.current({
          type: 'PLAYER_JOIN',
          playerId: 2,
          playerName: guestName,
        });
      }
    }, 400);
    setShowLobby(false);
  };

  // Check URL parameters for ?room=XXXXXX on initial mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl) {
      if (isSupabaseConfigured()) {
        setShowLobby(true);
      } else {
        setShowSupabaseConfig(true);
      }
    }
  }, []);

  const isPlayerInteractionDisabled =
    mode === 'online' && gameState.currentTurn !== clientPlayerId;

  return (
    <main className="min-h-screen flex flex-col justify-between py-4 px-3 sm:px-6 max-w-4xl mx-auto">
      {/* Top Navbar */}
      <header className="flex items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-black text-slate-950 text-xl shadow-neon-wall">
            B
          </div>
          <div>
            <h1 className="font-black text-lg sm:text-xl tracking-tight text-white flex items-center gap-1.5">
              BLOCKADE
              <span className="text-[10px] font-semibold text-amber-400 border border-amber-500/40 px-1.5 py-0.2 rounded uppercase">
                Quoridor
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 hidden xs:block">
              Race to the finish • Wall your opponent
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => handleSelectMode('local')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
              mode === 'local'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Local 2P</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('ai')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
              mode === 'ai'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">vs AI</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('online')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
              mode === 'online'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Online</span>
          </button>
        </div>
      </header>

      {/* Online room banner if in online match */}
      {mode === 'online' && roomCode && (
        <div className="my-2 p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              Room: <strong className="font-mono text-amber-400">{roomCode}</strong>
            </span>
            <span className="text-slate-500">• Playing as Player {clientPlayerId}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowLobby(true)}
            className="text-sky-400 hover:underline"
          >
            Room Details
          </button>
        </div>
      )}

      {/* Main Game Area */}
      <div className="flex flex-col items-center gap-4 my-auto">
        {/* Opponent Card (Top Player - Player 2) */}
        <div className="w-full max-w-xl">
          <PlayerCard
            player={gameState.players[2]}
            isCurrentTurn={gameState.currentTurn === 2}
            walls={gameState.walls}
            isClientPlayer={mode === 'online' ? clientPlayerId === 2 : undefined}
          />
        </div>

        {/* Board Component */}
        <GameBoard
          gameState={gameState}
          onMovePawn={handleMovePawn}
          onPlaceWall={handlePlaceWall}
          clientPlayerId={mode === 'local' ? gameState.currentTurn : clientPlayerId}
          orientation={orientation}
          onToggleOrientation={handleToggleOrientation}
          disabled={isPlayerInteractionDisabled}
        />

        {/* Client Player Card (Bottom Player - Player 1) */}
        <div className="w-full max-w-xl">
          <PlayerCard
            player={gameState.players[1]}
            isCurrentTurn={gameState.currentTurn === 1}
            walls={gameState.walls}
            isClientPlayer={mode === 'online' ? clientPlayerId === 1 : undefined}
          />
        </div>

        {/* Controls & Options Bar */}
        <GameControls
          orientation={orientation}
          onToggleOrientation={handleToggleOrientation}
          onRestart={handleRestart}
          onOpenRules={() => setShowRules(true)}
          wallsLeft={gameState.players[gameState.currentTurn].wallsLeft}
        />
      </div>

      {/* Modals */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      <GameOverModal
        gameState={gameState}
        onRestart={handleRestart}
        clientPlayerId={mode === 'online' ? clientPlayerId : undefined}
      />

      <OnlineLobbyModal
        isOpen={showLobby}
        onClose={() => setShowLobby(false)}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        currentRoomCode={roomCode}
        waitingForOpponent={waitingForOpponent}
        playerName={playerName}
        setPlayerName={setPlayerName}
      />

      <SupabaseConfigModal
        isOpen={showSupabaseConfig}
        onClose={() => setShowSupabaseConfig(false)}
        onSwitchToLocal={() => handleSelectMode('local')}
      />

      {/* Footer */}
      <footer className="pt-3 border-t border-slate-900 text-center text-xs text-slate-500">
        Blockade 2D • Built with Next.js, Tailwind CSS & Supabase • Ready for Vercel
      </footer>
    </main>
  );
}
