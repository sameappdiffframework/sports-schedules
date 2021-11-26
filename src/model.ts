export interface Game {
  code: string;
  description: string;
  competitionDescription: string;
  league: string;
  status: GameStatus;
  home: Team;
  away: Team;
  date: Date;
}

export interface Team {
  abbreviation: string;
  nickname: string;
  city: string;
  rank: number;
  sport: string;
}

export type GameStatus = 'tbd' | 'complete' | 'future' | 'active'

export interface Schedule {
  games: Game[];
  teams: Team[];
  teamSchedules: Map<string, Game[]>
}