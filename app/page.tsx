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
import { GameOverModal, RematchStatus } from '@/components/modals/GameOverModal';
import { RulesModal } from '@/components/modals/RulesModal';
import { OnlineLobbyModal } from '@/components/modals/OnlineLobbyModal';
import { SupabaseConfigModal } from '@/components/modals/SupabaseConfigModal';
import { GroupsModal } from '@/components/modals/GroupsModal';
import { OpponentLeftModal } from '@/components/modals/OpponentLeftModal';
import { ResignConfirmModal } from '@/components/modals/ResignConfirmModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { MainMenu } from '@/components/menu/MainMenu';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import { sounds } from '@/lib/audio/sounds';
import { IncomingChallengeModal } from '@/components/modals/IncomingChallengeModal';
import { OutgoingChallengeModal, OutgoingChallengeStatus } from '@/components/modals/OutgoingChallengeModal';
import {
  MatchChallenge,
  generateChallengeRoomCode,
  sendChallenge,
  respondToChallenge,
  cancelChallenge,
  subscribeToUserChallenges,
} from '@/lib/challenges/challengeService';
import {
  GroupMember,
  FriendGroup,
  MemberStatus,
  getUserGroups,
  fetchUserGroupsAsync,
  subscribeToGroupPresence,
} from '@/lib/groups/groupService';
import { Users, Bot, Globe, ArrowLeft, RefreshCw, Settings, Sun, Moon, Flag } from 'lucide-react';

