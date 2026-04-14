import assert from 'node:assert/strict';
import { applyEdit, parseWorkerEdit, validateEdit } from './anchorPatch.js';

function testReplace(): void {
  const parsed = parseWorkerEdit('{"mode":"replace","search":"oldValue","replace":"newValue"}');
  assert.equal(validateEdit('const x = oldValue;', parsed), null);
  const result = applyEdit('const x = oldValue;', parsed);
  assert.equal(result.success, true);
  assert.equal(result.newContent, 'const x = newValue;');
}

function testInsertAfter(): void {
  const parsed = parseWorkerEdit(JSON.stringify({
    mode: 'insert_after',
    anchor: 'const ready = true;\n',
    content: 'const next = false;\n',
  }));
  assert.equal(validateEdit('const ready = true;\nreturn ready;\n', parsed), null);
  const result = applyEdit('const ready = true;\nreturn ready;\n', parsed);
  assert.equal(result.success, true);
  assert.equal(result.newContent, 'const ready = true;\nconst next = false;\nreturn ready;\n');
}

function testLegacyFallback(): void {
  const parsed = parseWorkerEdit(['<<<SEARCH', 'foo', '===REPLACE', 'bar', '>>>'].join('\n'));
  assert.equal(validateEdit('foo', parsed), null);
  const result = applyEdit('foo', parsed);
  assert.equal(result.success, true);
  assert.equal(result.newContent, 'bar');
}

function testNonUniqueAnchor(): void {
  const parsed = parseWorkerEdit('{"mode":"insert_before","anchor":"x","content":"y"}');
  assert.equal(validateEdit('xx', parsed), 'anchor is not unique in file');
}

testReplace();
testInsertAfter();
testLegacyFallback();
testNonUniqueAnchor();

console.log('anchorPatch tests passed');
