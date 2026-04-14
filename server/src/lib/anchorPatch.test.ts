/**
 * Quick smoke test for anchorPatch module.
 * Run: npx tsx server/src/lib/anchorPatch.test.ts
 */
import { applyEdit, parseWorkerEdit, validateEdit } from './anchorPatch.js';

const sampleFile = `import express from 'express';
const router = express.Router();

// ─── Health ───
router.get('/health', (req, res) => {
  res.json({ ok: true });
});

// ─── Exports ───
export default router;
`;

// Test 1: insert-after
const r1 = applyEdit(sampleFile, {
  mode: 'insert-after',
  path: 'test.ts',
  anchor: "router.get('/health'",
  content: `
router.get('/status', (req, res) => {
  res.json({ status: 'running' });
});`,
  anchorOffset: 2, // skip closing brace
});
console.log('Test 1 (insert-after):', r1.success ? '✅' : `❌ ${r1.error}`);
if (r1.newContent?.includes('/status')) console.log('  Content verified ✅');

// Test 2: insert-before
const r2 = applyEdit(sampleFile, {
  mode: 'insert-before',
  path: 'test.ts',
  anchor: '// ─── Exports ───',
  content: `// ─── Patrol ───
router.get('/patrol', (req, res) => {
  res.json({ findings: [] });
});
`,
});
console.log('Test 2 (insert-before):', r2.success ? '✅' : `❌ ${r2.error}`);

// Test 3: replace-block
const r3 = applyEdit(sampleFile, {
  mode: 'replace-block',
  path: 'test.ts',
  startAnchor: '// ─── Health ───',
  endAnchor: '// ─── Exports ───',
  content: `// ─── Health v2 ───
router.get('/health', (req, res) => {
  res.json({ ok: true, version: 2, uptime: process.uptime() });
});

`,
});
console.log('Test 3 (replace-block):', r3.success ? '✅' : `❌ ${r3.error}`);

// Test 4: parse worker output
const workerOutput = JSON.stringify({
  mode: 'insert-after',
  path: 'server/src/routes/opusBridge.ts',
  anchor: "opusBridgeRouter.get('/opus-status'",
  content: "opusBridgeRouter.get('/new-endpoint', (req, res) => { res.json({ok:true}); });",
});
const parsed = parseWorkerEdit(workerOutput);
console.log('Test 4 (parse):', parsed ? '✅' : '❌');

// Test 5: validate against file
const v1 = validateEdit(sampleFile, {
  mode: 'insert-after',
  path: 'test.ts',
  anchor: 'NONEXISTENT LINE',
  content: 'code',
});
console.log('Test 5 (validate missing anchor):', v1 ? `✅ Caught: ${v1}` : '❌ Should have failed');

// Test 6: classic patch still works
const r6 = applyEdit(sampleFile, {
  mode: 'patch',
  path: 'test.ts',
  patches: [{ search: '{ ok: true }', replace: '{ ok: true, v: 2 }' }],
});
console.log('Test 6 (classic patch):', r6.success ? '✅' : `❌ ${r6.error}`);

console.log('\nAll tests done.');
