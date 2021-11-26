import type { Cheerio, CheerioAPI } from 'cheerio';
import cheerio from "cheerio";
import type { DataNode, Element } from 'domhandler';
import fetch from "node-fetch";
import type { Game, GameStatus, Schedule, Team } from '../model';
import { parseTeams, parseTeamSchedules } from '../utils.js';
import type { RawNBAGame, RawNBAMonthlySchedule, RawNBASchedule, RawNBATeam } from "./model";

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

function parseRawGames(games: RawNBASchedule, rankings: string[]): Game[] {
  return games.lscd.reduce((games: Game[], currentMonth: RawNBAMonthlySchedule) => {
    const parsedMonth: Game[] = currentMonth.mscd.g
      .map((game: RawNBAGame) => ({
        code: game.gcode,
        description: game.seri,
        competitionDescription: 'NBA',
        league: 'NBA',
        status: parseStatus(game),
        home: parseTeam(game.h, rankings),
        away: parseTeam(game.v, rankings),
        date: (game.stt === 'TBD') ? new Date(`${game.gdte}T19:00:00-0400`) : new Date(`${game.etm}-0400`)
      }))
    return games.concat(parsedMonth);
  }, [] as Game[]);
}

function parseTeam(team: RawNBATeam, rankings: string[]): Team {
  return {
    abbreviation: team.ta,
    nickname: team.tn,
    city: team.tc,
    rank: findTeamRank(team.tn, rankings),
    sport: SPORT
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

export function getSchedule(): Promise<Schedule> {
  const getGames = Promise.all([getRawNBASchedule(), getRankings()])
    .then(([schedule, rankings]) => parseRawGames(schedule, rankings));
  const getTeams = getGames.then(parseTeams)
  return Promise.all([getGames, getTeams])
    .then(([games, teams]) => {
      const teamSchedules = parseTeamSchedules(games);
      return {
        _meta: {
          buildDate: new Date(),
        },
        games: games,
        teams: teams,
        teamSchedules: teamSchedules
      }
    })
}