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
}

export interface RawNBATeam {
  tn: string;
  ta: string;
  tc: string;
}