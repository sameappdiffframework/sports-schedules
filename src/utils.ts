import fs from 'fs';
import { DateTime } from 'luxon';
import type { Game, Team } from "./model";

export function tap<T>(func: (t: T) => void): (t: T) => T {
  return (data: T) => {
    func(data);
    return data;
  }
}

export function tapAsync<T>(func: (t: T) => Promise<void>): (t: T) => Promise<T> {
  return async (data: T) => {
    await func(data);
    return data;
  }
}

export function mkdir(dirname: fs.PathLike): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.readdir(dirname, (err, files) => {
      if (err) {
        fs.mkdir(dirname, { recursive: true }, (err) => {
          resolve();
        })
      } else {
        resolve();
      }
    })
  })
}

export function writeFile(filename: fs.PathLike, contents: string): Promise<fs.PathLike> {
  return new Promise<fs.PathLike>((resolve, reject) => {
    fs.writeFile(filename, contents, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve(filename);
      }
    })
  })
}

export function parseTeams(games: Game[]): Team[] {
  const garbageAbbreviations = ['', 'f1', 'f2', 'qf1', 'qf2', 'qf3', 'qf4'];
  const teamMap = games
    .map(game => [game.home, game.away])
    .reduce((teams, currentTeams) => {
      currentTeams
        .filter(t => !garbageAbbreviations.includes(t.abbreviation.toLowerCase()))
        .forEach(team => teams.set(`${team.sport}-${team.abbreviation}`, team));
      return teams;
    }, new Map<string, Team>());
  return Array.from(teamMap.values());
}

export function parseTeamSchedules(allGames: Game[]): Map<string, Game[]> {
  return allGames
    .reduce((teamGames: Map<string, Game[]>, currentGame: Game) => {
      const teams = [currentGame.home, currentGame.away];
      teams.forEach(team => {
        const key = team.abbreviation.toLowerCase();
        if (teamGames.has(key)) {
          const games = teamGames.get(key) as Game[];
          teamGames.set(key, games.concat(currentGame))
        } else {
          teamGames.set(key, [currentGame]);
        }
      })
      return teamGames;
    }, new Map<string, Game[]>());
}

export function parseSingleDaySchedules(allGames: Game[]): Record<string, Game[]> {
  const dateGamesMap = allGames.reduce((schedule, game: Game) => {
    const gameDate = DateTime.fromISO(game.date.toISOString())
      .setZone('America/New_York')
      .startOf('day')
      .toISO()
    if (schedule.has(gameDate)) {
      const games = schedule.get(gameDate) as Game[];
      schedule.set(gameDate, [...games, game]);
    } else {
      schedule.set(gameDate, [game]);
    }
    return schedule;
  }, new Map<string, Game[]>());
  return Object.fromEntries(dateGamesMap);
}
