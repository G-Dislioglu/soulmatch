# HANDOFF S33 — Zhipu-Pool-Konsolidierung, Free-Tier-Leck geschlossen, Pool-Config-Flüchtigkeit entdeckt

**Datum:** 2026-04-19 (späte Abend-Session)
**Vorgänger:** S32 (2026-04-19 früher, `docs/HANDOFF-S32.md`)
**Repo-Head bei Session-Start:** `a30dbdf` (die atomare Mehrdatei-Commit-Integration aus S32)
**Repo-Head nach Code-Commit:** `a33ad78` (Zhipu-Pool-Konsolidierung)
**Repo-Head nach Session-Close-Commit:** wird in diesem Commit selbst gesetzt

---

## 1. Geliefert heute

### 1a. Zhipu-Pool-Konsolidierung — Commit `a33ad78`

Vier Dateien in einem atomaren Commit auf `main`. Live verifiziert nach
Render-Deploy.

**`server/src/lib/poolState.ts`:**

- Drei GLM-Einträge im `POOL_MODEL_MAP` von `provider: 'openrouter'` auf
  `provider: 'zhipu'` umgestellt:
  - `glm-turbo`: `z-ai/glm-5-turbo` → `glm-5-turbo`
  - `glm51`: `z-ai/glm-5.1` → `glm-5.1`
  - `glm-flash`: `z-ai/glm-4.7-flash` → `glm-4.7-flashx`
- Die `activePools`-Default-Konstante auf die tatsächliche Builder-UI-Produktivkonfiguration
  gehoben: `maya: ['glm51']`, `council: ['opus', 'sonnet', 'gpt-5.4']`,
  `worker: ['glm-turbo', 'glm51', 'minimax', 'kimi', 'qwen']`,
  `scout: ['deepseek-scout', 'glm-flash', 'gemini-flash']`,
  `distiller: ['glm-flash']`. Damit überlebt die Pool-Auswahl einen
  Render-Restart, bis die richtige Persistenz-Schicht existiert.

**`server/src/lib/scoutPatrol.ts`:**

- `ROUTINE_MODELS[0]`: `glm-4.7-flash` → `glm-4.7-flashx`, Label von `GLM 4.7 Flash`
  auf `GLM 4.7 FlashX`, Preis `0.06/0.40` → `0.07/0.40`.
- `DEEP_MODELS[0]`: GLM-5.1 Preis von `1.00/3.20` auf `1.40/4.40` korrigiert
  (laut aktueller z.ai Pricing-Seite).

**`docs/provider-specs.md`:**

- Worker-Tabelle Zeile für GLM-4.7-Flash auf FlashX umbenannt und Preis auf
  `0.07/0.40` aktualisiert.
- Scouts-Tabelle gleich.
- Entscheidungs-Block explizit: `GLM-4.7-FlashX ist BEZAHLT ... GLM-4.7-Flash
  (ohne X) ist Z.ai Free-Tier mit Data-Collection und wird bewusst NICHT
  genutzt.`
- Neuer Teilprüfungs-Eintrag `Zhipu-Pool-Konsolidierung: 19. April 2026`.

**`docs/SESSION-STATE.md`:**

- Worker-Pool-Zeile korrigiert (war falsch: behauptete OpenRouter).
- Neuer offener Task `[S33-NEU] Pool-Config-Persistenz fehlt` als Eintrag 9
  ergänzt.

### 1b. Live-Verifikation nach Deploy

Render-Deploy lief erfolgreich durch. `/api/health` bestätigt
`commit: a33ad7819e9db950cca87b27871c1dbf544fa7de`. `POST /api/builder/maya/pools`
mit leerem Body gibt nach dem Container-Neustart genau die neue Default-Config
zurück, ohne dass ein UI-Klick stattgefunden hätte:

```json
{
  "maya": ["glm51"],
  "council": ["opus", "sonnet", "gpt-5.4"],
  "worker": ["glm-turbo", "glm51", "minimax", "kimi", "qwen"],
  "scout": ["deepseek-scout", "glm-flash", "gemini-flash"],
  "distiller": ["glm-flash"]
}
```

