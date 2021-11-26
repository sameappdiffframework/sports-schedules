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

const OUTPUT_DIR = 'output'
const FILENAME = 'basketball.json'
const OUTPUT_PATH = path.join(OUTPUT_DIR, FILENAME)
getSchedule()
  .then((result: Schedule) => JSON.stringify(result, replacer))
  .then(tapAsync<string>(result => mkdir(OUTPUT_DIR)))
  .then(result => writeFile(OUTPUT_PATH, result))
  .then(filename => console.log('successfully wrote', filename))
  .catch(err => console.error(err))