export default function GamePage() {
  const { user, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [currentView, setCurrentView] = useState<'menu' | 'game'>('menu');
  const [mode, setMode] = useState<GameMode>('local');
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState('local'));
  const [orientation, setOrientation] = useState<WallOrientation>('H');
  const [clientPlayerId, setClientPlayerId] = useState<PlayerId>(1);

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
  const [showSettings, setShowSettings] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);

  // Realtime Match Challenge State
  const [incomingChallenge, setIncomingChallenge] = useState<MatchChallenge | null>(null);
  const [outgoingChallenge, setOutgoingChallenge] = useState<MatchChallenge | null>(null);
  const [outgoingStatus, setOutgoingStatus] = useState<OutgoingChallengeStatus>('waiting');

  const incomingChallengeRef = useRef<MatchChallenge | null>(incomingChallenge);
  useEffect(() => {
    incomingChallengeRef.current = incomingChallenge;
  }, [incomingChallenge]);

  const outgoingChallengeRef = useRef<MatchChallenge | null>(outgoingChallenge);
  useEffect(() => {
    outgoingChallengeRef.current = outgoingChallenge;
  }, [outgoingChallenge]);

  // Online Multiplayer State
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [isHost, setIsHost] = useState(true);
  const [playerName, setPlayerName] = useState(profile.name || 'Player 1');
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');

  const [opponentLeftInfo, setOpponentLeftInfo] = useState<{
    name: string;
    isOpen: boolean;
  } | null>(null);

  const realtimeBroadcastRef = useRef<((payload: RealtimePayload) => Promise<boolean>) | null>(null);
  const channelLeaveRef = useRef<(() => void) | null>(null);
  const handshakeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isOnlineMode = mode === 'online' || Boolean(roomCode) || gameState.mode === 'online';

  const gameStateRef = useRef<GameState>(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  const waitingForOpponentRef = useRef<boolean>(waitingForOpponent);
  useEffect(() => {
    waitingForOpponentRef.current = waitingForOpponent;
  }, [waitingForOpponent]);

  const modeRef = useRef<GameMode>(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const currentViewRef = useRef<'menu' | 'game'>(currentView);
  useEffect(() => {
    currentViewRef.current = currentView;
  }, [currentView]);

  const roomCodeRef = useRef<string | null>(roomCode);
  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  const [rematchStatus, setRematchStatus] = useState<RematchStatus>('idle');
  const rematchStatusRef = useRef<RematchStatus>('idle');
  useEffect(() => {
    rematchStatusRef.current = rematchStatus;
  }, [rematchStatus]);

  const handledChallengesRef = useRef<Set<string>>(new Set());

  // Clean exit after match closure / opponent left
  const handleExitAfterOpponentLeft = useCallback(() => {
    setOpponentLeftInfo(null);
    setRematchStatus('idle');
    if (modeRef.current === 'online' && realtimeBroadcastRef.current) {
      realtimeBroadcastRef.current({
        type: 'PLAYER_LEFT',
        playerId: clientPlayerId,
        playerName: profile.name || playerName || (clientPlayerId === 1 ? 'Player 1' : 'Player 2'),
      });
    }
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
    setMode('local');
    setGameState(createInitialGameState('local'));
    setCurrentView('menu');
  }, [clientPlayerId, playerName, profile.name]);

  // Clean cancel / close handler for online multiplayer lobby
  const handleCloseOnlineLobby = useCallback(() => {
    setShowLobby(false);

    // If user was waiting for an opponent or room was not in an active playing state
    if (waitingForOpponent || (mode === 'online' && gameState.status !== 'playing')) {
      if (realtimeBroadcastRef.current) {
        realtimeBroadcastRef.current({
          type: 'PLAYER_LEFT',
          playerId: clientPlayerId,
          playerName: profile.name || playerName || (clientPlayerId === 1 ? 'Player 1' : 'Player 2'),
        });
      }
      if (channelLeaveRef.current) {
        channelLeaveRef.current();
        channelLeaveRef.current = null;
      }
      if (handshakeIntervalRef.current) {
        clearInterval(handshakeIntervalRef.current);
        handshakeIntervalRef.current = null;
      }
      setOpponentLeftInfo(null);
      setWaitingForOpponent(false);
      setRoomCode(null);
      setMode('local');
      setGameState(createInitialGameState('local'));
    }
  }, [waitingForOpponent, mode, gameState.status, clientPlayerId, profile.name, playerName]);

  // Handle opponent departure notification
  const handleOpponentLeft = useCallback((leftPlayerId: PlayerId, customName?: string) => {
    // If the game has already concluded with a winner, update rematch state without disrupting victory screen
    if (gameStateRef.current.winner) {
      setRematchStatus('opponent_left');
      return;
    }

    sounds.playAlert();
    setActiveDrag(null);
    activeDragRef.current = null;

    const oppName =
      customName ||
      gameStateRef.current.players[leftPlayerId]?.name ||
      (leftPlayerId === 1 ? 'Host' : 'Opponent');

    setOpponentLeftInfo({
      name: oppName,
      isOpen: true,
    });
  }, []);

  // Toggle wall orientation
  const handleToggleOrientation = useCallback(() => {
    setOrientation((prev) => (prev === 'H' ? 'V' : 'H'));
  }, []);

  // Reset / Restart Game
  const handleRestart = useCallback(() => {
    setRematchStatus('idle');
    const newState = createInitialGameState(mode);
    const p1Name = gameState.players[1]?.name || playerName.trim() || profile.name || 'Player 1';
    newState.players[1].name = p1Name;
    newState.players[1].emoji = gameState.players[1]?.emoji || profile.emoji;
    if (gameState.players[2]?.name) {
      newState.players[2].name = gameState.players[2].name;
      newState.players[2].emoji = gameState.players[2]?.emoji;
    } else if (mode === 'ai') {
      newState.players[2].name = 'AI Bot';
      newState.players[2].emoji = '🤖';
    }
    setGameState(newState);
    setActiveDrag(null);
    activeDragRef.current = null;

    if (mode === 'online' && realtimeBroadcastRef.current) {
      realtimeBroadcastRef.current({
        type: 'SYNC_STATE',
        state: newState,
      });
    }
  }, [mode, gameState.players, playerName, profile.name, profile.emoji]);

  // Resign Match
  const handleResign = useCallback(() => {
    setShowResignConfirm(false);
    if (gameState.status !== 'playing' || gameState.winner) return;

    // Determine resigning and winning player:
    // In online mode: clientPlayerId forfeits.
    // In local pass & play: currentTurn player forfeits.
    // In vs AI: Player 1 forfeits.
    const resigningPlayerId: PlayerId =
      modeRef.current === 'online'
        ? clientPlayerId
        : modeRef.current === 'local'
        ? gameState.currentTurn
        : 1;

    const winningPlayerId: PlayerId = resigningPlayerId === 1 ? 2 : 1;

    sounds.playAlert();

    // Broadcast RESIGN to opponent in online mode
    if (modeRef.current === 'online' && realtimeBroadcastRef.current) {
      realtimeBroadcastRef.current({
        type: 'RESIGN',
        playerId: resigningPlayerId,
      });
    }

    setGameState((prev) => ({
      ...prev,
      status: winningPlayerId === 1 ? 'player1_won' : 'player2_won',
      winner: winningPlayerId,
      resignedPlayerId: resigningPlayerId,
    }));
  }, [gameState.status, gameState.winner, gameState.currentTurn, clientPlayerId]);

  // Rematch action handlers for online multiplayer
  const handleRequestRematch = useCallback(() => {
    if (modeRef.current !== 'online' || !realtimeBroadcastRef.current) return;
    setRematchStatus('requested');
    const myName = profile.name || playerName || (clientPlayerId === 1 ? 'Player 1' : 'Player 2');
    realtimeBroadcastRef.current({
      type: 'REMATCH_REQUEST',
      requestedBy: clientPlayerId,
      requesterName: myName,
    });
  }, [clientPlayerId, playerName, profile.name]);

  const handleAcceptRematch = useCallback(() => {
    if (modeRef.current !== 'online') return;
    setRematchStatus('accepted');
    const myName = profile.name || playerName || (clientPlayerId === 1 ? 'Player 1' : 'Player 2');
    if (realtimeBroadcastRef.current) {
      realtimeBroadcastRef.current({
        type: 'REMATCH_RESPONSE',
        respondedBy: clientPlayerId,
        accepted: true,
        responderName: myName,
      });
    }
    if (clientPlayerId === 1) {
      handleRestart();
    } else if (realtimeBroadcastRef.current) {
      realtimeBroadcastRef.current({
        type: 'RESTART_GAME',
        requestedBy: clientPlayerId,
      });
    }
  }, [clientPlayerId, handleRestart, playerName, profile.name]);

  const handleDeclineRematch = useCallback(() => {
    if (modeRef.current !== 'online') return;
    setRematchStatus('declined');
    const myName = profile.name || playerName || (clientPlayerId === 1 ? 'Player 1' : 'Player 2');
    if (realtimeBroadcastRef.current) {
      realtimeBroadcastRef.current({
        type: 'REMATCH_RESPONSE',
        respondedBy: clientPlayerId,
        accepted: false,
        responderName: myName,
      });
    }
  }, [clientPlayerId, playerName, profile.name]);

  const handleCancelRematch = useCallback(() => {
    if (modeRef.current !== 'online') return;
    setRematchStatus('idle');
    if (realtimeBroadcastRef.current) {
      realtimeBroadcastRef.current({
        type: 'REMATCH_CANCEL',
        requestedBy: clientPlayerId,
      });
    }
  }, [clientPlayerId]);

  // Keep playerName and emoji in sync with profile and active game state
  useEffect(() => {
    if (profile.name) {
      setPlayerName(profile.name);
    }
    setGameState((prev) => {
      const targetId = clientPlayerId;
      const targetPlayer = prev.players[targetId];
      if (!targetPlayer) return prev;

      const newName = profile.name || targetPlayer.name;
      const newEmoji = profile.emoji !== undefined ? (profile.emoji || undefined) : targetPlayer.emoji;

      // Only update if actually changed
      if (targetPlayer.name === newName && targetPlayer.emoji === newEmoji) {
        return prev;
      }

      const nextState: GameState = {
        ...prev,
        players: {
          ...prev.players,
          [targetId]: {
            ...targetPlayer,
            name: newName,
            emoji: newEmoji,
          },
        },
      };

      if (mode === 'online' && realtimeBroadcastRef.current) {
        realtimeBroadcastRef.current({
          type: 'SYNC_STATE',
          state: nextState,
        });
      }

      return nextState;
    });
  }, [profile.name, profile.emoji, clientPlayerId, mode]);

  // Check URL query parameters for direct room links (e.g. ?room=ABCD)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam) {
        const code = roomParam.toUpperCase();
        if (isSupabaseConfigured()) {
          setWaitingForOpponent(true);
          setShowLobby(true);
          setIsHost(false);
          const guestName = profile.name || 'Guest';
          setPlayerName(guestName);
          setupRealtimeRoom(code, false, guestName, profile.emoji);
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
    const initial = createInitialGameState(newMode);
    initial.players[1].name = playerName.trim() || profile.name || 'Player 1';
    initial.players[1].emoji = profile.emoji;
    if (newMode === 'ai') {
      initial.players[2].name = 'AI Bot';
      initial.players[2].emoji = '🤖';
    }
    setGameState(initial);
    setClientPlayerId(1);
    setActiveDrag(null);
    activeDragRef.current = null;
    setRoomCode(null);
    setWaitingForOpponent(false);
    setCurrentView('game');
  };

  const handleRequestExitToMenu = () => {
    // If in active online game, always confirm before abandoning match
    if (isOnlineMode && !waitingForOpponent && gameState.status === 'playing') {
      setShowExitConfirm(true);
      return;
    }

    const hasMadeMoves =
      gameState.walls.length > 0 ||
      gameState.players[1].position.r !== 8 ||
      gameState.players[2].position.r !== 0;

    if (gameState.status === 'playing' && hasMadeMoves) {
      setShowExitConfirm(true);
    } else {
      if (isOnlineMode && realtimeBroadcastRef.current) {
        realtimeBroadcastRef.current({
          type: 'PLAYER_LEFT',
          playerId: clientPlayerId,
          playerName: profile.name || playerName || (clientPlayerId === 1 ? 'Player 1' : 'Player 2'),
        });
      }
      if (channelLeaveRef.current) {
        channelLeaveRef.current();
        channelLeaveRef.current = null;
      }
      if (handshakeIntervalRef.current) {
        clearInterval(handshakeIntervalRef.current);
        handshakeIntervalRef.current = null;
      }
      setOpponentLeftInfo(null);
      setWaitingForOpponent(false);
      setRoomCode(null);
      setMode('local');
      setGameState(createInitialGameState('local'));
      setCurrentView('menu');
    }
  };

  const handleConfirmExitToMenu = async () => {
    setShowExitConfirm(false);
    setActiveDrag(null);
    activeDragRef.current = null;

    if (isOnlineMode && realtimeBroadcastRef.current) {
      try {
        await realtimeBroadcastRef.current({
          type: 'PLAYER_LEFT',
          playerId: clientPlayerId,
          playerName: profile.name || playerName || (clientPlayerId === 1 ? 'Player 1' : 'Player 2'),
        });
      } catch (err) {
        console.error('Failed to broadcast leave:', err);
      }
    }

    if (channelLeaveRef.current) {
      channelLeaveRef.current();
      channelLeaveRef.current = null;
    }
    if (handshakeIntervalRef.current) {
      clearInterval(handshakeIntervalRef.current);
      handshakeIntervalRef.current = null;
    }
    setOpponentLeftInfo(null);
    setWaitingForOpponent(false);
    setRoomCode(null);
    setMode('local');
    setGameState(createInitialGameState('local'));
    setCurrentView('menu');
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

  // Perform Wall Placement directly
  const handlePlaceWall = useCallback((placement: { r: number; c: number; orientation: WallOrientation }) => {
    const res = applyWallPlacement(gameState, placement);
    if (!res.success) return;

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

  // Drag-and-drop Handlers using Synchronous Ref to eliminate stale closures
  const handleDragStart = (
    dragOrientation: WallOrientation,
    startX: number,
    startY: number,
    isTouch: boolean
  ) => {
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
    (code: string, isHostRole: boolean, currentName: string, currentEmoji?: string) => {
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
      baseState.players[1].emoji = isHostRole ? currentEmoji : undefined;
      baseState.players[2].name = !isHostRole ? currentName : 'Waiting for opponent...';
      baseState.players[2].emoji = !isHostRole ? currentEmoji : undefined;
      setGameState(baseState);

      let hasSynced = false;

      const { broadcast, leave } = subscribeToGameRoom(
        cleanCode,
        (payload) => {
          if (payload.type === 'PLAYER_JOIN') {
            if (isHostRole) {
              setWaitingForOpponent(false);
              setShowLobby(false);
              setOutgoingChallenge(null);
              setCurrentView('game');
              sounds.playWall();

              setGameState((prev) => {
                const updated: GameState = {
                  ...prev,
                  players: {
                    ...prev.players,
                    1: {
                      ...prev.players[1],
                      name: currentName || prev.players[1].name || 'Player 1',
                      emoji: currentEmoji || prev.players[1].emoji,
                    },
                    2: {
                      ...prev.players[2],
                      name: payload.playerName || 'Player 2',
                      emoji: payload.playerEmoji,
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
              setCurrentView('game');
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
            const stateToApply: GameState = {
              ...payload.state,
              players: {
                ...payload.state.players,
                2: {
                  ...payload.state.players[2],
                  name:
                    !isHostRole
                      ? currentName || payload.state.players[2]?.name || 'Player 2'
                      : payload.state.players[2]?.name || 'Player 2',
                  emoji:
                    !isHostRole
                      ? currentEmoji || payload.state.players[2]?.emoji
                      : payload.state.players[2]?.emoji,
                },
              },
            };
            setGameState(stateToApply);
            setWaitingForOpponent(false);
            setShowLobby(false);
            setOutgoingChallenge(null);
            setRematchStatus('idle');
            setCurrentView('game');
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
          } else if (payload.type === 'REMATCH_REQUEST') {
            // If local player already clicked Request Rematch, auto-accept mutual request!
            if (rematchStatusRef.current === 'requested') {
              setRematchStatus('accepted');
              sounds.playWin();
              broadcast({
                type: 'REMATCH_RESPONSE',
                respondedBy: isHostRole ? 1 : 2,
                accepted: true,
                responderName: currentName,
              });
              if (isHostRole) {
                handleRestart();
              }
            } else {
              setRematchStatus('received');
              sounds.playChallenge();
            }
          } else if (payload.type === 'REMATCH_RESPONSE') {
            if (payload.accepted) {
              setRematchStatus('accepted');
              if (isHostRole) {
                handleRestart();
              }
            } else {
              setRematchStatus('declined');
              sounds.playAlert();
            }
          } else if (payload.type === 'REMATCH_CANCEL') {
            if (rematchStatusRef.current === 'received') {
              setRematchStatus('idle');
            }
          } else if (payload.type === 'RESIGN') {
            const winningPlayerId: PlayerId = payload.playerId === 1 ? 2 : 1;
            sounds.playWin();
            setGameState((prev) => ({
              ...prev,
              status: winningPlayerId === 1 ? 'player1_won' : 'player2_won',
              winner: winningPlayerId,
              resignedPlayerId: payload.playerId,
            }));
          } else if (payload.type === 'PLAYER_LEFT') {
            if (payload.playerId !== (isHostRole ? 1 : 2)) {
              handleOpponentLeft(payload.playerId, payload.playerName);
            }
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
                playerEmoji: currentEmoji,
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
                  playerEmoji: currentEmoji,
                });
              }, 800);
            }
          }
        },
        {
          playerId: isHostRole ? 1 : 2,
          playerName: currentName,
          onOpponentLeave: (oppId) => {
            handleOpponentLeft(oppId);
          },
        }
      );

      channelLeaveRef.current = leave;
      realtimeBroadcastRef.current = broadcast;
    },
    [handleRestart, handleOpponentLeft]
  );

  // Online: Create Room
  const handleCreateRoom = (hostName: string) => {
    const code = generateRoomCode();
    setWaitingForOpponent(true);
    setIsHost(true);
    const effectiveName = hostName.trim() || playerName.trim() || profile.name || 'Player 1';
    setPlayerName(effectiveName);
    setupRealtimeRoom(code, true, effectiveName, profile.emoji);
  };

  // Online: Join Room
  const handleJoinRoom = (code: string, guestName: string) => {
    const clean = code.trim().toUpperCase();
    setWaitingForOpponent(true);
    setIsHost(false);
    const effectiveName = guestName.trim() || playerName.trim() || profile.name || 'Player 2';
    setPlayerName(effectiveName);
    setupRealtimeRoom(clean, false, effectiveName, profile.emoji);
  };

  // Handle challenging a specific player
  const handleChallengePlayer = useCallback(
    async (targetMember: GroupMember, group?: FriendGroup) => {
      const roomCode = generateChallengeRoomCode();
      const currentId = user?.id || profile.id || 'guest_user';
      const currentName = profile.name || playerName || 'Player 1';

      const challenge: MatchChallenge = {
        id: `chal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        challengerId: currentId,
        challengerName: currentName,
        challengerEmoji: profile.emoji || undefined,
        targetUserId: targetMember.id,
        targetUserName: targetMember.name,
        roomCode,
        groupCode: group?.code,
        groupName: group?.name,
        createdAt: Date.now(),
      };

      setOutgoingChallenge(challenge);
      setOutgoingStatus('waiting');
      setShowGroups(false);

      // Setup host room and listen for opponent connection
      setupRealtimeRoom(roomCode, true, currentName, profile.emoji);
      setWaitingForOpponent(true);

      // Send challenge notification
      await sendChallenge(challenge);
    },
    [user?.id, profile.id, profile.name, profile.emoji, playerName, setupRealtimeRoom]
  );

  // Cancel outgoing challenge
  const handleCancelOutgoingChallenge = useCallback(
    async (challenge: MatchChallenge) => {
      setOutgoingStatus('cancelled');
      await cancelChallenge(challenge);
      setTimeout(() => {
        setOutgoingChallenge(null);
      }, 500);

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
      setMode('local');
      setGameState(createInitialGameState('local'));
      setCurrentView('menu');
    },
    []
  );

  // Clean close for outgoing challenge modal
  const handleCloseOutgoingChallenge = useCallback(() => {
    setOutgoingChallenge(null);
    setOutgoingStatus('waiting');
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
    setMode('local');
    setGameState(createInitialGameState('local'));
    setCurrentView('menu');
  }, []);

  // Accept incoming challenge
  const handleAcceptIncomingChallenge = useCallback(
    async (challenge: MatchChallenge) => {
      handledChallengesRef.current.add(challenge.id);
      const currentId = user?.id || profile.id || 'guest_user';
      const currentName = profile.name || playerName || 'Player 2';

      await respondToChallenge(
        challenge,
        'accepted',
        currentId,
        currentName,
        profile.emoji || undefined
      );

      setIncomingChallenge(null);
      setShowGroups(false);
      setShowLobby(false);

      // Join game room as guest (Player 2)
      setPlayerName(currentName);
      setWaitingForOpponent(true);
      setIsHost(false);
      setupRealtimeRoom(challenge.roomCode, false, currentName, profile.emoji);
    },
    [user?.id, profile.id, profile.name, profile.emoji, playerName, setupRealtimeRoom]
  );

  // Decline incoming challenge
  const handleDeclineIncomingChallenge = useCallback(
    async (challenge: MatchChallenge) => {
      handledChallengesRef.current.add(challenge.id);
      const currentId = user?.id || profile.id || 'guest_user';
      const currentName = profile.name || playerName || 'Player 2';

      await respondToChallenge(
        challenge,
        'declined',
        currentId,
        currentName,
        profile.emoji || undefined
      );

      setIncomingChallenge(null);
      // Ensure local state is clean
      setWaitingForOpponent(false);
      setRoomCode(null);
      setMode('local');
      setGameState(createInitialGameState('local'));
    },
    [user?.id, profile.id, profile.name, profile.emoji, playerName]
  );

  // Subscribe to incoming match challenges and response notifications across the app
  useEffect(() => {
    const currentId = user?.id || profile.id || 'guest_user';
    const currentName = profile.name || playerName || 'Player 1';

    const unsubscribe = subscribeToUserChallenges(
      { id: currentId, name: currentName },
      (payload) => {
        if (payload.type === 'CHALLENGE_INVITE') {
          // If already declined or accepted this exact challenge ID, ignore duplicate
          if (handledChallengesRef.current.has(payload.challenge.id)) {
            return;
          }
          if (incomingChallengeRef.current && incomingChallengeRef.current.id === payload.challenge.id) {
            return;
          }

          // Never auto-decline: Always show incoming challenge to the user
          setIncomingChallenge(payload.challenge);
        } else if (payload.type === 'CHALLENGE_RESPONSE') {
          if (outgoingChallengeRef.current && outgoingChallengeRef.current.id === payload.challengeId) {
            if (payload.status === 'accepted') {
              setOutgoingStatus('accepted');
              setTimeout(() => {
                setOutgoingChallenge(null);
              }, 1200);
            } else if (payload.status === 'declined') {
              setOutgoingStatus('declined');
              sounds.playChallengeDeclined();
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
              setMode('local');
              setGameState(createInitialGameState('local'));
              setCurrentView('menu');
            }
          }
        } else if (payload.type === 'CHALLENGE_CANCEL') {
          if (incomingChallengeRef.current && incomingChallengeRef.current.id === payload.challengeId) {
            setIncomingChallenge(null);
          }
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id, profile.id, profile.name, profile.emoji, playerName]);

  // Active circles the player belongs to
  const [userGroups, setUserGroups] = useState<FriendGroup[]>([]);

  // Sync user circles on login, profile update, or group change
  useEffect(() => {
    // Only authenticated users have synced circles
    if (!user || !user.id || profile.isGuest) {
      setUserGroups([]);
      return;
    }
    const currentId = user.id;
    const currentName = profile.name || playerName || 'Player';

    const local = getUserGroups(currentId, currentName);
    setUserGroups(local);

    fetchUserGroupsAsync(currentId, currentName).then((remote) => {
      if (remote && remote.length > 0) {
        setUserGroups(remote);
      }
    });

    const handleGroupsUpdated = () => {
      setUserGroups(getUserGroups(currentId, currentName));
    };

    window.addEventListener('blockade_groups_updated', handleGroupsUpdated);
    window.addEventListener('storage', handleGroupsUpdated);
    return () => {
      window.removeEventListener('blockade_groups_updated', handleGroupsUpdated);
      window.removeEventListener('storage', handleGroupsUpdated);
    };
  }, [user?.id, profile.isGuest, profile.name, playerName]);

  // Continuously maintain dynamic presence (online vs in_game) across all groups the user belongs to
  useEffect(() => {
    // Only authenticated accounts broadcast presence into groups
    if (!user || !user.id || profile.isGuest || !profile.name) {
      return;
    }

    if (userGroups.length === 0) return;

    const currentId = user.id;
    const currentName = profile.name;
    const currentStatus: MemberStatus =
      currentView === 'game' && gameState.status === 'playing'
        ? 'in_game'
        : 'online';

    const subscriptions: { unsubscribe: () => void }[] = [];

    userGroups.forEach((group) => {
      if (!group || !group.code || typeof group.code !== 'string') return;
      const sub = subscribeToGroupPresence(
        group.code,
        {
          id: currentId,
          name: currentName,
          emoji: profile.emoji || undefined,
          status: currentStatus,
        },
        () => {} // Background sync
      );
      subscriptions.push(sub);
    });

    return () => {
      subscriptions.forEach((s) => s.unsubscribe());
    };
  }, [
    user?.id,
    profile.isGuest,
    profile.name,
    profile.emoji,
    currentView,
    gameState.status,
    userGroups,
  ]);

  // Broadcast player departure on window unload / close
  useEffect(() => {
    if (!isOnlineMode || !roomCode) return;

    const handleBeforeUnload = () => {
      if (realtimeBroadcastRef.current) {
        realtimeBroadcastRef.current({
          type: 'PLAYER_LEFT',
          playerId: clientPlayerId,
          playerName: profile.name || playerName || (clientPlayerId === 1 ? 'Player 1' : 'Player 2'),
        });
      }
      if (channelLeaveRef.current) {
        channelLeaveRef.current();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOnlineMode, roomCode, clientPlayerId, profile.name, playerName]);

  const isMyTurn =
    !isOnlineMode && mode === 'local'
      ? true
      : gameState.currentTurn === clientPlayerId &&
        gameState.status === 'playing' &&
        !opponentLeftInfo;

  const isPlayerInteractionDisabled =
    (isOnlineMode && gameState.currentTurn !== clientPlayerId) ||
    opponentLeftInfo !== null;

  const opponentPlayerId: PlayerId = clientPlayerId === 1 ? 2 : 1;
  const isFlipped = clientPlayerId === 2;

  if (currentView === 'menu') {
    return (
      <main className="h-full min-h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center transition-colors duration-150">
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
            setShowGroups(false);
            handleCreateRoom(profile.name || 'Player 1');
            setShowLobby(true);
          }}
          onChallengePlayer={handleChallengePlayer}
        />

        {/* Incoming Challenge Notification Modal */}
        <IncomingChallengeModal
          key={incomingChallenge?.id || 'none'}
          challenge={incomingChallenge}
          onAccept={handleAcceptIncomingChallenge}
          onDecline={handleDeclineIncomingChallenge}
        />

        {/* Outgoing Challenge Status Modal */}
        <OutgoingChallengeModal
          challenge={outgoingChallenge}
          status={outgoingStatus}
          onCancel={handleCancelOutgoingChallenge}
          onClose={handleCloseOutgoingChallenge}
        />

        <OnlineLobbyModal
          isOpen={showLobby}
          onClose={handleCloseOnlineLobby}
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
      </main>
    );
  }

  return (
    <div className="w-full h-full min-h-[100dvh] bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center transition-colors duration-150">
      <main className="h-full h-[100dvh] w-full flex flex-col justify-between items-center px-2 py-1 sm:py-2 max-w-md mx-auto overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-zinc-100">
      {/* 1. Mobile Top Bar */}
      <header className="w-full flex items-center justify-between gap-2 pt-safe pb-1">
        <button
          type="button"
          onClick={handleRequestExitToMenu}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold tap-bounce shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
          <span>Menu</span>
        </button>

        {/* Mode Indicator Chip */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-800 dark:text-zinc-200 shadow-sm">
          {mode === 'ai' ? (
            <>
              <Bot className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              <span>vs AI Bot</span>
            </>
          ) : mode === 'local' ? (
            <>
              <Users className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>Pass & Play</span>
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              <span>Online Match</span>
            </>
          )}
        </div>

        {/* Action Buttons: Theme, Reset (offline) and Settings (logged in) */}
        <div className="flex items-center gap-1.5">
          {/* In-Game Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex items-center justify-center p-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold tap-bounce shadow-sm"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-700" />
            )}
          </button>

          {/* In-Game Resign Button */}
          {gameState.status === 'playing' && !gameState.winner && (
            <button
              type="button"
              onClick={() => setShowResignConfirm(true)}
              title="Resign Match"
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-zinc-800 hover:border-rose-200 dark:hover:border-rose-800/60 text-slate-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold tap-bounce shadow-sm transition-colors"
            >
              <Flag className="w-3.5 h-3.5 text-rose-500" />
              <span className="hidden sm:inline">Resign</span>
            </button>
          )}

          {!isOnlineMode && (
            <button
              type="button"
              onClick={handleRestart}
              title="Restart Match"
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 text-xs font-semibold tap-bounce shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
          {user && (
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              title="Player Settings"
              className="flex items-center justify-center p-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-sky-600 dark:hover:text-sky-300 text-xs font-semibold tap-bounce shadow-sm"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Online room banner if active */}
      {isOnlineMode && roomCode && (
        <div className="w-full px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
            <span>
              Room: <strong className="font-mono text-amber-500 dark:text-amber-400">{roomCode}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowLobby(true)}
            className="text-sky-600 dark:text-sky-400 font-semibold"
          >
            Details
          </button>
        </div>
      )}

      {/* 2. Middle Game Core: Opponent -> Board -> Player */}
      <div className="w-full flex flex-col items-center justify-center gap-5 sm:gap-6 my-auto">
        {/* Opponent Card (Top) */}
        <PlayerCard
          player={gameState.players[opponentPlayerId]}
          isCurrentTurn={gameState.currentTurn === opponentPlayerId}
          walls={gameState.walls}
          isClientPlayer={false}
          targetDescription="Bottom Row"
        />

        {/* 9x9 Touch Game Board */}
        <GameBoard
          ref={boardRef}
          gameState={gameState}
          onMovePawn={handleMovePawn}
          onPlaceWall={handlePlaceWall}
          clientPlayerId={mode === 'local' ? gameState.currentTurn : clientPlayerId}
          activeDrag={activeDrag}
          disabled={isPlayerInteractionDisabled}
          isFlipped={isFlipped}
        />

        {/* Client Player Card (Bottom) */}
        <PlayerCard
          player={gameState.players[clientPlayerId]}
          isCurrentTurn={gameState.currentTurn === clientPlayerId}
          walls={gameState.walls}
          isClientPlayer={isOnlineMode ? true : undefined}
          targetDescription="Top Row"
        />
      </div>

      {/* 3. Bottom Thumb Zone Controls & Wall Tray */}
      <MobileControls
        onRestart={!isOnlineMode ? handleRestart : undefined}
        onResign={gameState.status === 'playing' && !gameState.winner ? () => setShowResignConfirm(true) : undefined}
        onOpenRules={() => setShowRules(true)}
        wallsLeft={gameState.players[gameState.currentTurn].wallsLeft}
        currentTurn={gameState.currentTurn}
        isMyTurn={isMyTurn}
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
        onExitToMenu={handleExitAfterOpponentLeft}
        clientPlayerId={mode === 'online' ? clientPlayerId : undefined}
        rematchStatus={rematchStatus}
        onRequestRematch={handleRequestRematch}
        onAcceptRematch={handleAcceptRematch}
        onDeclineRematch={handleDeclineRematch}
        onCancelRematch={handleCancelRematch}
        opponentName={gameState.players[opponentPlayerId]?.name || 'Opponent'}
      />

      <ResignConfirmModal
        isOpen={showResignConfirm}
        onConfirm={handleResign}
        onCancel={() => setShowResignConfirm(false)}
      />

      <OpponentLeftModal
        isOpen={Boolean(opponentLeftInfo?.isOpen)}
        opponentName={opponentLeftInfo?.name || 'Opponent'}
        onExitToMenu={handleExitAfterOpponentLeft}
      />

      <OnlineLobbyModal
        isOpen={showLobby}
        onClose={handleCloseOnlineLobby}
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
          setShowGroups(false);
          handleCreateRoom(profile.name || 'Player 1');
          setShowLobby(true);
        }}
        onChallengePlayer={handleChallengePlayer}
      />

      {/* Incoming Challenge Notification Modal */}
      <IncomingChallengeModal
        key={incomingChallenge?.id || 'none'}
        challenge={incomingChallenge}
        onAccept={handleAcceptIncomingChallenge}
        onDecline={handleDeclineIncomingChallenge}
      />

      {/* Outgoing Challenge Status Modal */}
      <OutgoingChallengeModal
        challenge={outgoingChallenge}
        status={outgoingStatus}
        onCancel={handleCancelOutgoingChallenge}
        onClose={handleCloseOutgoingChallenge}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Exit Match Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xs p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl text-center space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100">
              {isOnlineMode ? 'Leave Online Match?' : 'Exit to Main Menu?'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400">
              {isOnlineMode
                ? 'Your opponent will be notified that you left, and the match will close.'
                : 'Your ongoing match will be ended and progress lost.'}
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 font-semibold text-xs tap-bounce border border-slate-200 dark:border-zinc-700/60 transition-colors"
              >
                Keep Playing
              </button>
              <button
                type="button"
                onClick={handleConfirmExitToMenu}
                className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs tap-bounce shadow-md"
              >
                {isOnlineMode ? 'Leave Match' : 'Exit Match'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  </div>
  );
}
