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
  bonusPickAvailable: { p1: boolean; p2: boolean };
  isTieBreak: boolean;
  names: { p1: string | null; p2: string | null };
  stats: { p1Overkills: number; p2Overkills: number; p1BonusPicks: number; p2BonusPicks: number; tieBreakWin: 'p1' | 'p2' | null };
};
