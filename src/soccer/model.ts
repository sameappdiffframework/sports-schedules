export type RawMLSSchedule = RawMLSGame[];

export interface RawMLSGame {
  slug: string;
  isTimeTbd: boolean;
  leagueMatchTitle: string;
  competition: RawMLSCompetition;
  broadcasters: Broadcaster[]
  matchDate: string;
  home: RawMLSTeam;
  away: RawMLSTeam;
  venue: RawMLSVenue
}

export interface RawMLSVenue {
  name: string;
  city: string;
}

export interface RawMLSCompetition {
  optaId: number;
  slug: string;
  matchType: string;
  name: string;
  shortName: string;
}

export interface RawMLSTeam {
  abbreviation: string;
  shortName: string;
}

export interface Broadcaster {
  broadcasterTypeLabel: 'Streaming' | 'National TV' | 'US TV' | 'TV';
  broadcasterName: string;
  broadcasterType: 'US Streaming' | 'Canada Streaming' | 'US TV' | 'Canada TV'
}

export type RawMLSStandings = RawMLSStandingEntry[];
export interface RawMLSStandingEntry {
  group_id: string;
  position: number;
  club: {
    abbreviation: string;
  };
  statistics: {
    total_draws: number;
    total_wins: number;
    total_losses: number;
  };
}