import { readFileSync, writeFileSync } from 'fs';

const file = new URL('../src/app/App.tsx', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
let src = readFileSync(file, 'utf-8');

// Match: <SoulmatchCard accent={...} settings={cardSettings}>\n  <div style={{ fontSize: 11, color: '...', fontWeight: 600, ... }}>TITLE</div>
// Add cardTitle="TITLE" to the SoulmatchCard tag

// Matches both accent={...} and accent="..." forms
const re = /(<SoulmatchCard\s+accent=(?:\{[^}]+\}|"[^"]+"|'[^']+')\s+settings=\{cardSettings\})(\s*>)(\s*\n\s*<div style=\{\{ fontSize: 11, color: [^,]+, fontWeight: 600, marginBottom: 10, letterSpacing: '0\.1em', textTransform: 'uppercase' \}\}>)([^<]+)(<\/div>)/g;

let count = 0;
const result = src.replace(re, (match, tag, gt, divOpen, title, divClose) => {
  const trimmed = title.trim();
  // Skip if already has cardTitle
  if (tag.includes('cardTitle')) return match;
  count++;
  return `${tag} cardTitle="${trimmed}"${gt}${divOpen}${title}${divClose}`;
});

console.log(`Replaced ${count} SoulmatchCard instances with cardTitle`);
writeFileSync(file, result, 'utf-8');
