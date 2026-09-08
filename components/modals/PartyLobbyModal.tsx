'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  Crown,
  Users,
  Swords,
  Check,
  Clock,
  Play,
  Zap,
  LogOut,
  AlertCircle,
} from 'lucide-react';
import { PlayerId, GameVariant } from '@/lib/game/types';
import { PLAYER_THEMES, getCoreRaceConfig, getSprintRaceConfig } from '@/lib/game/board';
import {
  PartyLobbyMember,
  ActiveLobbyInfo,
  subscribeToPartyLobby,
  PartyLobbySubscription,
} from '@/lib/groups/partyLobbyService';

export type { PartyLobbyMember, ActiveLobbyInfo };

interface PartyLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupCode: string;
  groupName: string;
  isHost: boolean;
  currentUserId: string;
  currentUserName: string;
  currentUserEmoji?: string;
  initialLobby?: ActiveLobbyInfo | null;
  onStartMatch: (
    members: PartyLobbyMember[],
    boardSize: number,
    variant: GameVariant,
    roomCode?: string
  ) => void;
}

export const PartyLobbyModal: React.FC<PartyLobbyModalProps> = ({
  isOpen,
  onClose,
  groupCode,
  groupName,
  isHost,
  currentUserId,
  currentUserName,
  currentUserEmoji,
  initialLobby,
  onStartMatch,
}) => {
  const [gameVariant, setGameVariant] = useState<GameVariant>(
    initialLobby?.variant || 'sprint_race'
  );
  const defaultMaxPlayers = (initialLobby?.variant || 'sprint_race') === 'core_race' ? 6 : 10;
  const [maxPlayers, setMaxPlayers] = useState<number>(
    initialLobby?.maxPlayers || defaultMaxPlayers
  );
  const [lobbyMembers, setLobbyMembers] = useState<PartyLobbyMember[]>(() => {
    if (isHost) {
      return [
        {
          id: currentUserId,
          name: currentUserName,
          emoji: currentUserEmoji,
          slot: 1,
          isReady: true,
          isHost: true,
        },
      ];
    }
    if (initialLobby?.members && initialLobby.members.length > 0) {
      return initialLobby.members;
    }
    return [];
  });
  const [closedNotice, setClosedNotice] = useState<string | null>(null);

  const subRef = useRef<PartyLobbySubscription | null>(null);
  const membersRef = useRef<PartyLobbyMember[]>(lobbyMembers);
  membersRef.current = lobbyMembers;

  const variantRef = useRef<GameVariant>(gameVariant);
  variantRef.current = gameVariant;

  const maxPlayersRef = useRef<number>(maxPlayers);
  maxPlayersRef.current = maxPlayers;

  const onStartMatchRef = useRef(onStartMatch);
  onStartMatchRef.current = onStartMatch;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;

  const currentUserNameRef = useRef(currentUserName);
  currentUserNameRef.current = currentUserName;

  const currentUserEmojiRef = useRef(currentUserEmoji);
  currentUserEmojiRef.current = currentUserEmoji;

  const hasInitializedRef = useRef(false);

  // Initialize state only when transitioning from closed to open
  useEffect(() => {
    if (isOpen) {
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        setClosedNotice(null);
        if (isHost) {
          const initialHost: PartyLobbyMember = {
            id: currentUserId,
            name: currentUserName,
            emoji: currentUserEmoji,
            slot: 1,
            isReady: true,
            isHost: true,
          };
          setLobbyMembers([initialHost]);
        } else {
          if (initialLobby?.members && initialLobby.members.length > 0) {
            setLobbyMembers(initialLobby.members);
            setGameVariant(initialLobby.variant);
            setMaxPlayers(initialLobby.maxPlayers);
          } else {
            setLobbyMembers([]);
          }
        }
      }
    } else {
      hasInitializedRef.current = false;
    }
  }, [isOpen, isHost, currentUserId, currentUserName, currentUserEmoji]);

  // Realtime Party Lobby subscription via reference-counted service
  useEffect(() => {
    if (!isOpen || !groupCode) return;

    const sub = subscribeToPartyLobby(groupCode, currentUserId, {
      onLobbySync: (lobby) => {
        if (lobby?.members && Array.isArray(lobby.members)) {
          setLobbyMembers(lobby.members);
        }
        if (lobby?.maxPlayers) {
          setMaxPlayers(lobby.maxPlayers);
        }
        if (lobby?.variant) {
          setGameVariant(lobby.variant);
        }
      },
      onMemberJoin: ({ id, name, emoji }) => {
        if (!isHostRef.current) return;
        const curMembers = membersRef.current;
        const curMax = maxPlayersRef.current;
        const curVariant = variantRef.current;

        const existingIndex = curMembers.findIndex((m) => m.id === id);
        if (existingIndex !== -1) {
          const updated = curMembers.map((m) =>
            m.id === id ? { ...m, name: name || m.name, emoji: emoji || m.emoji } : m
          );
          setLobbyMembers(updated);
          sub.broadcastLobbyState(updated, curMax, curVariant, {
            id: currentUserId,
            name: currentUserNameRef.current,
            emoji: currentUserEmojiRef.current,
          });
          return;
        }

        if (curMembers.length >= curMax) return;

        const takenSlots = new Set(curMembers.map((m) => m.slot));
        let assignedSlot: PlayerId = 2;
        for (let s = 1; s <= curMax; s++) {
          if (!takenSlots.has(s as PlayerId)) {
            assignedSlot = s as PlayerId;
            break;
          }
        }

        const newMember: PartyLobbyMember = {
          id,
          name: name || `Player ${assignedSlot}`,
          emoji,
          slot: assignedSlot,
          isReady: false,
          isHost: false,
        };

        const updated = [...curMembers, newMember];
        setLobbyMembers(updated);
        sub.broadcastLobbyState(updated, curMax, curVariant, {
          id: currentUserId,
          name: currentUserNameRef.current,
          emoji: currentUserEmojiRef.current,
        });
      },
      onMemberReady: ({ id, isReady }) => {
        if (!isHostRef.current) return;
        const curMembers = membersRef.current;
        const updated = curMembers.map((m) =>
          m.id === id ? { ...m, isReady: Boolean(isReady) } : m
        );
        setLobbyMembers(updated);
        sub.broadcastLobbyState(updated, maxPlayersRef.current, variantRef.current, {
          id: currentUserId,
          name: currentUserNameRef.current,
          emoji: currentUserEmojiRef.current,
        });
      },
      onMemberLeave: ({ id }) => {
        if (!isHostRef.current) return;
        const curMembers = membersRef.current;
        const updated = curMembers.filter((m) => m.id !== id);
        setLobbyMembers(updated);
        sub.broadcastLobbyState(updated, maxPlayersRef.current, variantRef.current, {
          id: currentUserId,
          name: currentUserNameRef.current,
          emoji: currentUserEmojiRef.current,
        });
      },
      onRequestLobbyInfo: () => {
        if (isHostRef.current) {
          sub.broadcastLobbyState(membersRef.current, maxPlayersRef.current, variantRef.current, {
            id: currentUserId,
            name: currentUserNameRef.current,
            emoji: currentUserEmojiRef.current,
          });
        }
      },
      onLobbyStart: (payload) => {
        if (payload?.members && payload?.boardSize) {
          onStartMatchRef.current(
            payload.members,
            payload.boardSize,
            payload.variant || 'sprint_race',
            payload.roomCode
          );
          onCloseRef.current();
        }
      },
      onLobbyClosed: (payload) => {
        if (payload?.reason === 'match_started') return;
        if (!isHostRef.current) {
          setClosedNotice('The host has closed the party lobby.');
          setTimeout(() => {
            onCloseRef.current();
          }, 1200);
        }
      },
    });

    subRef.current = sub;

    if (isHostRef.current) {
      sub.broadcastLobbyState(membersRef.current, maxPlayersRef.current, variantRef.current, {
        id: currentUserId,
        name: currentUserNameRef.current,
        emoji: currentUserEmojiRef.current,
      });
    } else {
      sub.sendMemberJoin({
        id: currentUserId,
        name: currentUserNameRef.current,
        emoji: currentUserEmojiRef.current,
      });
    }

    // Host heartbeat: re-announce every 2.5s
    let heartbeat: NodeJS.Timeout | null = null;
    if (isHostRef.current) {
      heartbeat = setInterval(() => {
        if (subRef.current) {
          subRef.current.broadcastLobbyState(
            membersRef.current,
            maxPlayersRef.current,
            variantRef.current,
            {
              id: currentUserId,
              name: currentUserNameRef.current,
              emoji: currentUserEmojiRef.current,
            }
          );
        }
      }, 2500);
    }

    return () => {
      if (heartbeat) clearInterval(heartbeat);
      sub.unsubscribe();
      subRef.current = null;
    };
  }, [isOpen, groupCode, currentUserId]);

  // Toggle ready status for non-host
  const handleToggleReady = () => {
    const me = lobbyMembers.find((m) => m.id === currentUserId);
    const nextReady = !me?.isReady;

    setLobbyMembers((prev) =>
      prev.map((m) => (m.id === currentUserId ? { ...m, isReady: nextReady } : m))
    );

    if (subRef.current) {
      subRef.current.sendMemberReady(currentUserId, nextReady);
    }
  };

  // Host starts the match
  const handleHostStart = async () => {
    const config =
      gameVariant === 'sprint_race'
        ? getSprintRaceConfig(lobbyMembers.length)
        : getCoreRaceConfig(lobbyMembers.length);

    const cleanGroup = groupCode.trim().toLowerCase();
    const partyRoomCode = `party_${cleanGroup}`;

    if (subRef.current) {
      await subRef.current.sendLobbyStart({
        members: lobbyMembers,
        boardSize: config.boardSize,
        variant: gameVariant,
        roomCode: partyRoomCode,
      });

      await subRef.current.sendLobbyClosed(currentUserId, 'match_started');
    }

    onStartMatch(lobbyMembers, config.boardSize, gameVariant, partyRoomCode);
    onClose();
  };

  // Leave / Close modal
  const handleLeaveLobby = () => {
    if (subRef.current) {
      if (isHost) {
        subRef.current.sendLobbyClosed(currentUserId);
      } else {
        subRef.current.sendMemberLeave(currentUserId);
      }
    }
    onClose();
  };

  const dynamicConfig = useMemo(() => {
    const count = lobbyMembers.length || 3;
    return gameVariant === 'sprint_race'
      ? getSprintRaceConfig(count)
      : getCoreRaceConfig(count);
  }, [lobbyMembers.length, gameVariant]);

  const canStart = lobbyMembers.length >= 3 && lobbyMembers.every((m) => m.isReady);
  const userMember = lobbyMembers.find((m) => m.id === currentUserId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3.5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Notice Toast when lobby is closed */}
        {closedNotice && (
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{closedNotice}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-md">
              {gameVariant === 'sprint_race' ? (
                <Zap className="w-5 h-5 fill-current" />
              ) : (
                <Crown className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {gameVariant === 'sprint_race' ? 'Sprint Race' : 'King of the Core'}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {isHost ? 'Host' : 'Party Lobby'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Group: <strong className="text-slate-800 dark:text-zinc-200">{groupName}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLeaveLobby}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Game Mode Dropdown Selector */}
        <div className="p-3 rounded-2xl bg-slate-100 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-between gap-2 text-xs">
          <span className="font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
            {gameVariant === 'sprint_race' ? (
              <Zap className="w-4 h-4 text-amber-500" />
            ) : (
              <Crown className="w-4 h-4 text-amber-500" />
            )}
            Game Mode:
          </span>
          {isHost ? (
            <select
              value={gameVariant}
              onChange={(e) => {
                const newVar = e.target.value as GameVariant;
                setGameVariant(newVar);
                const hostInfo = {
                  id: currentUserId,
                  name: currentUserNameRef.current,
                  emoji: currentUserEmojiRef.current,
                };
                if (newVar === 'core_race' && maxPlayers > 6) {
                  setMaxPlayers(6);
                  subRef.current?.broadcastLobbyState(lobbyMembers, 6, newVar, hostInfo);
                } else {
                  subRef.current?.broadcastLobbyState(lobbyMembers, maxPlayers, newVar, hostInfo);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 text-xs font-bold text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="sprint_race">⚡ Sprint Race (3-10 Players)</option>
              <option value="core_race">👑 King of the Core (3-6 Players)</option>
            </select>
          ) : (
            <span className="font-extrabold text-amber-600 dark:text-amber-400">
              {gameVariant === 'sprint_race' ? '⚡ Sprint Race' : '👑 King of the Core'}
            </span>
          )}
        </div>

        {/* Player Slots */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold px-1">
            <span className="text-slate-600 dark:text-zinc-400">
              Players ({lobbyMembers.length}/{maxPlayers})
            </span>
            {isHost && (
              <div className="flex items-center gap-1 flex-wrap justify-end">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">Slots:</span>
                {(gameVariant === 'sprint_race' ? [3, 4, 5, 6, 7, 8, 9, 10] : [3, 4, 5, 6]).map(
                  (num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setMaxPlayers(num);
                        const hostInfo = {
                          id: currentUserId,
                          name: currentUserNameRef.current,
                          emoji: currentUserEmojiRef.current,
                        };
                        subRef.current?.broadcastLobbyState(lobbyMembers, num, gameVariant, hostInfo);
                      }}
                      className={`w-6 h-6 rounded-lg text-xs font-bold transition-all ${
                        maxPlayers === num
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200'
                      }`}
                    >
                      {num}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            {Array.from({ length: maxPlayers }).map((_, idx) => {
              const slot = (idx + 1) as PlayerId;
              const member = lobbyMembers[idx];
              const theme = PLAYER_THEMES[slot] || PLAYER_THEMES[1];

              const spawnInfo =
                gameVariant === 'sprint_race'
                  ? `Starts bottom row (Col ${dynamicConfig.spawns[slot]?.c ?? idx}) · Goal: Row 0`
                  : `Starts ${
                      slot === 1
                        ? 'South'
                        : slot === 2
                        ? 'West'
                        : slot === 3
                        ? 'East'
                        : slot === 4
                        ? 'North'
                        : `Perimeter P${slot}`
                    }`;

              return (
                <div
                  key={slot}
                  className={`p-2.5 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                    member
                      ? 'bg-slate-50/90 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800/80 shadow-sm'
                      : 'bg-slate-50/40 dark:bg-zinc-950/40 border-dashed border-slate-200 dark:border-zinc-800/50 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl ${theme.bgClass} flex items-center justify-center font-bold text-xs text-white shadow-sm flex-shrink-0`}
                    >
                      {member?.emoji ? (
                        <span className="text-base leading-none">{member.emoji}</span>
                      ) : (
                        `P${slot}`
                      )}
                    </div>
                    <div className="truncate">
                      <div className="font-bold text-xs text-slate-900 dark:text-zinc-100 flex items-center gap-1.5 truncate">
                        <span className="truncate">
                          {member ? member.name : `Open Slot ${slot}`}
                        </span>
                        {member?.isHost && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-400/30">
                            Host
                          </span>
                        )}
                        {member?.id === currentUserId && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-400/30">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-500 mt-0.5 truncate">
                        {member ? spawnInfo : 'Waiting for player...'}
                      </div>
                    </div>
                  </div>

                  <div>
                    {member ? (
                      member.isReady ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Ready
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-medium text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Not Ready
                        </span>
                      )
                    ) : (
                      <span className="text-[11px] text-slate-400 dark:text-zinc-600 italic">
                        Empty
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Controls */}
        <div className="pt-2 space-y-2">
          {isHost ? (
            <button
              type="button"
              onClick={handleHostStart}
              disabled={!canStart}
              className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 tap-bounce transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {lobbyMembers.length < 3
                  ? `Need at least 3 players (${lobbyMembers.length}/3)`
                  : !lobbyMembers.every((m) => m.isReady)
                  ? 'Waiting for all players to ready up...'
                  : `Start ${gameVariant === 'sprint_race' ? 'Sprint Race' : 'King of the Core'}`}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleToggleReady}
              className={`w-full py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg tap-bounce transition-all ${
                userMember?.isReady
                  ? 'bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{userMember?.isReady ? 'Unready' : 'Ready Up'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLeaveLobby}
            className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 text-center transition-colors flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Leave Lobby</span>
          </button>
        </div>
      </div>
    </div>
  );
};