Damit ist die strukturelle Lücke aus Abschnitt 2c (unten) vorläufig geschlossen.
Der Container kann jetzt neu starten, ohne dass Gürcans Pool-Auswahl verloren
geht.

### 1c. CLAUDE-CONTEXT.md und STATE.md auf S33 gehoben

Im Session-Close-Commit dieses Handoffs werden parallel aktualisiert:

- **`docs/CLAUDE-CONTEXT.md`**: Front-Matter auf `S33`, drei neue
  `active_threads`-Einträge (`session_log_endpoint`, `pool_config_persistence`,
  plus Beibehaltung der bestehenden), drei neue `drift_watchlist`-Einträge
  (`flash_vs_flashx_collision`, `repo_privacy_misdiagnosis`,
  `pool_config_flightness`), drei neue Prosa-Drift-Warnungen (Drift 5, 6, 7).
- **`STATE.md`**: Header-Block mit neuem `current_repo_head`,
  `last_verified_against_code`, ausführlichem `last_completed_block` und
  aktualisiertem `next_recommended_block`.
- **`docs/SESSION-STATE.md`**: Header auf S33 gezogen, Task `0a` als `DONE`
  markiert.

---

## 2. Prozess-Lehren aus dieser Session

### 2a. Das Anti-Drift-System hat diesmal gegriffen — teilweise

Die Session begann damit, dass ich fälschlich behauptete, das Repo sei privat
(weil `web_fetch` einen `PERMISSIONS_ERROR` lieferte). Gürcan hat das korrigiert:
die Repos sind public, der Fehler heisst nur "URL war nicht in vorheriger
Konversation oder Suche". Als dauerhafter Memory-Eintrag (Nr. 16) festgehalten.
Der zuverlässige Weg ist `curl` via bash_tool auf
`raw.githubusercontent.com/G-Dislioglu/<repo>/main/<pfad>`.

Positiv: sobald ich `curl` genutzt habe, war der Zugang zum Repo vollständig und
alle weiteren Schritte liefen sauber. Der Drift ist also aus dem Protokoll
erkennbar und umkehrbar, sobald er benannt wird.

Negativ: ich habe diesen Drift in jeder bisherigen Session neu gemacht. Der
Memory-Eintrag sollte das für die Zukunft stoppen.

### 2b. Flash vs FlashX — ein Zeichen, zwei Welten

Beim Durchgehen der z.ai Pricing-Seite ist aufgefallen, dass es zwei sehr
ähnlich benannte Modelle gibt: `GLM-4.7-Flash` (Free-Tier, Data-Collection) und
`GLM-4.7-FlashX` (bezahlt, keine Data-Collection). Die Unterscheidung ist
kritisch, weil Gürcan eine explizite Regel hat: keine Free-Tier-Modelle, weil
die Prompts zum Training verwendet werden.

Im Code und in der Doku wurden beide Namen inkonsistent verwendet:

- `poolState.ts:20` hatte `z-ai/glm-4.7-flash` (Free-Tier) eingetragen.
- Die UI im Builder Studio zeigte dasselbe Modell als "GLM FlashX" — Label
  stimmte also nicht mit Model-ID überein.
- `scoutPatrol.ts:58` hatte ebenfalls `glm-4.7-flash` mit dem Preis 0.06/0.40,
  der in Wahrheit der FlashX-Preis ist (also falsches Modell mit richtigem
  Preis — doppelt verwirrend).
- `docs/provider-specs.md` nannte das Modell konsequent `GLM-4.7-Flash`, obwohl
  eigentlich FlashX gemeint war.

Resultat: Gürcans Destillierer lief über einen unbestimmten Zeitraum hinweg auf
dem Free-Tier und fütterte Z.ai mit Builder-Prompts, obwohl die eigene Regel
genau das ausschliessen sollte. In S33 komplett auf FlashX konsolidiert.

**Lehre für die Zukunft**: bei fast-identischen Modellnamen das letzte Zeichen
als kritische Markierung behandeln, nicht auf Label verlassen. Wenn ein Modell
"Free" ist, muss es überall rot markiert oder explizit ausgeschlossen werden.

### 2c. Pool-Config war nie persistent — der grössere Befund

