import { readFileSync } from 'fs';
import { SourceMapConsumer } from 'source-map';

const DIST = new URL('../dist/assets/', import.meta.url);

async function map(file, line, col) {
  const js = readFileSync(new URL(file, DIST), 'utf-8');
  const mapFile = readFileSync(new URL(file + '.map', DIST), 'utf-8');
  const smc = await new SourceMapConsumer(mapFile);
  const pos = smc.originalPositionFor({ line, column: col });
  smc.destroy();
  return pos;
}

const entries = [
  ['vendor-react-D3rF_RbH.js', 9, 3854],
  ['vendor-react-D3rF_RbH.js', 9, 6635],
  ['vendor-Dw0luKQB.js', 17, 51],
  ['vendor-Dw0luKQB.js', 17, 820],
  ['vendor-Dw0luKQB.js', 17, 843],
];

for (const [f, l, c] of entries) {
  try {
    const r = await map(f, l, c);
    console.log(`${f}:${l}:${c} => ${r.source}:${r.line}:${r.column} (${r.name ?? ''})`);
  } catch (e) {
    console.log(`${f}:${l}:${c} => ERROR: ${e.message}`);
  }
}
