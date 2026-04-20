# F10 — Async-Jobs-Persistenz

- **Status:** in_implementation (Session S35 abends, 2026-04-20)
- **Vorgänger-Kandidaten:** F7 (Pool-Config-Persistenz, ist Template) und F9+F6 (Builder-Pipeline-Härtung)
- **Umsetzungs-Modus:** ein atomarer Commit via Copilot (Schema + Runtime in einem Block). Schema-Migration via bestehendem `/api/builder/opus-bridge/migrate`-Endpoint nach dem Push.

## Problem

`asyncOpusJobs` in `server/src/routes/health.ts` ist eine in-memory `Map<string, Job>`. Sie hält den Status aller aktiven und kürzlich beendeten async-Jobs (`running` / `done` / `failed`), das Ergebnis-Payload und Fehler-Meldungen. Bei jedem Container-Restart (Deploy, Idle-Timeout, Health-Check-Fail) wird die Map geleert:

- Laufende Jobs sind strukturell verloren — der Client kann nicht mehr nachfragen
- Beendete Jobs der letzten Stunden sind nicht mehr abrufbar
- Fehler-Diagnose nach Crash unmöglich, weil Error-Payload weg

Für kurze Tasks (wenige Sekunden) ist das akzeptabel. Für **große Decomposer-Runs** mit mehreren Minuten Laufzeit oder für F6-Akzeptanztests, die wir über `/api/health/opus-job-status` verfolgen, wird die Persistenzlücke akut — genau während eines wichtigen Runs killt ein zufälliger Idle-Timeout den Nachweis.

## F7 als Template

Die gleiche Klasse von Problem wurde in S33-F7 gelöst (`pool_state`-Tabelle in Neon). Der Architektur-Vertrag ist klar:

- **DB ist Single Source of Truth.** In-memory Map ist Read-Cache für Performance.
- **Startup-Load:** `initializeAsyncJobsCache()` liest die letzten 100 Jobs aus DB und befüllt die Map. Fehler dabei loggen, nicht crashen.
- **Write-on-Change:** Fire-and-forget UPSERT (`persistAsyncJobAsync(job)`). Erfolgreich geschriebene Jobs überleben Restarts.
- **Graceful Degradation:** Wenn DB unreachable, bleibt Map in-memory. Runtime funktioniert, nur ohne Persistenz. Kein Härtefall-Crash.

## Umsetzungs-Plan

### Schema (`server/src/schema/builder.ts`)

Neue Tabelle `async_jobs` neben `pool_state`:

```typescript
export const asyncJobs = pgTable('async_jobs', {
  id: text('id').primaryKey(),
  status: text('status').notNull(), // 'running' | 'done' | 'failed'
  instruction: text('instruction').notNull(),
  result: jsonb('result'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### Runtime (`server/src/routes/health.ts`)

Vier Refactor-Punkte:

1. **Declaration bleibt** — `asyncOpusJobs: Map<string, Job>` als Read-Cache.
2. **Startup-Hook** — `initializeAsyncJobsCache()` liest `SELECT * FROM async_jobs ORDER BY created_at DESC LIMIT 100` und befüllt die Map. Aufruf aus `server/src/index.ts` analog zu `initializePoolState()`.
3. **Write-Helper** — `persistAsyncJobAsync(job)` macht `INSERT ... ON CONFLICT (id) DO UPDATE SET status, result, error, updated_at`. Fire-and-forget mit `.catch(console.error)`. Wird an den drei Write-Stellen des bestehenden Handlers aufgerufen (Create, Done, Failed).
4. **GET-Handler** — Cache-First-Lookup. Wenn `id` nicht in Map: einmalige DB-Abfrage als Fallback. Wenn auch DB leer: 404 wie bisher.

### Migration

Nach Commit-Landung: einmalig `POST /api/builder/opus-bridge/migrate` aufrufen, der führt `npx drizzle-kit push` aus und legt die Tabelle in Neon an.

## Akzeptanzkriterium

Drei Live-Proben:

1. **Persistenz-Basics:** Job erstellen via `POST /opus-task-async`, Container via `/render/redeploy` neu starten, Job-Status via GET mit derselben jobId abrufen → erwartet: Job ist noch da mit vollständigem Payload.

2. **Graceful Degradation:** (nicht live testbar ohne DB-Abwurf, aber im Code-Review prüfen) — wenn `persistAsyncJobAsync` throwt, läuft Runtime weiter.

3. **Cache-First:** Zwei aufeinanderfolgende GETs mit derselben jobId sollten den zweiten aus Cache beantworten. Log-Ausgabe oder Timing-Messung im Code-Review.

## Nicht-Scope

- Keine Änderung am HTTP-Shape von GET/POST — bestehende Clients dürfen nichts merken
- Kein Cleanup-Job für alte Jobs (kann später als eigener Block)
- Keine Job-Queue-Logik (Parallelisierung, Priorisierung) — async_jobs bleibt reine Status-Tabelle
- Keine Migration-Automatik im TS-Code — der bestehende `/migrate`-Endpoint reicht

## Session-Tracking

- **S35-F10 (2026-04-20 abends):** Umsetzung via Copilot. Akzeptanzkriterium live-geprüft nach DB-Migration.
