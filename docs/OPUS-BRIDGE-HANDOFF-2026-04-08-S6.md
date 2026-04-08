# OPUS-BRIDGE HANDOFF — Stand 08. April 2026, Session 6

## Zusammenfassung

Die Opus-Bridge ist ein autonomes Multi-KI Builder-System für Soulmatch.
Claude kann selbstständig Code schreiben, pushen, deployen und testen.
In Session 4-6 wurden der Decomposer, Render-Controller und autonomes
Deployment implementiert und E2E verifiziert.

Repo: github.com/G-Dislioglu/soulmatch | Live: soulmatch-1.onrender.com
Letzter Commit: `99a5f9a` (auto-committed getTaskSummary via Decomposer)

---

## KRITISCH: Nächste Session — Builder-Proxy bauen

### Problem
Claude erreicht das Tool-Nutzungslimit in claude.ai weil jeder Task
15-20 bash/curl-Calls braucht (push, deploy-check, test, retry).

### Lösung: POST /build Endpoint
Ein All-in-One-Endpoint der INTERN alles macht:

```
Claude sendet 1x POST /build
  → Builder macht intern:
    1. Scout-Phase
    2. Decompose (5x $0)
    3. Swarm + Meister ($$$)
    4. GitHub Action triggern
    5. Deploy-Status pollen (intern, loop)
    6. Endpoint-Verifikation (interner curl/fetch)
    7. Bei tsc-Fehler: Error-Card + Auto-Retry (1x)
    8. Ergebnis zurückgeben
```

**Claude braucht dann NUR NOCH 1 Tool-Call pro Feature.**

### Implementierungsplan für /build

Datei: `server/src/lib/opusBuildPipeline.ts` (~200 Zeilen)

```typescript
export async function runBuildPipeline(input: {
  instruction: string;
  scope: string[];
  risk: 'low' | 'medium' | 'high';
  useDecomposer?: boolean;  // default: true
  verify?: { endpoint: string; expect: string }; // optional post-deploy check
  autoRetry?: boolean; // retry on tsc failure, default: true
}): Promise<BuildResult>
```

Intern:
- Ruft `executeTask()` auf (existiert bereits)
- Pollt `getDeployStatus()` bis "live" (existiert bereits)
- Führt fetch auf verify.endpoint aus (neu, intern)
- Bei build_failed: liest tsc-Fehler, erstellt Fix-Task, wiederholt 1x
- Gibt kompaktes Ergebnis zurück

### Builder bekommt eigene curl-Fähigkeiten

Neue Datei: `server/src/lib/opusSelfTest.ts`

```typescript
// Der Builder kann sich selbst testen — kein externer curl nötig
export async function selfVerify(checks: Array<{
  method: 'GET' | 'POST';
  path: string;          // z.B. '/api/builder/opus-bridge/pipeline-info'
  expectStatus?: number;
  expectBody?: string;   // Substring-Match
}>): Promise<VerifyResult[]>
```

Das eliminiert Claudes curl-Calls komplett. Der Builder testet sich selbst.

---

## Drei Wege zum Commit (Stand Session 6)

### 1. Roundtable-Pfad (Reviews, Architektur)
```
Task → Scout → Roundtable (3 KIs, max 4 Runden) → @PATCH → GitHub → Commit
```
Kosten: ~$0.10-0.20 | Verifiziert: unanimous, 2 Runden, 1043 Tokens

### 2. Decomposer-Direct-Pfad (Features, schnell) ✅ NEU
```
Task → Scout → Decompose(5x$0) → Swarm → Meister → GitHub → Commit
```
Parameter: `useDecomposer: true` in /execute
Kosten: ~$0.02-0.05 | Verifiziert: getTaskSummary auto-committed, 432 Tokens

### 3. Direct Push (manuelle Fixes von Claude)
```
Claude → /push → GitHub Action → Commit
```
Kein LLM, nur Datei-Überschreibung. Limit: <10KB Payload.

---

## Alle Endpoints (29)

