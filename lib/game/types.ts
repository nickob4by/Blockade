export type PlayerId = 1 | 2 | 3 | 4 | 5 | 6;

export interface Coordinate {
  r: number;
  c: number;
}

export type WallOrientation = 'H' | 'V';

export interface Wall {
  r: number; // Row index of top-left square of the 2x2 intersection
  c: number; // Col index of top-left square of the 2x2 intersection
  orientation: WallOrientation;
  placedBy: PlayerId;
}

export type PlayerColorTheme = 'blue' | 'rose' | 'emerald' | 'amber' | 'purple' | 'cyan';

export interface PlayerState {
  id: PlayerId;
  name: string;
  position: Coordinate;
  wallsLeft: number;
  targetRow?: number; // 0 for Player 1, 8 for Player 2 (classic mode)
  targetCore?: Coordinate[]; // Goal coordinates for King of the Core mode
  color?: PlayerColorTheme;
  emoji?: string;
  isEliminated?: boolean;
}

export type GameStatus = 'waiting' | 'playing' | 'player1_won' | 'player2_won' | 'game_over';

export type GameMode = 'local' | 'ai' | 'online' | 'party';

export type GameVariant = 'classic' | 'core_race';

export interface MoveRecord {
  player: PlayerId;
  type: 'move' | 'wall';
  target: Coordinate;
  wallOrientation?: WallOrientation;
  timestamp: number;
}

export interface GameState {
  players: Record<PlayerId, PlayerState>;
  currentTurn: PlayerId;
  walls: Wall[];
  status: GameStatus;
  winner: PlayerId | null;
  history: MoveRecord[];
  mode: GameMode;
  variant?: GameVariant;
  boardSize?: number; // 9 for standard, 13 for 3-player core, 15 for 4-6 player core
  coreTargets?: Coordinate[]; // For King of the Core race
  turnTimeLimit?: number; // In seconds (e.g. 15s)
  resignedPlayerId?: PlayerId | null;
}
