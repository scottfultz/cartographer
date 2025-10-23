/*
 * Atlas diff utility for Cartographer CLI
 * Copyright © 2025 Cai Frazier
 */
import * as fs from 'fs';
import { join } from 'path';
import { CommandModule } from 'yargs';

function readManifest(atlsPath: string) {
  const manifestPath = join(atlsPath + '.staging', 'manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`Manifest not found: ${manifestPath}`);
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

function formatDelta(a: number, b: number) {
  const delta = b - a;
  return `${a} → ${b} (${delta >= 0 ? '+' : ''}${delta})`;
}

export const diffCommand: CommandModule = {
  command: 'diff',
  describe: 'Compare two .atls manifests and print a concise delta table',
  builder: (y) => y
    .option('a', { type: 'string', demandOption: true, describe: 'First atlas (.atls) path' })
    .option('b', { type: 'string', demandOption: true, describe: 'Second atlas (.atls) path' }),
  handler: async (argv) => {
    const a = argv.a as string;
    const b = argv.b as string;
    let ma, mb;
    try {
      ma = readManifest(a);
      mb = readManifest(b);
    } catch (e) {
      console.error('Error reading manifests:', e);
      process.exit(1);
    }
    const datasets = ['pages','edges','assets','errors','accessibility'];
    console.log('Atlas Diff Table');
    console.log('----------------');
    console.log(`incomplete: ${ma.incomplete ? 'true' : 'false'} → ${mb.incomplete ? 'true' : 'false'}`);
    for (const ds of datasets) {
      const ca = ma.partCounts?.[ds] ?? 0;
      const cb = mb.partCounts?.[ds] ?? 0;
      const ba = ma.partBytes?.[ds] ?? 0;
      const bb = mb.partBytes?.[ds] ?? 0;
      console.log(`${ds.padEnd(14)} count: ${formatDelta(ca,cb)} bytes: ${formatDelta(ba,bb)}`);
    }
  const totalA = (Object.values(ma.partBytes||{}) as number[]).reduce((a,b)=>a+b,0);
  const totalB = (Object.values(mb.partBytes||{}) as number[]).reduce((a,b)=>a+b,0);
    console.log(`total bytes: ${totalA} → ${totalB} (${totalB-totalA>=0?'+':''}${totalB-totalA})`);
  }
};