| # | Methode | Pfad | Beschreibung |
|---|---------|------|-------------|
| 1 | POST | /execute | Task ausführen (Scout→Roundtable→Patch) |
| 2 | GET | /observe/:id | Task-Röntgenblick |
| 3 | POST | /override/:id | approve/block/retry/delete |
| 4 | POST | /chain | Multi-Task Kette |
| 5 | GET | /audit | Statistiken + Error Cards |
| 6 | POST | /worker-direct | Modell direkt ansprechen |
| 7 | GET | /memory | 3-Schichten Builder Memory |
| 8 | POST | /reset-session | Budget-Session zurücksetzen |
| 9 | GET | /worker-stats | Worker-Qualität aggregiert |
| 10 | POST | /swarm | Worker-Swarm direkt |
| 11 | POST | /push | Dateien direkt committen |
| 12 | GET | /render/status | Deploy-Status + Server-Info |
| 13 | POST | /render/redeploy | Render-Deployment triggern |
| 14 | GET | /render/env | Env-Vars auflisten (Keys only) |
| 15 | PUT | /render/env/:key | Env-Var setzen |
| 16 | POST | /decompose | Dry-Run Schnittplan ($0) |
| 17 | GET | /pipeline-info | Pipeline-Metadaten |
| 18 | GET | /session-info | Session-Status + Uptime |
| 19 | GET | /standup | Daily Standup Report ($0) |
| 20 | POST | /standup/cleanup | Invalide Worker-Scores entfernen |
| 21-29 | | (legacy) | execute variants, deploy-status, health |

Auth für alle: `?opus_token=opus-bridge-2026-geheim`

---

## Decomposer Pipeline v1.0

7 Stufen, 5 davon $0:

```
① GRAPH SCAN ($0)    — Architecture Graph: Abhängigkeiten, Seams, Forbidden Zones
② FILE ANALYSIS ($0) — Semantische Blöcke: imports, types, functions, routes
③ CUT PLAN ($0)      — CutUnits max ~120 Zeilen, Anker setzen
④ WORKER MATCH ($0)  — Bester Worker aus DB-Scores + Complexity MAP
⑤ SWARM ($$$)        — Worker bearbeiten CutUnits parallel
⑥ SMART MERGE ($0)   — Anker-basiert zusammensetzen, Import-Dedup
⑦ MEISTER ($$$)      — Multi-Meister-Rat validiert
```

### Auto-Decomposer
Wenn ein @PATCH eine >200-Zeilen-Datei betrifft, wird automatisch
durch die Pipeline geroutet. Roundtable-Patch wird zur Spezifikation
für die Worker. Safe-Overwrite wendet SEARCH/REPLACE in-memory an.

---

## Alle Dateien der Opus-Bridge (19 Dateien)

```
server/src/routes/opusBridge.ts           — 29 Endpoints (700+ Zeilen)
server/src/lib/opusBridgeAuth.ts          — Token-Auth
server/src/lib/opusBridgeController.ts    — executeTask() + getTaskSummary()
server/src/lib/opusChainController.ts     — runChain()
server/src/lib/opusChatPool.ts            — ChatPool CRUD
server/src/lib/opusScoutRunner.ts         — 4 Scouts parallel
server/src/lib/opusRoundtable.ts          — Roundtable + @READ + Validator
server/src/lib/opusGraphIntegration.ts    — Graph lesen/schreiben
server/src/lib/opusPulseCrush.ts          — Pulse-Crush (Ambient/Case)
server/src/lib/opusVerification.ts        — Post-Deploy Tests
server/src/lib/opusErrorLearning.ts       — Error-Card Generierung
server/src/lib/opusBudgetGate.ts          — Session Budget
server/src/lib/opusDecomposer.ts          — 7-Stufen Pipeline (725 Zeilen)
server/src/lib/opusDailyStandup.ts        — Worker-Performance (270 Zeilen)
server/src/lib/opusRenderBridge.ts        — Render API Controller
server/src/lib/opusWorkerSwarm.ts         — Worker-Swarm + Meister (650 Zeilen)
server/src/lib/builderGithubBridge.ts     — GitHub Action Trigger
server/src/lib/builderBdlParser.ts        — BDL Parser
server/src/lib/builderPatchExecutor.ts    — Patch SEARCH/REPLACE
```

---

## Provider-Konfiguration

