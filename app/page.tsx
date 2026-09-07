'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Coordinate, GameMode, GameState, PlayerId, WallOrientation } from '@/lib/game/types';
import { createInitialGameState } from '@/lib/game/board';
import { applyPawnMove, applyWallPlacement, canPlaceWall } from '@/lib/game/engine';
import { computeAIMove } from '@/lib/game/ai';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { subscribeToGameRoom, RealtimePayload } from '@/lib/supabase/realtime';
import { GameBoard } from '@/components/board/GameBoard';
import { PlayerCard } from '@/components/board/PlayerCard';
import { MobileControls } from '@/components/controls/MobileControls';
import { GameOverModal } from '@/components/modals/GameOverModal';
import { RulesModal } from '@/components/modals/RulesModal';
import { OnlineLobbyModal } from '@/components/modals/OnlineLobbyModal';
import { SupabaseConfigModal } from '@/components/modals/SupabaseConfigModal';
import { sounds } from '@/lib/audio/sounds';
import { Users, Bot, Globe } from 'lucide-react';

export default function GamePage() {
  const [mode, setMode] = useState<GameMode>('local');
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState('local'));
  const [orientation, setOrientation] = useState<WallOrientation>('H');
  const [clientPlayerId, setClientPlayerId] = useState<PlayerId>(1);
  const [selectedWall, setSelectedWall] = useState<{
    r: number;
    c: number;
    orientation: WallOrientation;
  } | null>(null);

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

  // Toggle wall orientation (also rotates selected ghost wall in place)
  const handleToggleOrientation = useCallback(() => {
    setOrientation((prev) => {
      const nextOri = prev === 'H' ? 'V' : 'H';
      setSelectedWall((curr) => (curr ? { ...curr, orientation: nextOri } : null));
      return nextOri;
    });
  }, []);

  // Reset / Restart Game
  const handleRestart = useCallback(() => {
    const newState = createInitialGameState(mode);
    setGameState(newState);
    setSelectedWall(null);

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
    setSelectedWall(null);
    setRoomCode(null);
    setWaitingForOpponent(false);
  };

  // Perform Pawn Move
  const handleMovePawn = (target: Coordinate) => {
    setSelectedWall(null);
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

  // Perform Wall Placement directly
  const handlePlaceWall = (placement: { r: number; c: number; orientation: WallOrientation }) => {
    const res = applyWallPlacement(gameState, placement);
    if (!res.success) return;

    setSelectedWall(null);
    setGameState(res.nextState);

    if (mode === 'online' && realtimeBroadcastRef.current) {
      realtimeBroadcastRef.current({
        type: 'PLACE_WALL',
        playerId: clientPlayerId,
        ...placement,
      });
    }
  };

  // Confirm currently selected ghost wall
  const handleConfirmWall = () => {
    if (!selectedWall) return;
    const check = canPlaceWall(gameState, selectedWall);
    if (check.valid) {
      sounds.playWall();
      handlePlaceWall(selectedWall);
    } else {
      sounds.playInvalid();
    }
  };

  const handleCancelWall = () => {
    setSelectedWall(null);
  };

  // Check if selected wall is valid
  const isValidWallPlacement = selectedWall
    ? canPlaceWall(gameState, selectedWall).valid
    : false;

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

  // Check URL parameters for ?room=XXXXXX
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

  const isMyTurn =
    mode === 'local'
      ? true
      : gameState.currentTurn === clientPlayerId && gameState.status === 'playing';

  const isPlayerInteractionDisabled =
    mode === 'online' && gameState.currentTurn !== clientPlayerId;

  return (
    <main className="h-full h-[100dvh] flex flex-col justify-between items-center px-2 py-1 sm:py-2 max-w-md mx-auto overflow-hidden">
      {/* 1. Mobile Top Bar */}
      <header className="w-full flex items-center justify-between gap-1.5 pt-safe pb-1">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center font-black text-slate-950 text-base shadow-neon-wall flex-shrink-0">
            B
          </div>
          <span className="font-black text-base tracking-tight text-white">
            BLOCKADE
          </span>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-0.5 p-0.5 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => handleSelectMode('local')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all tap-bounce ${
              mode === 'local'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3 h-3 text-sky-400" />
            <span>2P</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('ai')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all tap-bounce ${
              mode === 'ai'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3 h-3 text-rose-400" />
            <span>AI</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('online')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-all tap-bounce ${
              mode === 'online'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3 h-3 text-emerald-400" />
            <span>Online</span>
          </button>
        </div>
      </header>

      {/* Online room banner if active */}
      {mode === 'online' && roomCode && (
        <div className="w-full px-2 py-1 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              Room: <strong className="font-mono text-amber-400">{roomCode}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowLobby(true)}
            className="text-sky-400 font-semibold"
          >
            Details
          </button>
        </div>
      )}

      {/* 2. Middle Game Core: Opponent -> Board -> Player */}
      <div className="w-full flex flex-col items-center justify-center gap-1.5 sm:gap-2 my-auto">
        {/* Opponent Card (Top - Player 2) */}
        <PlayerCard
          player={gameState.players[2]}
          isCurrentTurn={gameState.currentTurn === 2}
          walls={gameState.walls}
          isClientPlayer={mode === 'online' ? clientPlayerId === 2 : undefined}
        />

        {/* 9x9 Touch Game Board */}
        <GameBoard
          gameState={gameState}
          onMovePawn={handleMovePawn}
          onPlaceWall={handlePlaceWall}
          clientPlayerId={mode === 'local' ? gameState.currentTurn : clientPlayerId}
          orientation={orientation}
          onToggleOrientation={handleToggleOrientation}
          selectedWall={selectedWall}
          setSelectedWall={setSelectedWall}
          disabled={isPlayerInteractionDisabled}
        />

        {/* Client Player Card (Bottom - Player 1) */}
        <PlayerCard
          player={gameState.players[1]}
          isCurrentTurn={gameState.currentTurn === 1}
          walls={gameState.walls}
          isClientPlayer={mode === 'online' ? clientPlayerId === 1 : undefined}
        />
      </div>

      {/* 3. Bottom Thumb Zone Controls */}
      <MobileControls
        orientation={orientation}
        onToggleOrientation={handleToggleOrientation}
        selectedWall={selectedWall}
        onConfirmWall={handleConfirmWall}
        onCancelWall={handleCancelWall}
        onRestart={handleRestart}
        onOpenRules={() => setShowRules(true)}
        wallsLeft={gameState.players[gameState.currentTurn].wallsLeft}
        isMyTurn={isMyTurn}
        isValidWallPlacement={isValidWallPlacement}
      />

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
    </main>
  );
}
