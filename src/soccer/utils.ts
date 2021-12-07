import type { Cheerio, CheerioAPI } from 'cheerio';
import cheerio from "cheerio";
import type { DataNode, Element } from 'domhandler';
import fetch from "node-fetch";
import type { Game, Schedule, Team } from "../model";
import { parseSingleDaySchedules, parseTeams, parseTeamSchedules } from "../utils.js";
import type { RawMLSCompetition, RawMLSGame, RawMLSSchedule, RawMLSStandingEntry, RawMLSStandings, RawMLSTeam, RawMLSVenue } from "./model";

/**
 * This is a script to update the schedule data via the MLS's API at
 * https://sportapi.mlssoccer.com/api/matches?culture=en-us&dateFrom=2021-05-27&dateTo=2021-06-21
 *
 * TODO: do this as part of the 11ty build; have to figure out how to add Typescript support
 */

const SPORT = 'soccer';
const WORLD_CUP_QUALIFIER = 339;

function getCompetitionName(competition: RawMLSCompetition) {
  if (competition.optaId === WORLD_CUP_QUALIFIER) {
    return 'WC Qualifier'
  } else if (competition.slug === 'mls-regular-season') {
    return 'MLS regular season';
  }
  return competition.shortName;
}

function getMLSSchedule(seasonEndYear = 2021): Promise<RawMLSSchedule> {
  const SCHEDULE_URL = `https://sportapi.mlssoccer.com/api/matches?culture=en-us`
    + `&dateFrom=${seasonEndYear}-06-01&dateTo=${seasonEndYear}-12-31`
    + `&excludeSecondaryTeams=true`;
  return fetch(SCHEDULE_URL).then(response => response.json() as Promise<RawMLSSchedule>);
}

function getMLSStandings(seasonEndYear = 2021): Promise<RawMLSStandings> {
  const MLS_URL = `https://sportapi.mlssoccer.com/api/standings/live`
    + `?isLive=false&seasonId=${seasonEndYear}&competitionId=98`
  return fetch(MLS_URL).then(response => response.json() as Promise<RawMLSStandings>);
}

/**
 * There are some teams whose abbreviation on powerrankingsguru.com don't match the ones on mlssoccer.com.
 * This resolves the differences.
 */
const ABBREVIATION_MAP: Record<string, string> = {
  nwe: 'ne',
  nwy: 'rbny',
  mnu: 'min',
  dcu: 'dc',
  lag: 'la',
  san: 'sj',
}

function getRankings(): Promise<string[]> {
  const source = 'http://www.powerrankingsguru.com/soccer/mls/team-power-rankings.php';
  return fetch(source)
    .then(response => response.text())
    .then(cheerio.load)
    .then((parser: CheerioAPI) => parser('table.gfc-rankings-table > tbody > tr > td:nth-child(2) > div.gfc-team-name > span.abbrv'))
    .then((spanNodes: Cheerio<Element>) => spanNodes.toArray()
      .map((node: Element) => (node.children[0] as DataNode).data.toLowerCase())
      .map(abbreviation => ABBREVIATION_MAP[abbreviation] || abbreviation)
    );
}

function parseRecord(team: RawMLSTeam, standings: RawMLSStandings) {
  const entry: RawMLSStandingEntry | undefined = standings.find(entry => team.abbreviation.toLowerCase() === entry.club.abbreviation.toLowerCase());
  if (entry === undefined) {
    return undefined;
  }
  return {
    wins: entry.statistics.total_wins,
    losses: entry.statistics.total_losses,
    ties: entry.statistics.total_draws,
    conference: entry.group_id,
    conferenceRank: entry.position
  }
}

function parseTeam(team: RawMLSTeam, rankings: string[], standings: RawMLSStandings): Team {
  return {
    abbreviation: team.abbreviation,
    nickname: team.shortName, // TODO better model a team to avoid this
    city: team.shortName,
    powerRank: findTeamRank(team.abbreviation, rankings),
    sport: SPORT,
    record: parseRecord(team, standings)
  }
}

function parseLocation(venue: RawMLSVenue) {
  const [city, state] = venue.city.split(',').map(t => t.trim());
  return {
    arena: venue.name,
    city: city,
    state: state
  };
}

function parseNationalNetwork(game: RawMLSGame): string | undefined {
  const spanishNetworks = ['UniMás', 'TUDN'];
  const broadcaster = game.broadcasters.find(b => b.broadcasterTypeLabel === 'National TV' && b.broadcasterType === 'US TV' && !spanishNetworks.includes(b.broadcasterName))
  return broadcaster?.broadcasterName;
}

function parseRawGames(games: RawMLSSchedule, rankings: string[], standings: RawMLSStandings): Game[] {
  return games.map(game => {
    const parsed: Game = {
      code: game.slug,
      description: '',
      competitionDescription: parseDescription(game),
      league: getCompetitionName(game.competition),
      status: (game.isTimeTbd) ? 'tbd' : 'future',
      topTenMatchup: false,
      home: parseTeam(game.home, rankings, standings),
      away: parseTeam(game.away, rankings, standings),
      location: parseLocation(game.venue),
      nationalNetwork: parseNationalNetwork(game),
      date: new Date(game.matchDate)
    }
    return parsed;
  })
    .filter((game: Game) => game.competitionDescription !== 'Friendly');
}

function parseDescription(game: RawMLSGame) {
  return game.leagueMatchTitle || (game.competition.matchType === 'Regular') ? game.competition.name : game.competition.shortName
}

function findTeamRank(teamName: string, rankings: string[]) {
  const zeroIndexedRank = rankings.findIndex(name => teamName.toLowerCase() === name.toLowerCase());
  return zeroIndexedRank + 1;
}

export function getSoccerSchedule(): Promise<Schedule> {
  const getGames = Promise.all([getMLSSchedule(), getRankings(), getMLSStandings()])
    .then(([schedule, rankings, standings]) => parseRawGames(schedule, rankings, standings));
  const getTeams = getGames.then(parseTeams)
  return Promise.all([getGames, getTeams])
    .then(([games, teams]) => {
      return {
        games: games,
        teams: teams,
        teamSchedules: parseTeamSchedules(games),
        gamesByDate: parseSingleDaySchedules(games)
      }
    });
}