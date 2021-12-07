import type { Cheerio, CheerioAPI } from 'cheerio';
import cheerio from "cheerio";
import type { DataNode, Element } from 'domhandler';
import { DateTime } from 'luxon';
import fetch from "node-fetch";
import type { Game, GameStatus, Schedule, Team, TeamRecord } from '../model';
import { parseSingleDaySchedules, parseTeams, parseTeamSchedules } from '../utils.js';
import type { RawNBAGame, RawNBAMonthlySchedule, RawNBASchedule, RawNBAStandings, RawNBATeam } from "./model";

const SPORT = 'basketball';

function getRawNBASchedule(seasonEndYear = 2022): Promise<RawNBASchedule> {
  const NBA_URL = `https://data.nba.com/data/10s/v2015/json/mobile_teams/nba/${seasonEndYear - 1}/league/00_full_schedule.json`;
  return fetch(NBA_URL).then(response => response.json() as Promise<RawNBASchedule>);
}

function getRankings(): Promise<string[]> {
  return fetch('http://www.powerrankingsguru.com/nba/team-power-rankings.php')
    .then(response => response.text())
    .then(cheerio.load)
    .then((parser: CheerioAPI) => parser('table.rankings-table > tbody > tr > td:nth-child(2) > div.team-name-v2 > span.full-name'))
    .then((spanNodes: Cheerio<Element>) => spanNodes.toArray().map((d: Element) => (d.children[0] as DataNode).data));
}

function getStandings(): Promise<RawNBAStandings> {
  return fetch('https://data.nba.net/prod/v1/current/standings_conference.json')
    .then(response => response.json() as Promise<RawNBAStandings>)
}

function parseRawGames(games: RawNBASchedule, rankings: string[], standings: RawNBAStandings): Game[] {
  return games.lscd.reduce((games: Game[], currentMonth: RawNBAMonthlySchedule) => {
    const parsedMonth: Game[] = currentMonth.mscd.g.map(game => parseRawGame(game, rankings, standings))
    return games.concat(parsedMonth);
  }, [] as Game[])
    .sort((a: Game, b: Game) => {
      const aDate: DateTime = DateTime.fromISO(a.date.toISOString());
      const bDate: DateTime = DateTime.fromISO(b.date.toISOString());
      return aDate.toMillis() - bDate.toMillis();
    });
}

function parseRawGame(game: RawNBAGame, rankings: string[], standings: RawNBAStandings): Game {
  const home = parseTeam(game.h, rankings, standings);
  const away = parseTeam(game.v, rankings, standings);
  return {
    code: game.gcode,
    description: game.seri,
    competitionDescription: 'NBA',
    league: 'NBA',
    status: parseStatus(game),
    home: home,
    away: away,
    date: (game.stt === 'TBD') ? new Date(`${game.gdte}T19:00:00-0400`) : new Date(`${game.gdtutc}T${game.utctm}:00Z`),
    nationalNetwork: parseNationalNetwork(game),
    topTenMatchup: home.powerRank <= 10 && away.powerRank <= 10,
    location: {
      arena: game.an,
      city: game.ac,
      state: game.as
    }
  }
}

function parseNationalNetwork(game: RawNBAGame): string | undefined {
  const nationalBroadcast = game.bd.b.find(broadcast => broadcast.scope === 'natl' && broadcast.lan.toLowerCase() === 'english' && broadcast.type === 'tv')
  return nationalBroadcast?.disp;
}

function parseTeam(team: RawNBATeam, powerRankings: string[], standings: RawNBAStandings): Team {
  return {
    abbreviation: team.ta,
    nickname: team.tn,
    city: team.tc,
    powerRank: findTeamRank(team.tn, powerRankings),
    sport: SPORT,
    record: findTeamRecord(team.ta, standings)
  }
}

function parseStatus(game: RawNBAGame): GameStatus {
  if (game.stt === 'TBD') {
    return 'tbd';
  } else if (game.stt === 'Final') {
    return 'complete';
  } else if (game.stt.match(/\d{1,2}:\d\d [ap]m \w\w/)) {
    return 'future';
  } else {
    // TODO: it's not clear how the feed denotes active
    return 'active';
  }
}

function findTeamRank(teamName: string, rankings: string[]): number {
  const zeroIndexedRank = rankings.findIndex(name => teamName.toLowerCase() === name.toLowerCase());
  return zeroIndexedRank + 1;
}

function findTeamRecord(teamAbbreviation: string, standings: RawNBAStandings): TeamRecord {
  const [east, west] = [standings.league.standard.conference.east, standings.league.standard.conference.west];
  let confName = 'East';
  let standing = east.find(standing => standing.teamSitesOnly.teamTricode.toLowerCase() === teamAbbreviation.toLowerCase())
  if (standing === undefined) {
    confName = 'West';
    standing = west.find(standing => standing.teamSitesOnly.teamTricode.toLowerCase() === teamAbbreviation.toLowerCase())
  }
  return {
    wins: Number(standing?.win),
    losses: Number(standing?.loss),
    conference: confName,
    conferenceRank: Number(standing?.confRank)
  }
}

export function getBasketballSchedule(): Promise<Schedule> {
  const getGames = Promise.all([getRawNBASchedule(), getRankings(), getStandings()])
    .then(([schedule, rankings, standings]) => parseRawGames(schedule, rankings, standings));
  const getTeams = getGames.then(parseTeams)
  return Promise.all([getGames, getTeams])
    .then(([games, teams]) => ({
      games: games,
      teams: teams,
      teamSchedules: parseTeamSchedules(games),
      gamesByDate: parseSingleDaySchedules(games)
    }))
}