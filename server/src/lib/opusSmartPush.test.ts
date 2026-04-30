import assert from 'node:assert/strict';

import { buildPatchViaPushFiles } from './opusSmartPush.js';
import type { PatchEdit } from './opusPatchMode.js';

function testSmallFilesStayDeterministicOverwrite(): void {
  const patches: PatchEdit[] = [
    {
      search: 'alpha\n',
      replace: 'alpha\nbeta\n',
    },
  ];

  const files = buildPatchViaPushFiles('docs/archive/push-test.md', patches, 'alpha\nbeta\n');
  assert.deepEqual(files, [
    {
      file: 'docs/archive/push-test.md',
      content: 'alpha\nbeta\n',
    },
  ]);
}

function testLargeFilesFallBackToSearchReplacePayloads(): void {
  const patches: PatchEdit[] = [
    {
      search: 'const current = body.question;\n',
      replace: "const question = typeof body.question === 'string' ? body.question.trim() : '';\n",
    },
  ];

  const largeContent = `${'x'.repeat(60_000)}\n${patches[0].replace}`;
  const files = buildPatchViaPushFiles('server/src/routes/studio.ts', patches, largeContent);
  assert.deepEqual(files, [
    {
      file: 'server/src/routes/studio.ts',
      search: 'const current = body.question;\n',
      replace: "const question = typeof body.question === 'string' ? body.question.trim() : '';\n",
    },
  ]);
}

testSmallFilesStayDeterministicOverwrite();
testLargeFilesFallBackToSearchReplacePayloads();

console.log('opusSmartPush tests passed');
