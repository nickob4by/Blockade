'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Coordinate, GameMode, GameState, PlayerId, WallOrientation } from '@/lib/game/types';
import { createInitialGameState } from '@/lib/game/board';
import { applyPawnMove, applyWallPlacement, canPlaceWall } from '@/lib/game/engine';
import { computeAIMove } from '@/lib/game/ai';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { subscribeToGameRoom, RealtimePayload } from '@/lib/supabase/realtime';
import { GameBoard, GameBoardHandle, ActiveDragInfo } from '@/components/board/GameBoard';
import { PlayerCard } from '@/components/board/PlayerCard';
import { MobileControls } from '@/components/controls/MobileControls';
import { GameOverModal } from '@/components/modals/GameOverModal';
import { RulesModal } from '@/components/modals/RulesModal';
import { OnlineLobbyModal } from '@/components/modals/OnlineLobbyModal';
import { SupabaseConfigModal } from '@/components/modals/SupabaseConfigModal';
import { GroupsModal } from '@/components/modals/GroupsModal';
import { MainMenu } from '@/components/menu/MainMenu';
import { useAuth } from '@/lib/auth/AuthContext';
import { sounds } from '@/lib/audio/sounds';
import { Users, Bot, Globe, ArrowLeft, RefreshCw } from 'lucide-react';