| Provider | Model | Rolle | $/1M In/Out |
|----------|-------|-------|-------------|
| anthropic | claude-opus-4-6 | Meister | $5/$25 |
| anthropic | claude-sonnet-4-6 | Roundtable Writer | $3/$15 |
| openai | gpt-5.4 | Roundtable Kritiker | $2.50/$15 |
| zhipu | glm-5-turbo | Roundtable Bug-Finder | $0.96/$3.20 |
| zhipu | glm-4.7-flash | Scout (FREE) | FREE |
| google | gemini-3-flash-preview | Scout | $0.50/$3 |
| xai | grok-4-1-fast | Scout | $0.20/$0.50 |
| deepseek | deepseek-chat | Worker | $0.28/$0.42 |
| openrouter | minimax-m2.7 | Worker + Meister | $0.30/$1.20 |
| openrouter | kimi-k2.5 | Worker | $0.60/$2.80 |
| openrouter | qwen3.6-plus | Worker (schwach) | ~$0.10 |

Provider-Timeout: 90s (AbortSignal.timeout)

---

## Worker-Ranking (Stand 08.04.2026)

```
Worker      avg   recent  tasks  trend
deepseek    50.6   50.6    10    stable
minimax     49.0   44.3    16    declining
sonnet      46.3   46.3     3    stable
kimi        44.7   44.7     7    stable
qwen        17.8   17.8     6    stable ← schwach
```

---

## Render-Kontrolle

Endpoints live. Auth: opus_token.
- `GET /render/status` — Deploy + Server
- `POST /render/redeploy` — Deployment triggern
- `GET /render/env` — Keys auflisten
- `PUT /render/env/:key` — Var setzen (critical keys geschützt)

Env-Vars auf Render:
- RENDER_API_KEY: gesetzt
- RENDER_SERVICE_ID: srv-d69537c9c44c7384tl50
- GITHUB_PAT: gesetzt (nicht in Dateien speichern!)

---

## Bekannte Limits / Offene Punkte

### Tool-Limit (HÖCHSTE PRIORITÄT)
Claude erreicht Rate-Limit in claude.ai durch viele bash/curl-Calls.
Fix: POST /build Endpoint (Builder-Proxy, siehe oben).

### Multi-File Decomposer
Noch nicht E2E getestet mit 2-3 Dateien gleichzeitig.
Dry-Run funktioniert (4 CutUnits über 2 Dateien).

### Architecture Graph
Opus-Bridge Dateien sind noch nicht als Nodes im Graph.
Decomposer bekommt dadurch keinen Graph-Kontext für Builder-eigene Dateien.

### Push Payload-Limit
GitHub repository_dispatch hat ~10KB Limit.
Größere Pushes: git push mit GITHUB_PAT oder einzeln nacheinander.

---

## Commit-Historie Sessions 4-6

```text
99a5f9a feat(builder): auto-applied (getTaskSummary via Decomposer E2E)
8fb364f fix: provider timeout 90s
f6be7df fix: cleanupInvalidScores export
e842a9e feat: provider timeout, worker MAP, daily standup, handoff S5
4a32085 feat(builder): auto-applied (getRecommendedWriter)
bee094f feat: useDecomposer direct mode
31a69b8 feat: getWorkerRanking() + safe in-memory patch
822c7f9 docs: session 4 handoff
88dd0f7 feat(builder): auto-applied (session-info)
28d6da6 feat(builder): auto-applied (pipeline-info)
6595c77 fix: smart file truncation (head+tail) 25K
e16e1f2 fix(S2): auto-decomposer, remove @ASSIGN
083ee47 feat(S2): decomposer pipeline (725 Zeilen)
4e19886 feat: /push endpoint
dbd24ce feat(S2): Roundtable→Swarm @ASSIGN delegation
983d790 fix: worker name score parsing
```

---

## Auth / Zugang

```
Opus-Bridge:    ?opus_token=opus-bridge-2026-geheim
Render API:     (auf Render als RENDER_API_KEY)
GitHub PAT:     (auf Render als GITHUB_PAT)
Service ID:     srv-d69537c9c44c7384tl50
Builder UI:     soulmatch-1.onrender.com/builder?token=builder-2026-geheim
```

---

## Nächste Schritte (priorisiert)

1. **POST /build Endpoint** — All-in-One Builder-Proxy (1 Call statt 20)
   - Intern: execute → deploy-poll → self-verify → auto-retry
   - Eliminiert Tool-Limit-Problem komplett
2. **opusSelfTest.ts** — Builder testet sich selbst (internes fetch)
3. **Multi-File Decomposer E2E** — 2-3 Dateien gleichzeitig
4. **Architecture Graph erweitern** — Builder-Dateien als Nodes
5. **Push-Chunking** — Große Payloads einzeln senden
