import fs from 'node:fs';
import path from 'node:path';
import { buildTeamCoordinationContext } from './builderTeamAwareness.js';

export interface BuilderControlState {
  projectState: {
    repoHead: string;
    lastCompletedBlock: string;
    runtimeNote: string;
  };
  teamCoordination: {
    maya: string;
    council: string;
    worker: string;
  };
  activeRules: string[];
  openAssumptions: string[];
  nextBlock: {
    title: string;
    scope: string;
    reason: string;
  };
}

function resolveStateFilePath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'STATE.md'),
    path.resolve(process.cwd(), '..', 'STATE.md'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0]!;
}

function parseStateHeader(content: string): Record<string, string> {
  try {
    const result: Record<string, string> = {};
    const GA = String.fromCharCode(96);
    const lines = content.split('\n');

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('- ' + GA)) {
        continue;
      }

      const keyEnd = line.indexOf(GA, 3);
      if (keyEnd === -1) {
        continue;
      }

      const markerStart = keyEnd + 1;
      if (line.slice(markerStart, markerStart + 3) !== ': ' + GA) {
        continue;
      }

      const valueStart = markerStart + 3;
      const valueEnd = line.indexOf(GA, valueStart);
      if (valueEnd === -1) {
        continue;
      }

      const key = line.slice(3, keyEnd);
      const value = line.slice(valueStart, valueEnd);
      result[key] = value;
    }

    return result;
  } catch {
    return {};
  }
}

export function getNextRecommendedBlock(): { title: string; scope: string; reason: string } {
  try {
    const content = fs.readFileSync(resolveStateFilePath(), 'utf-8');
    const parsed = parseStateHeader(content);
    const text = parsed['next_recommended_block'] || 'not available';

    return {
      title: text.slice(0, 120),
      scope: 'aus STATE.md naechster Block, eng gefuehrt',
      reason: 'Derived from STATE.md next_recommended_block field',
    };
  } catch {
    return {
      title: 'not available',
      scope: 'aus STATE.md naechster Block, eng gefuehrt',
      reason: 'Derived from STATE.md next_recommended_block field',
    };
  }
}

export function getBuilderControlState(): BuilderControlState {
  try {
    const content = fs.readFileSync(resolveStateFilePath(), 'utf-8');
    const parsed = parseStateHeader(content);

    return {
      projectState: {
        repoHead: parsed['current_repo_head'] || 'unknown',
        lastCompletedBlock: (parsed['last_completed_block'] || 'not available').slice(0, 200),
        runtimeNote: 'Phase 0 control plane initial read from STATE.md',
      },
      teamCoordination: {
        maya: buildTeamCoordinationContext({ role: 'maya' }),
        council: buildTeamCoordinationContext({ role: 'council' }),
        worker: buildTeamCoordinationContext({ role: 'worker' }),
      },
      activeRules: [
        'Client: pnpm typecheck vor Abschluss',
        'Server: pnpm build vor Abschluss',
        'Keine stillen Grossumbauten',
        'Builder bleibt Haupt-Runtime',
        'Review-needed nicht mit Produktwahrheit verwechseln',
      ],
      openAssumptions: [
        'AICOS selektiv eingebunden, noch nicht normativer Kern',
        'Bluepilot bleibt Soll-Architektur, nicht Runtime',
        'Maya-Core kein operativer Control-Layer',
      ],
      nextBlock: getNextRecommendedBlock(),
    };
  } catch {
    return {
      projectState: {
        repoHead: 'unknown',
        lastCompletedBlock: 'not available',
        runtimeNote: 'control plane unavailable',
      },
      teamCoordination: {
        maya: 'not available',
        council: 'not available',
        worker: 'not available',
      },
      activeRules: ['not available'],
      openAssumptions: ['not available'],
      nextBlock: {
        title: 'not available',
        scope: 'not available',
        reason: 'not available',
      },
    };
  }
}
