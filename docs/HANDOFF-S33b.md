# HANDOFF S33b — F7 Pool-Config-Persistenz in DB gelandet

**Datum:** 2026-04-19 (spät)
**Vorgänger:** S33 (`docs/HANDOFF-S33.md`, Commits `a33ad78` + `56a42f88`)
**Code-Commit:** `ae3e020`
**Session-Close-Commit:** wird in diesem Commit selbst gesetzt

Dies ist ein Supplement zu `docs/HANDOFF-S33.md` — dieselbe Nacht, anderer
Block. F7 wurde direkt nach dem S33-Session-Close angegangen und live
verifiziert, bevor der Schlaf kam.

---

## 1. Geliefert

### Code-Commit `ae3e020` — F7 Pool-Config-Persistenz

**`server/src/schema/builder.ts`** — neue Tabellen-Definition am Ende
angehängt:

```ts
export const poolState = pgTable('pool_state', {
  id: integer('id').primaryKey(),
  poolsJson: text('pools_json').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

Single-Row-Design (id=1 als einzige Zeile). Keine Migration nötig — die Tabelle
wird beim ersten Serverstart via idempotentem `CREATE TABLE IF NOT EXISTS`
erstellt.

**`server/src/lib/poolState.ts`** — komplett umgeschrieben (vorher 80 Zeilen,
jetzt 169 Zeilen):

- Neuer Export `initializePoolState(): Promise<void>`. Idempotent. Führt
  `CREATE TABLE IF NOT EXISTS pool_state` aus, liest dann via Drizzle die
  Singleton-Zeile, übernimmt die Config-Felder in das `activePools`-Objekt.
  Fehlerhafte Inhalte oder fehlende Row → Code-Default greift, Log statt
  Crash.
- `updatePools()` bleibt in der Signatur synchron — keine Breaking Changes für
  bestehende Aufrufer. Am Ende fire-and-forget `void persistPoolsAsync()`.
- `persistPoolsAsync()` macht ein `INSERT ... ON CONFLICT (id) DO UPDATE`, also
  echter Upsert. DB-Fehler werden geloggt und geschluckt.
- Alle anderen Exports unverändert: `POOL_MODEL_MAP`, `getActivePools`,
  `pickFromPool`, `getAllFromPool`, Types.

**`server/src/index.ts`** — zwei Zeilen:

```ts
import { initializePoolState } from './lib/poolState.js';
// ... im app.listen-Callback:
void initializePoolState();
```

Fire-and-forget. Der Server startet sofort; während der DB-Load läuft, greift
der Code-Default. Sobald der Load fertig ist (typisch <1s), wird die
persistierte Config überschrieben. Ein User-Request in diesem Millisekunden-
Fenster würde die Defaults sehen — vertretbar, weil die Defaults sowieso auf
der zuletzt gewünschten Produktiv-Config stehen (S33-Temp-Fix).

### Live-Verifikation

Testablauf nach Deploy von `ae3e020`:

1. `POST /maya/pools` ohne Änderung → Start-Config: `maya: ['glm51']` (Code-Default, DB war noch leer)
2. `POST /maya/pools {"pools":{"maya":["opus"]}}` → in-memory auf `['opus']`, DB-Zeile wird geschrieben
3. `POST /render/redeploy` → Render-Deploy getriggert
4. 4 Minuten gewartet, `/api/health` zeigt neuen `serverStartedAt: 2026-04-19T20:52:49Z` → Container wurde neu gestartet
5. `POST /maya/pools` ohne Änderung → liefert `maya: ['opus']` ← **Persistenz bestätigt**
6. Cleanup: Maya zurück auf `['glm51']`, Produktivstand wiederhergestellt

Das war der entscheidende Test. Ohne F7 wäre Schritt 5 auf `['glm51']`
zurückgesprungen (Code-Default nach Neustart).

**Nebenbefund:** der manuell getriggerte zweite Redeploy-Versuch stand im
Render-Dashboard als `build_failed`. Das ist ein bekanntes Verhalten wenn man
`/render/redeploy` ohne Commit-Änderung aufruft — Render hat nichts zu
bauen und meldet `build_failed`. Der erste Deploy (vom F7-Commit selbst) lief
sauber durch, das war der Deploy, der den Container für unseren Test neu
gestartet hat. Der Uptime-Zähler von 5 Minuten beweist den Neustart. Kein
echter Bug.

---

## 2. Was damit erledigt ist

- Drift 7 aus `docs/CLAUDE-CONTEXT.md` (Pool-Config-Flüchtigkeit) ist strukturell gefixt — die drift-watchlist-Severity sinkt auf `low_closed_by_F7`.
- Offener Task 9 in `docs/SESSION-STATE.md` (F7) wird auf DONE gestellt.
- RADAR-Kandidat F7 ist damit abgeschlossen (noch nicht in RADAR.md eingetragen gewesen — das war ein Seiten-Task aus S33, der nie auf die Liste kam; jetzt überspringbar).

Damit bleibt von der S33-Todo-Liste:
- `/session-log`-Endpoint bauen (Spec existiert, höchste Priorität)
- RADAR.md nachziehen (F6 file-scout eintragen, F7 als closed markieren)
- `workerProfiles.ts`-Drift fixen (veraltete Model-IDs)
- Kaya-Rename im Code
- S31-False-Positive-Pipeline-Path-Fix (Hauptthread)

---

## 3. Für neue Chats

Die Einstiegs-Reihenfolge bleibt unverändert aus S33:

1. `docs/CLAUDE-CONTEXT.md` — Anker
2. `STATE.md`
3. `RADAR.md`
4. `docs/SESSION-STATE.md`
5. `docs/HANDOFF-S33.md` (Haupt-Session S33)
6. **Dieser Handoff** (`docs/HANDOFF-S33b.md`) — F7-Block nach S33-Close

Session-Historie-Lücke unverändert: S22, S23, S26, S27, S28, S29.
