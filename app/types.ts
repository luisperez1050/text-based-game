export type Pokemon = {
  id: number;
  name: string;
  sprite: string;
  stats: { [key: string]: number };
  totalStats: number;
  types: string[];
};

export type GameState = {
  status: 'WAITING' | 'PLAYING' | 'ROUND_RESULT' | 'GAME_OVER';
  round: number;
  totalRounds: number;
  scores: { p1: number; p2: number };
  p1Card: Pokemon | null;
  p2Card: Pokemon | null;
  currentTurn: 'p1' | 'p2' | null;
  roundWinner: 'p1' | 'p2' | 'draw' | null;
  logs: string[];
  players: { p1: boolean; p2: boolean };
};
