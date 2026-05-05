import assert from 'node:assert/strict';

import { firstFailureSignal, hasFailureSignal } from './councilDebate.js';

function testGermanFailureDiscussionIsNotRuntimeFailure(): void {
  const content = 'Der Skeptiker beschreibt, wie Fehler behandelt werden. Muster fuer zweite Meinung holen.';

  assert.equal(hasFailureSignal(content), false);
  assert.equal(firstFailureSignal(content), null);
}

function testScoutBracketFailureIsRuntimeFailure(): void {
  const content = '[Web-Scout Fehler: HTTP 400 - google_search_retrieval is not supported]';

  assert.equal(hasFailureSignal(content), true);
  assert.match(firstFailureSignal(content) ?? '', /Web-Scout Fehler: HTTP 400/);
}

function testProviderRuntimeFailureIsRuntimeFailure(): void {
  const content = '[Fehler bei skeptiker: OpenAI API error: 502 Bad Gateway]';

  assert.equal(hasFailureSignal(content), true);
  assert.match(firstFailureSignal(content) ?? '', /Fehler bei skeptiker/);
}

testGermanFailureDiscussionIsNotRuntimeFailure();
testScoutBracketFailureIsRuntimeFailure();
testProviderRuntimeFailureIsRuntimeFailure();

console.log('councilDebate tests passed');
