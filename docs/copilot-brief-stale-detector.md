# Task: Auto-Stale-Detection für hängende Tasks

## Ziel
Tasks die zu lange in einem Zwischen-Status stecken, werden automatisch als "blocked" markiert und Maya wird darüber informiert. Kein manuelles Eingreifen nötig.

## Datei: `server/src/lib/opusBridgeController.ts` (oder eigene Datei `server/src/lib/builderStaleDetector.ts`)

## Konzept
Ein Interval-Timer der alle 5 Minuten läuft und Tasks erkennt die zu lange in einem Status hängen:

```typescript
import { getDb } from '../db.js';
import { builderTasks } from '../schema/builder.js';
import { and, inArray, lt, eq } from 'drizzle-orm';

const STALE_THRESHOLDS: Record<string, number> = {
  planning: 10 * 60 * 1000,       // 10 Minuten
  consensus: 15 * 60 * 1000,      // 15 Minuten
  push_candidate: 10 * 60 * 1000, // 10 Minuten
};

export function startStaleDetector() {
  setInterval(async () => {
    try {
      const db = getDb();
      const now = Date.now();
      let totalBlocked = 0;

      for (const [status, threshold] of Object.entries(STALE_THRESHOLDS)) {
        const cutoff = new Date(now - threshold);
        const stale = await db
          .select({ id: builderTasks.id, title: builderTasks.title })
          .from(builderTasks)
          .where(
            and(
              eq(builderTasks.status, status),
              lt(builderTasks.updatedAt, cutoff)
            )
          );

        for (const task of stale) {
          await db
            .update(builderTasks)
            .set({ status: 'blocked', updatedAt: new Date() })
            .where(eq(builderTasks.id, task.id));
          console.log(`[stale-detector] blocked ${task.id.slice(0, 8)} — was ${status} for >${threshold / 60000}min: ${task.title.slice(0, 60)}`);
          totalBlocked++;
        }
      }

      if (totalBlocked > 0) {
        console.log(`[stale-detector] ${totalBlocked} stale tasks blocked`);
      }
    } catch (err) {
      console.error('[stale-detector] error:', err);
    }
  }, 5 * 60 * 1000); // alle 5 Minuten

  console.log('[stale-detector] started — checking every 5 min');
}
```

## Integration
In `server/src/index.ts` (oder wo der Server startet), nach DB-Initialisierung:
```typescript
import { startStaleDetector } from './lib/builderStaleDetector.js';
// ... nach DB-Init:
startStaleDetector();
```

## Nicht tun
- Keine automatische Löschung — nur Status auf "blocked" setzen
- Kein neuer Endpoint
- Keine Änderung an bestehenden Flows

## Verifikation
```bash
cd server && npx tsc --noEmit
```
Dann deployen, 10 Minuten warten, Render-Logs checken auf `[stale-detector]` Einträge.
