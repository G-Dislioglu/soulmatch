import assert from 'node:assert/strict';

import { previewEditForJudge } from './opusJudge.js';
import type { EditEnvelope } from './opusEnvelopeValidator.js';

function testPreviewPreservesVisibleNewlinesForCreateTargets(): void {
  const envelope: EditEnvelope = {
    worker: 'test-worker',
    summary: 'create helper smoke file',
    edits: [
      {
        path: 'docs/archive/k28a-free-class1-ops-smoke.txt',
        mode: 'create',
        content: [
          'K2.8a free class_1 ops helper smoke',
          'explicit create-target',
          'single-file only',
        ].join('\n'),
      },
    ],
  };

  const preview = previewEditForJudge(envelope);
  assert.match(preview, /\[create\].*K2\.8a free class_1 ops helper smoke\\nexplicit create-target\\nsingle-file only/);
}

function testPreviewPreservesVisibleNewlinesForPatchAnchors(): void {
  const envelope: EditEnvelope = {
    worker: 'test-worker',
    summary: 'patch multiline block',
    edits: [
      {
        path: 'docs/archive/push-test.md',
        mode: 'patch',
        patches: [
          {
            search: 'line one\nline two\n',
            replace: 'line one\nline two changed\n',
          },
        ],
      },
    ],
  };

  const preview = previewEditForJudge(envelope);
  assert.match(preview, /\[patch\].*line one\\nline two\\n => line one\\nline two changed\\n/);
}

function testPreviewKeepsFullAppendLineVisibleForPatchEdits(): void {
  const envelope: EditEnvelope = {
    worker: 'test-worker',
    summary: 'append exact line',
    edits: [
      {
        path: 'docs/archive/push-test.md',
        mode: 'patch',
        patches: [
          {
            search: 'K2.7a free class_1 corridor append smoke\n',
            replace: 'K2.7a free class_1 corridor append smoke\nK2.8a free class_1 operations append smoke\n',
          },
        ],
      },
    ],
  };

  const preview = previewEditForJudge(envelope);
  assert.match(preview, /K2\.8a free class_1 operations append smoke\\n/);
}

testPreviewPreservesVisibleNewlinesForCreateTargets();
testPreviewPreservesVisibleNewlinesForPatchAnchors();
testPreviewKeepsFullAppendLineVisibleForPatchEdits();

console.log('opusJudge tests passed');
