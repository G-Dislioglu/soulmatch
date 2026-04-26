import assert from 'node:assert/strict';
import { classifyBuilderTask } from '../dist/lib/builderSafetyPolicy.js';

function check(name, input, expected) {
  const actual = classifyBuilderTask(input);
  assert.equal(actual.taskClass, expected.taskClass, name + ' class');
  assert.equal(actual.executionPolicy, expected.executionPolicy, name + ' policy');
  assert.equal(actual.pushAllowed, expected.pushAllowed, name + ' allowed');
  if (expected.includesPath) {
    assert.ok(actual.protectedPathsTouched.includes(expected.includesPath), name + ' path');
  }
  console.log('[builder-safety] ok - ' + name);
}

check('single normal file', {
  scope: ['client/src/app/App.tsx'],
  files: ['client/src/app/App.tsx'],
}, {
  taskClass: 'class_1',
  executionPolicy: 'allow_push',
  pushAllowed: true,
});

check('dry run normal file', {
  scope: ['client/src/app/App.tsx'],
  files: ['client/src/app/App.tsx'],
  dryRun: true,
}, {
  taskClass: 'class_1',
  executionPolicy: 'dry_run_only',
  pushAllowed: false,
});

check('two normal files default review gate', {
  scope: ['client/src/app/App.tsx', 'client/src/modules/M00_home/HomePage.tsx'],
  files: ['client/src/app/App.tsx', 'client/src/modules/M00_home/HomePage.tsx'],
}, {
  taskClass: 'class_2',
  executionPolicy: 'dry_run_only',
  pushAllowed: false,
});

check('two normal files explicit release', {
  scope: ['client/src/app/App.tsx', 'client/src/modules/M00_home/HomePage.tsx'],
  files: ['client/src/app/App.tsx', 'client/src/modules/M00_home/HomePage.tsx'],
  allowAutonomousPush: true,
}, {
  taskClass: 'class_2',
  executionPolicy: 'allow_push',
  pushAllowed: true,
});

check('orchestrator core file', {
  scope: ['server/src/lib/opusTaskOrchestrator.ts'],
  files: ['server/src/lib/opusTaskOrchestrator.ts'],
  allowAutonomousPush: true,
}, {
  taskClass: 'class_3',
  executionPolicy: 'manual_only',
  pushAllowed: false,
  includesPath: 'server/src/lib/opusTaskOrchestrator.ts',
});

check('deploy helper file', {
  scope: ['tools/wait-for-deploy.sh'],
  files: ['tools/wait-for-deploy.sh'],
  allowAutonomousPush: true,
}, {
  taskClass: 'class_3',
  executionPolicy: 'manual_only',
  pushAllowed: false,
  includesPath: 'tools/wait-for-deploy.sh',
});

console.log('[builder-safety] all checks passed');
