/* 
 * This describes the response from {@link getNBASchedule}
 */
export interface RawNBASchedule {
  lscd: Array<RawNBAMonthlySchedule>
}

export interface RawNBAMonthlySchedule {
  mscd: {
    mon: string;
    g: RawNBAGame[];
  }
}

export interface RawNBAGame {
  gcode: string;
  seri: string;
  v: RawNBATeam;
  h: RawNBATeam;
  stt: string;
  gdte: string;
  etm: string;
  utctm: string;
  gdtutc: string;
  an: string;
  ac: string;
  as: string;
  bd: {
    b: RawBroadcastInfo[]
  }
}

export interface RawBroadcastInfo {
  disp: string;
  scope: 'natl' | 'home' | 'away' | 'can'
  lan: string;
  type: 'tv' | 'radio'
}

export interface RawNBATeam {
  tn: string;
  ta: string;
  tc: string;
}

export interface RawNBAStandings {
  league: {
    standard: {
      conference: {
        east: RawConferenceStanding[];
        west: RawConferenceStanding[];
      }
    }
  }
}

export interface RawConferenceStanding {
  win: string;
  loss: string;
  winPct: string;
  confRank: string;
  gamesBehind: string;
  teamSitesOnly: {
    teamTricode: string;
  }
}