Beim Code-Lesen ist klargeworden, dass die UI-Pool-Auswahl im Builder Studio
nicht persistent gespeichert wird. `POST /api/builder/maya/pools` landet in
`updatePools()`, das nur eine In-Memory-Variable aktualisiert. Bei jedem
Render-Restart (Deploy, Idle-Timeout, Health-Check-Fail, Scale-Event) wird
`activePools` aus dem Code-Default neu initialisiert — und der Code-Default
stand auf `maya: ['opus']`, `worker: ['glm-turbo', 'minimax', 'kimi', 'qwen',
'deepseek']`, ohne GLM 5.1.

Das heisst: Gürcan hat GLM 5.1 als Maya eingestellt und zusätzlich in den
Worker-Pool aufgenommen, aber nach dem nächsten Restart war das weg. Er hatte
deshalb über längere Zeit den Eindruck, dass "sich was geändert hat, obwohl ich
nichts gemacht habe" — das war jeweils ein Container-Restart.

**Temp-Fix in S33-Commit**: der Code-Default in `poolState.ts:35-41` spiegelt
jetzt die Produktivkonfiguration. Damit überlebt seine Auswahl einen Restart.

**Richtiger Fix (noch offen, RADAR F7)**: eine Persistenz-Schicht. Zwei
Optionen:

1. **DB-Tabelle** `pool_state` mit einer einzigen Zeile, die bei jedem
   `updatePools()` geschrieben und beim Serverstart gelesen wird.
2. **File-basiert** `docs/pool-state.json` oder `data/pool-state.json` mit
   Read-on-Startup und Write-on-Update. Einfacher, aber pro Render-Instanz
   (nicht geteilt bei horizontaler Skalierung — für Single-Instance-Setup wie
   aktuell unkritisch).

### 2d. Das Zahlungsthema ist erledigt

Gürcan hat $10 auf dem z.ai-Account aufgeladen. Der Billing-Link ist
`https://z.ai/manage-apikey/billing`. Ein praktischer Hinweis, den ich aus der
z.ai-Doku geholt habe: bei Kreditkarten darf 3D-Secure nicht aktiv sein, sonst
scheitert die Zahlung. Gürcan hat es ohne diese Friktion geschafft.

Damit ist die Umstellungs-Frage aus Handoff S32 final geschlossen: wir bleiben
bei Zhipu-direkt, es gibt keinen nachgewiesenen Qualitätsgrund für OpenRouter,
und der einzige Vorteil von OpenRouter (Unabhängigkeit von Zhipu-Zahlungen) ist
durch das aufgeladene Guthaben irrelevant.

---

## 3. Offener Stand am Session-Ende

### 3a. Aus S33 direkt entstandene offene Threads

- **RADAR-Kandidat F7 — Pool-Config-Persistenz.** Siehe Abschnitt 2c. Temp-Fix
  landed, richtiger Fix steht aus. Sollte als `active / proposal` in RADAR.md
  eingetragen werden.
- **`workerProfiles.ts` ist gedriftet** — als zweiter Befund beim Code-Lesen
  aufgefallen. Model-IDs passen nicht mehr zu aktuellen Provider-Specs:
  MiniMax-M1-80k (sollte M2.7), kimi-k2 (sollte K2.5),
  qwen/qwen3-coder (sollte qwen3.6-plus), DeepSeek `costTier: 'free'` (ist
  bezahlt). Keine Code-Auswirkung gefunden (das Modul wird vom Worker-Swarm
  nicht direkt genutzt, nur für Agent-Brief-Generation in `pickWorker()`), aber
  die Doku-Rolle macht es zum Stolperstein für nächste Sessions. Eigener
  Aufräum-Task, nicht jetzt.

### 3b. Aus S32 übernommen, weiterhin offen

Alles unverändert aus Handoff-S32 Abschnitt 3a und 3b:

- **`/session-log`-Endpoint bauen** (Spec: `docs/BUILDER-TASK-session-log.md`).
  Sollte Priorität haben, damit folgende Commits automatisch protokolliert
  werden.
- **RADAR-Kandidat F6 anlegen** — `Pipeline-Scouts mit echtem File-Zugriff`.
- **Kaya-Rename im Code** — `orion` → `kaya` in `personaRouter.ts`,
  `studioPrompt.ts`, `HallOfSouls.tsx`.
