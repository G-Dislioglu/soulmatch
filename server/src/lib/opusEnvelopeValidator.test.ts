import assert from 'node:assert/strict';

import { validateEnvelope, type EditEnvelope } from './opusEnvelopeValidator.js';

function testAppliedDiffSnapshotPreservesVisibleNewlines(): void {
  const envelope: EditEnvelope = {
    worker: 'test-worker',
    summary: 'append exact smoke line',
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

  const originals = new Map<string, string>([
    ['docs/archive/push-test.md', 'alpha\nK2.7a free class_1 corridor append smoke\nomega\n'],
  ]);

  const result = validateEnvelope(envelope, ['docs/archive/push-test.md'], originals);
  assert.equal(result.valid, true);
  assert.ok(result.appliedDiffSnapshot);
  const preview = result.appliedDiffSnapshot?.files[0]?.changedSegmentsPreview[0] ?? '';
  assert.match(preview, /K2\.7a free class_1 corridor append smoke\\n => K2\.7a free class_1 corridor append smoke\\nK2\.8a free class_1 operations append smoke\\n/);
}

testAppliedDiffSnapshotPreservesVisibleNewlines();

console.log('opusEnvelopeValidator tests passed');
