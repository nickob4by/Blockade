export type PlayerId = 1 | 2;

export interface Coordinate {
  r: number; // 0 to 8
  c: number; // 0 to 8
}

export type WallOrientation = 'H' | 'V';

export interface Wall {
  r: number; // 0 to 7 (row index of top-left square of the 2x2 intersection)
  c: number; // 0 to 7 (col index of top-left square of the 2x2 intersection)
  orientation: WallOrientation;
  placedBy: PlayerId;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  position: Coordinate;
  wallsLeft: number;
  targetRow: number; // 0 for Player 1, 8 for Player 2
}

export type GameStatus = 'waiting' | 'playing' | 'player1_won' | 'player2_won';

export type GameMode = 'local' | 'ai' | 'online';

export interface MoveRecord {
  player: PlayerId;
  type: 'move' | 'wall';
  target: Coordinate;
  wallOrientation?: WallOrientation;
  timestamp: number;
}

export interface GameState {
  players: {
    1: PlayerState;
    2: PlayerState;
  };
  currentTurn: PlayerId;
  walls: Wall[];
  status: GameStatus;
  winner: PlayerId | null;
  history: MoveRecord[];
  mode: GameMode;
}
