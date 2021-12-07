import fs from 'fs';
import path from "path";
import { getBasketballSchedule } from "./basketball/utils.js";
import { getSoccerSchedule } from "./soccer/utils.js";
import type { Schedule, Game, MetaInfo } from "./model.js";
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

function writeSchedule(schedule: Schedule, outputDir: string) {
  const keys: Array<keyof Schedule> = ['games', 'teams', 'teamSchedules', 'gamesByDate'];
  const meta: MetaInfo = { _meta: { buildDate: new Date() } }
  const fileWrites: Promise<fs.PathLike>[] = keys.map(key => {
    const filepath = path.join(outputDir, `${key}.json`);
    const data = Object.assign({}, { [key]: schedule[key] }, meta)
    return writeFile(filepath, JSON.stringify(data, replacer))
  })
  return Promise.all(fileWrites);
}

type ScheduleFunction = () => Promise<Schedule>;
function getAndWriteSportSchedule(scheduleFunc: ScheduleFunction, outputDir: string): Promise<void> {
  return scheduleFunc()
    .then(tapAsync<Schedule>(_ => mkdir(outputDir)))
    .then(schedule => writeSchedule(schedule, outputDir))
    .then(filenames => console.log('successfully wrote', filenames));
}

const writeSchedules: Array<Promise<void>> = [
  getAndWriteSportSchedule(getBasketballSchedule, 'output/basketball'),
  getAndWriteSportSchedule(getSoccerSchedule, 'output/soccer')
];
Promise.all(writeSchedules).catch(err => console.error(err));