- **S31-False-Positive-Pipeline-Path-Fix** (Schritte A, C, D aus
  `docs/S31-CANDIDATES.md`).
- **TSC-Retry Roundtable-Pfad schliessen** (S30-Rest).
- **Block 5d PR #2 — Context-Split** (Maya-Guide via React Context, S30-Rest).
- **Maya-Core nächsten Block schneiden** — blockiert seit 2026-04-05.
- **Async Job-Pattern für `/opus-task`** (S24-Rest).
- **Patrol Finding Auto-Fix** (S24-Rest).

### 3c. RADAR-Kandidaten, die weiterhin `active` sind

Unverändert aus S32:

- **F3** — Opus-Bridge End-to-End Live-Verification auf Render.
- **F4** — Builder-S17 Live-Verification (Distiller-Intent, UI-Cancel,
  Stale-Detector-Logs).
- **F5** — Director Live async-validation.
- **F5e** — Deterministische Related-Files-Briefing-Lane.
- **G** — Provider Truth Sync (Docs-vs-Code-Drift für Provider-Naming) — hat
  sich in S33 als dringlicher erwiesen als vermutet, Teil davon durch diese
  Session adressiert, Rest offen (`workerProfiles.ts`).

Neu aus S33:

- **F6** — Pipeline-Scouts mit echtem File-Zugriff (aus S32, noch nicht in
  RADAR.md eingetragen).
- **F7** — Pool-Config-Persistenz (aus S33).

### 3d. Strategischer Ausblick unverändert

Soulmatch-Feature-Arbeit bleibt pausiert. Builder-App muss stabilisiert werden,
danach Maya-Core-Schnitt, dann Persona-Migration von Soulmatch nach Maya-Core.
Bluepilot Phase 1 erst nach stabilem Maya-Core. Historische-Figuren-Spec als
Preset-Kategorie im zukünftigen Maya-Core-Arcana-Studio — wartet auf
Maya-Core-Schnitt.

---

## 4. Drifts aus S33 (Detail-Dokumentation)

Drei neue Drifts sind in dieser Session zur Oberfläche gekommen und in
`docs/CLAUDE-CONTEXT.md` `drift_watchlist` sowie in den Prosa-Abschnitten
dokumentiert:

5. **flash_vs_flashx_collision** (severity: high bis zum S33-Fix, jetzt gefixt)
   — Zwei Modellnamen unterscheiden sich nur durch ein einziges Zeichen, haben
   aber grundlegend unterschiedliche Preis- und Datenschutz-Eigenschaften. Drei
   Stellen im Code/Doku hatten die falsche Wahl eingetragen. Gefixt in `a33ad78`.

6. **repo_privacy_misdiagnosis** (severity: medium, wiederkehrend) — Der
   `web_fetch` Permissions-Error wird von Claude in jeder Session erneut als
   "Repo ist privat" fehlinterpretiert. Memory-Eintrag Nr. 16 soll das
   zukünftig verhindern.

7. **pool_config_flightness** (severity: high bis Persistenz-Fix) — Die
   UI-Pool-Auswahl geht bei jedem Render-Restart verloren. Temp-Fix: Code-Default
   spiegelt Produktiv-Config. Richtiger Fix steht aus (RADAR F7).

---

## 5. Für neue Chats: Einstiegs-Reihenfolge

Unverändert zur S32-Logik, nur der aktuelle Handoff ist neu:

1. `docs/CLAUDE-CONTEXT.md` — Claude-spezifischer Anker
2. `STATE.md` — kanonischer aktueller Stand
3. `RADAR.md` — aktive Kandidaten
4. `docs/SESSION-STATE.md` — Session-Entscheidungen, offene Tasks
5. Dieser Handoff (`docs/HANDOFF-S33.md`) — was in S33 passiert ist
6. Bei Bedarf: `HANDOFF-S32.md`, `HANDOFF-S31.md`, `HANDOFF-S30.md`
7. Bei Pipeline-Themen: `docs/HANDOFF-2026-04-12-PIPELINE-COMPLETE.md` und
   `docs/HANDOFF-S25.md`

Session-Historie-Lücke unverändert: S22, S23, S26, S27, S28, S29 ohne
Handoff-Files im Repo.