export default function GamePage() {
  const { profile } = useAuth();
  const [currentView, setCurrentView] = useState<'menu' | 'game'>('menu');
  const [mode, setMode] = useState<GameMode>('local');
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState('local'));
  const [orientation, setOrientation] = useState<WallOrientation>('H');
  const [clientPlayerId, setClientPlayerId] = useState<PlayerId>(1);
  const [selectedWall, setSelectedWall] = useState<{
    r: number;
    c: number;
    orientation: WallOrientation;
  } | null>(null);

  // Drag-and-drop state & Synchronous Ref (prevents async stale closures)
  const [activeDrag, setActiveDrag] = useState<ActiveDragInfo | null>(null);
  const activeDragRef = useRef<ActiveDragInfo | null>(null);
  const isTouchDragRef = useRef<boolean>(false);
  const boardRef = useRef<GameBoardHandle>(null);
  const lastSnappedCoordRef = useRef<{ r: number; c: number } | null>(null);

  // Modals state
  const [showRules, setShowRules] = useState(false);
  const [showLobby, setShowLobby] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showSupabaseConfig, setShowSupabaseConfig] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Online Multiplayer State
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [isHost, setIsHost] = useState(true);
  const [playerName, setPlayerName] = useState(profile.name || 'Player 1');
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');

  const realtimeBroadcastRef = useRef<((payload: RealtimePayload) => Promise<boolean>) | null>(null);
  const channelLeaveRef = useRef<(() => void) | null>(null);
  const handshakeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Toggle wall orientation
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
    setActiveDrag(null);
    activeDragRef.current = null;

    if (mode === 'online' && realtimeBroadcastRef.current) {
      realtimeBroadcastRef.current({
        type: 'SYNC_STATE',
        state: newState,
      });
    }
  }, [mode]);

  // Keep playerName in sync with profile
  useEffect(() => {
    if (profile.name) {
      setPlayerName(profile.name);
    }
  }, [profile.name]);

  // Check URL query parameters for direct room links (e.g. ?room=ABCD)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam) {
        const code = roomParam.toUpperCase();
        setRoomCode(code);
        setMode('online');
        setCurrentView('game');
        if (isSupabaseConfigured()) {
          setupRealtimeRoom(code, false, profile.name || 'Guest');
        } else {
          setShowSupabaseConfig(true);
        }
      }
    }
  }, []);

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
    setActiveDrag(null);
    activeDragRef.current = null;
    setRoomCode(null);
    setWaitingForOpponent(false);
    setCurrentView('game');
  };

  const handleRequestExitToMenu = () => {
    const hasMadeMoves =
      gameState.walls.length > 0 ||
      gameState.players[1].position.r !== 8 ||
      gameState.players[2].position.r !== 0;

    if (gameState.status === 'playing' && hasMadeMoves) {
      setShowExitConfirm(true);
    } else {
      if (channelLeaveRef.current) {
        channelLeaveRef.current();
        channelLeaveRef.current = null;
      }
      if (handshakeIntervalRef.current) {
        clearInterval(handshakeIntervalRef.current);
        handshakeIntervalRef.current = null;
      }
      setWaitingForOpponent(false);
      setRoomCode(null);
      setCurrentView('menu');
    }
  };

  const handleConfirmExitToMenu = () => {
    setShowExitConfirm(false);
    setSelectedWall(null);
    setActiveDrag(null);
    activeDragRef.current = null;
    if (channelLeaveRef.current) {
      channelLeaveRef.current();
      channelLeaveRef.current = null;
    }
    if (handshakeIntervalRef.current) {
      clearInterval(handshakeIntervalRef.current);
      handshakeIntervalRef.current = null;
    }
    setWaitingForOpponent(false);
    setRoomCode(null);
    setCurrentView('menu');
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
  const handlePlaceWall = useCallback((placement: { r: number; c: number; orientation: WallOrientation }) => {
    const res = applyWallPlacement(gameState, placement);
    if (!res.success) return;

    setSelectedWall(null);
    setActiveDrag(null);
    activeDragRef.current = null;
    setGameState(res.nextState);

    if (mode === 'online' && realtimeBroadcastRef.current) {
      realtimeBroadcastRef.current({
        type: 'PLACE_WALL',
        playerId: clientPlayerId,
        ...placement,
      });
    }
  }, [gameState, mode, clientPlayerId]);

  // Confirm currently selected ghost wall (tap flow)
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

  // Drag-and-drop Handlers using Synchronous Ref to eliminate stale closures
  const handleDragStart = (
    dragOrientation: WallOrientation,
    startX: number,
    startY: number,
    isTouch: boolean
  ) => {
    setSelectedWall(null);
    lastSnappedCoordRef.current = null;
    isTouchDragRef.current = isTouch;

    const initialDrag: ActiveDragInfo = {
      orientation: dragOrientation,
      currentX: startX,
      currentY: startY,
      snappedCoord: null,
      isValid: false,
      isTouch,
    };
    activeDragRef.current = initialDrag;
    setActiveDrag(initialDrag);
  };

  const handleDragMove = (x: number, y: number) => {
    const isTouch = isTouchDragRef.current;
    // 45px upward offset on touch screens so finger doesn't block view of the groove
    const targetY = isTouch ? y - 45 : y;
    const snapped = boardRef.current?.getSnappedIntersection(x, targetY) || null;

    let isValid = false;
    const currentOrientation = activeDragRef.current?.orientation || orientation;

    if (snapped) {
      const check = canPlaceWall(gameState, {
        r: snapped.r,
        c: snapped.c,
        orientation: currentOrientation,
      });
      isValid = check.valid;

      // Subtle audio feedback when snapping onto a new valid intersection
      if (
        !lastSnappedCoordRef.current ||
        lastSnappedCoordRef.current.r !== snapped.r ||
        lastSnappedCoordRef.current.c !== snapped.c
      ) {
        sounds.playSnap();
        lastSnappedCoordRef.current = snapped;
      }
    } else {
      lastSnappedCoordRef.current = null;
    }

    const nextInfo: ActiveDragInfo = {
      orientation: currentOrientation,
      currentX: x,
      currentY: y,
      snappedCoord: snapped,
      isValid,
      isTouch,
    };

    // Synchronously update ref
    activeDragRef.current = nextInfo;
    setActiveDrag(nextInfo);
  };

  const handleDragEnd = () => {
    // Read from synchronous ref to prevent stale state issues
    const currentDrag = activeDragRef.current;

    if (currentDrag && currentDrag.snappedCoord && currentDrag.isValid) {
      sounds.playWall();
      handlePlaceWall({
        r: currentDrag.snappedCoord.r,
        c: currentDrag.snappedCoord.c,
        orientation: currentDrag.orientation,
      });
    } else if (currentDrag && currentDrag.snappedCoord && !currentDrag.isValid) {
      sounds.playInvalid();
    }

    activeDragRef.current = null;
    setActiveDrag(null);
    lastSnappedCoordRef.current = null;
  };

  // Check if selected wall is valid (tap flow)
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

  const generateRoomCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Online Realtime Room Setup
  const setupRealtimeRoom = useCallback(
    (code: string, isHostRole: boolean, currentName: string) => {
      // 1. Clean up any previous room channel & active retry intervals
      if (channelLeaveRef.current) {
        channelLeaveRef.current();
        channelLeaveRef.current = null;
      }
      if (handshakeIntervalRef.current) {
        clearInterval(handshakeIntervalRef.current);
        handshakeIntervalRef.current = null;
      }

      const cleanCode = code.trim().toUpperCase();
      setRoomCode(cleanCode);
      setClientPlayerId(isHostRole ? 1 : 2);
      setIsHost(isHostRole);
      setMode('online');

      // Initialize base game state for online match
      const baseState = createInitialGameState('online');
      baseState.players[1].name = isHostRole ? currentName : 'Host';
      baseState.players[2].name = !isHostRole ? currentName : 'Guest';
      setGameState(baseState);

      let hasSynced = false;

      const { broadcast, leave } = subscribeToGameRoom(
        cleanCode,
        (payload) => {
          if (payload.type === 'PLAYER_JOIN') {
            if (isHostRole) {
              setWaitingForOpponent(false);
              setShowLobby(false);
              sounds.playWall();

              setGameState((prev) => {
                const updated: GameState = {
                  ...prev,
                  players: {
                    ...prev.players,
                    2: {
                      ...prev.players[2],
                      name: payload.playerName || 'Player 2',
                    },
                  },
                };

                // Broadcast current state back to the joining guest
                broadcast({
                  type: 'SYNC_STATE',
                  state: updated,
                });

                return updated;
              });
            }
          } else if (payload.type === 'REQUEST_SYNC') {
            if (isHostRole) {
              setWaitingForOpponent(false);
              setShowLobby(false);
              setGameState((curr) => {
                broadcast({
                  type: 'SYNC_STATE',
                  state: curr,
                });
                return curr;
              });
            }
          } else if (payload.type === 'SYNC_STATE') {
            hasSynced = true;
            if (handshakeIntervalRef.current) {
              clearInterval(handshakeIntervalRef.current);
              handshakeIntervalRef.current = null;
            }
            setGameState(payload.state);
            setWaitingForOpponent(false);
            setShowLobby(false);
            sounds.playWall();
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
          if (status === 'SUBSCRIBED') {
            if (!isHostRole) {
              // Guest sends join immediately once channel is subscribed!
              broadcast({
                type: 'PLAYER_JOIN',
                playerId: 2,
                playerName: currentName,
              });

              if (handshakeIntervalRef.current) {
                clearInterval(handshakeIntervalRef.current);
              }

              // Robust retry: repeat every 800ms until host syncs or up to 20 attempts
              let attempts = 0;
              handshakeIntervalRef.current = setInterval(() => {
                attempts++;
                if (hasSynced || attempts > 20) {
                  if (handshakeIntervalRef.current) {
                    clearInterval(handshakeIntervalRef.current);
                    handshakeIntervalRef.current = null;
                  }
                  return;
                }
                broadcast({
                  type: 'PLAYER_JOIN',
                  playerId: 2,
                  playerName: currentName,
                });
              }, 800);
            }
          }
        }
      );

      channelLeaveRef.current = leave;
      realtimeBroadcastRef.current = broadcast;
    },
    [handleRestart]
  );

  // Online: Create Room
  const handleCreateRoom = (hostName: string) => {
    const code = generateRoomCode();
    setWaitingForOpponent(true);
    setIsHost(true);
    setupRealtimeRoom(code, true, hostName || profile.name || 'Player 1');
  };

  // Online: Join Room
  const handleJoinRoom = (code: string, guestName: string) => {
    const clean = code.trim().toUpperCase();
    setWaitingForOpponent(true);
    setIsHost(false);
    setupRealtimeRoom(clean, false, guestName || profile.name || 'Player 2');
  };

  const isOnlineMode = mode === 'online' || Boolean(roomCode) || gameState.mode === 'online';

  const isMyTurn =
    !isOnlineMode && mode === 'local'
      ? true
      : gameState.currentTurn === clientPlayerId && gameState.status === 'playing';

  const isPlayerInteractionDisabled =
    isOnlineMode && gameState.currentTurn !== clientPlayerId;

  if (currentView === 'menu') {
    return (
      <main className="h-full min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col items-center justify-center">
        <MainMenu
          onSelectMode={(selectedMode) => {
            if (selectedMode === 'online') {
              if (!isSupabaseConfigured()) {
                setShowSupabaseConfig(true);
                return;
              }
              setShowLobby(true);
              return;
            }
            handleSelectMode(selectedMode);
          }}
          onOpenRules={() => setShowRules(true)}
          onOpenGroups={() => setShowGroups(true)}
          onOpenOnlineLobby={() => {
            if (!isSupabaseConfigured()) {
              setShowSupabaseConfig(true);
              return;
            }
            setShowLobby(true);
          }}
        />

        {/* Modals available from Menu */}
        <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

        <GroupsModal
          isOpen={showGroups}
          onClose={() => setShowGroups(false)}
          onStartOnlineMatch={() => {
            handleCreateRoom(profile.name || 'Player 1');
            setCurrentView('game');
          }}
        />

        <OnlineLobbyModal
          isOpen={showLobby}
          onClose={() => {
            setShowLobby(false);
            if (waitingForOpponent) {
              if (channelLeaveRef.current) {
                channelLeaveRef.current();
                channelLeaveRef.current = null;
              }
              if (handshakeIntervalRef.current) {
                clearInterval(handshakeIntervalRef.current);
                handshakeIntervalRef.current = null;
              }
              setWaitingForOpponent(false);
              setRoomCode(null);
            }
          }}
          onCreateRoom={(pName) => {
            handleCreateRoom(pName);
            setCurrentView('game');
          }}
          onJoinRoom={(code, pName) => {
            handleJoinRoom(code, pName);
            setCurrentView('game');
          }}
          currentRoomCode={roomCode}
          waitingForOpponent={waitingForOpponent}
          playerName={playerName}
          setPlayerName={setPlayerName}
          isHost={isHost}
        />

        <SupabaseConfigModal
          isOpen={showSupabaseConfig}
          onClose={() => setShowSupabaseConfig(false)}
          onSwitchToLocal={() => handleSelectMode('local')}
        />
      </main>
    );
  }

  return (
    <main className="h-full h-[100dvh] flex flex-col justify-between items-center px-2 py-1 sm:py-2 max-w-md mx-auto overflow-hidden">
      {/* 1. Mobile Top Bar */}
      <header className="w-full flex items-center justify-between gap-2 pt-safe pb-1">
        <button
          type="button"
          onClick={handleRequestExitToMenu}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold tap-bounce shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
          <span>Menu</span>
        </button>

        {/* Mode Indicator Chip */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-semibold text-zinc-200 shadow-sm">
          {mode === 'ai' ? (
            <>
              <Bot className="w-3.5 h-3.5 text-rose-400" />
              <span>vs AI Bot</span>
            </>
          ) : mode === 'local' ? (
            <>
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Pass & Play</span>
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>Online Match</span>
            </>
          )}
        </div>

        {/* Action Button: Restart Match (hidden in online mode) */}
        {!isOnlineMode ? (
          <button
            type="button"
            onClick={handleRestart}
            title="Restart Match"
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-semibold tap-bounce shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        ) : (
          <div className="w-[70px]" />
        )}
      </header>

      {/* Online room banner if active */}
      {isOnlineMode && roomCode && (
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
      <div className="w-full flex flex-col items-center justify-center gap-5 sm:gap-6 my-auto">
        {/* Opponent Card (Top - Player 2) */}
        <PlayerCard
          player={gameState.players[2]}
          isCurrentTurn={gameState.currentTurn === 2}
          walls={gameState.walls}
          isClientPlayer={isOnlineMode ? clientPlayerId === 2 : undefined}
        />

        {/* 9x9 Touch Game Board */}
        <GameBoard
          ref={boardRef}
          gameState={gameState}
          onMovePawn={handleMovePawn}
          onPlaceWall={handlePlaceWall}
          clientPlayerId={mode === 'local' ? gameState.currentTurn : clientPlayerId}
          selectedWall={selectedWall}
          setSelectedWall={setSelectedWall}
          activeDrag={activeDrag}
          disabled={isPlayerInteractionDisabled}
        />

        {/* Client Player Card (Bottom - Player 1) */}
        <PlayerCard
          player={gameState.players[1]}
          isCurrentTurn={gameState.currentTurn === 1}
          walls={gameState.walls}
          isClientPlayer={isOnlineMode ? clientPlayerId === 1 : undefined}
        />
      </div>

      {/* 3. Bottom Thumb Zone Controls & Wall Tray */}
      <MobileControls
        orientation={orientation}
        onToggleOrientation={handleToggleOrientation}
        selectedWall={selectedWall}
        onConfirmWall={handleConfirmWall}
        onCancelWall={handleCancelWall}
        onRestart={!isOnlineMode ? handleRestart : undefined}
        onOpenRules={() => setShowRules(true)}
        wallsLeft={gameState.players[gameState.currentTurn].wallsLeft}
        currentTurn={gameState.currentTurn}
        isMyTurn={isMyTurn}
        isValidWallPlacement={isValidWallPlacement}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        isDragging={activeDrag !== null}
      />

      {/* 4. Floating Dragged Token (Player-Themed with 45px upward offset on touch) */}
      {activeDrag && (
        <div
          style={{
            left: `${activeDrag.currentX}px`,
            top: `${activeDrag.isTouch ? activeDrag.currentY - 45 : activeDrag.currentY}px`,
            transform: 'translate(-50%, -50%)',
          }}
          className="fixed z-50 pointer-events-none transition-transform duration-75"
        >
          <div
            className={`rounded-full shadow-2xl border flex items-center justify-center transition-all ${
              activeDrag.orientation === 'H' ? 'w-16 h-4' : 'w-4 h-16'
            } ${
              activeDrag.snappedCoord
                ? activeDrag.isValid
                  ? gameState.currentTurn === 1
                    ? 'bg-blue-500 border-white/70 shadow-tactile-md scale-105'
                    : 'bg-rose-500 border-white/70 shadow-tactile-md scale-105'
                  : 'bg-red-500 border-red-300 shadow-tactile-md scale-105 animate-pulse'
                : gameState.currentTurn === 1
                ? 'bg-blue-500/80 border-blue-300/40 shadow-md opacity-90'
                : 'bg-rose-500/80 border-rose-300/40 shadow-md opacity-90'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
          </div>
        </div>
      )}

      {/* Modals */}
      <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />

      <GameOverModal
        gameState={gameState}
        onRestart={handleRestart}
        clientPlayerId={mode === 'online' ? clientPlayerId : undefined}
      />

      <OnlineLobbyModal
        isOpen={showLobby}
        onClose={() => {
          setShowLobby(false);
          if (waitingForOpponent) {
            if (channelLeaveRef.current) {
              channelLeaveRef.current();
              channelLeaveRef.current = null;
            }
            if (handshakeIntervalRef.current) {
              clearInterval(handshakeIntervalRef.current);
              handshakeIntervalRef.current = null;
            }
            setWaitingForOpponent(false);
            setRoomCode(null);
          }
        }}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        currentRoomCode={roomCode}
        waitingForOpponent={waitingForOpponent}
        playerName={playerName}
        setPlayerName={setPlayerName}
        isHost={isHost}
      />

      <SupabaseConfigModal
        isOpen={showSupabaseConfig}
        onClose={() => setShowSupabaseConfig(false)}
        onSwitchToLocal={() => handleSelectMode('local')}
      />

      {/* Groups Modal */}
      <GroupsModal
        isOpen={showGroups}
        onClose={() => setShowGroups(false)}
        onStartOnlineMatch={() => {
          handleCreateRoom(profile.name || 'Player 1');
          setCurrentView('game');
        }}
      />

      {/* Exit Match Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xs p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl text-center space-y-4">
            <h3 className="text-base font-bold text-zinc-100">Exit to Main Menu?</h3>
            <p className="text-xs text-zinc-400">
              Your ongoing match will be ended and progress lost.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 font-semibold text-xs tap-bounce border border-zinc-700/60"
              >
                Keep Playing
              </button>
              <button
                type="button"
                onClick={handleConfirmExitToMenu}
                className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs tap-bounce shadow-md"
              >
                Exit Match
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
