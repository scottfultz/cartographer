/*
 * NDJSON log tailer for Cartographer CLI
 * Copyright © 2025 Cai Frazier
 */
import * as fs from 'fs';
import * as readline from 'readline';
import { CommandModule } from 'yargs';

export const tailCommand: CommandModule = {
  command: 'tail',
  describe: 'Stream and follow NDJSON log files for live crawl monitoring',
  builder: (y) => y
    .option('file', { type: 'string', demandOption: true, describe: 'NDJSON log file path' })
    .option('follow', { type: 'boolean', default: false, describe: 'Continue streaming new lines (like tail -f)' })
    .option('filter', { type: 'string', describe: 'Regex to filter lines by JSON string' }),
  handler: async (argv) => {
    const file = argv.file as string;
    const follow = argv.follow as boolean;
    const filter = argv.filter ? new RegExp(argv.filter as string) : null;
    const stream = fs.createReadStream(file, { encoding: 'utf-8' });
    const rl = readline.createInterface({ input: stream });
    function prettyPrint(obj: any) {
      if (!obj || typeof obj !== 'object') return console.log(JSON.stringify(obj));
      switch (obj.type) {
        case 'crawl.started':
          return console.log(`[STARTED] ${obj.crawlId} seeds=${obj.config?.seeds?.length}`);
        case 'crawl.heartbeat':
          return console.log(`[HEARTBEAT] done=${obj.progress?.completed} in=${obj.progress?.inFlight} q=${obj.progress?.queued}`);
        case 'page.fetched':
          return console.log(`[FETCHED] ${obj.statusCode} ${obj.url}`);
        case 'page.parsed':
          return console.log(`[PARSED] ${obj.url} links=${obj.record?.internalLinksCount}`);
        case 'crawl.shutdown':
          return console.log(`[SHUTDOWN] ${obj.crawlId} reason=${obj.reason}`);
        case 'crawl.finished':
          return console.log(`[FINISHED] ${obj.crawlId} incomplete=${obj.incomplete}`);
        default:
          return console.log(JSON.stringify(obj));
      }
    }
    rl.on('line', (line) => {
      if (!line.trim()) return;
      if (filter && !filter.test(line)) return;
      try {
        const obj = JSON.parse(line);
        prettyPrint(obj);
      } catch {
        console.log(line);
      }
    });
    rl.on('close', () => {
      if (!follow) return;
      // Follow mode: reopen and continue
      let pos = fs.statSync(file).size;
      fs.watch(file, {}, () => {
        const newSize = fs.statSync(file).size;
        if (newSize > pos) {
          const fd = fs.openSync(file, 'r');
          const buf = Buffer.alloc(newSize - pos);
          fs.readSync(fd, buf, 0, newSize - pos, pos);
          fs.closeSync(fd);
          buf.toString('utf-8').split('\n').forEach((line) => {
            if (!line.trim()) return;
            if (filter && !filter.test(line)) return;
            try {
              const obj = JSON.parse(line);
              prettyPrint(obj);
            } catch {
              console.log(line);
            }
          });
          pos = newSize;
        }
      });
    });
  }
};
