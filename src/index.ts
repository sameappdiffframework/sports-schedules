import fs from 'fs';
import path from "path";
import { getSchedule } from "./basketball/utils.js";
import type { Schedule, Game } from "./model.js";
import { mkdir, tapAsync, writeFile } from "./utils.js";

function replacer(_: string, value: any) {
  if (value instanceof Map) {
    return Array.from(value as Map<string, Game[]>)
      .reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {} as Record<string, Game[]>);
  } else {
    return value;
  }
}

function writeSchedule(schedule: Schedule) {
  const keys: Array<keyof Schedule> = ['games', 'teams', 'teamSchedules'];
  const fileWrites: Promise<fs.PathLike>[] = keys.map(key => {
    const filepath = path.join(OUTPUT_DIR, `${key}.json`);
    return writeFile(filepath, JSON.stringify(schedule[key], replacer))
  })
  return Promise.all(fileWrites);
}

const OUTPUT_DIR = 'output/basketball'
getSchedule()
  .then(tapAsync<Schedule>(result => mkdir(OUTPUT_DIR)))
  .then(writeSchedule)
  .then(filenames => console.log('successfully wrote', filenames))
  .catch(err => console.error(err))