import { DateTime } from "luxon";

export interface Game {
  code: string;
  description: string;
  competitionDescription: string;
  league: string;
  status: GameStatus;
  home: Team;
  away: Team;
  date: Date;
  location: {
    arena: string;
    city: string;
    state: string;
  },
  nationalNetwork?: string;
}

export interface Team {
  abbreviation: string;
  nickname: string;
  city: string;
  powerRank: number;
  sport: string;
  record: TeamRecord
}

export interface TeamRecord {
    wins: number;
    losses: number;
    ties?: number;
    conference: string;
    conferenceRank: number
}

export type GameStatus = 'tbd' | 'complete' | 'future' | 'active'

export interface Schedule {
  games: Game[];
  teams: Team[];
  teamSchedules: Map<string, Game[]>;
  gamesByDate: Record<string, Game[]>;
}

export interface MetaInfo {
  _meta: {
    buildDate: Date;
  }
}