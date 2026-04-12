# OPUS-BRIDGE HANDOFF — Stand 08. April 2026, Session 7

## Zusammenfassung

Session 7: Builder stabilisiert. REPAIR PIPELINE zu 87% abgeschlossen.
POST /build (All-in-One Builder-Proxy) live + E2E verifiziert.
Worker-Prompt von Full-File auf SEARCH/REPLACE-only umgestellt (8x Token-Reduktion).
62 Zombie-Tasks bereinigt. Architecture Graph mit 42 Nodes befüllt.

Repo: github.com/G-Dislioglu/soulmatch | Live: soulmatch-1.onrender.com
Letzter verifizierter Stand: 10/10 Core-Endpoints ✅

---

## KRITISCH: Regeln für nächste Session

### Claude nutzt IMMER /build für Code-Änderungen
```
POST /build { instruction: "...", scope: [...], skipDeploy: true }
```
NIEMALS manuell clone → edit → push. 1-2 Calls pro Feature.
Bei Timeout-Risiko: skipDeploy:true, dann /self-test separat.

### Alle Endpoints (33)

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
| 9 | GET | /session-info | Session-Status + Uptime |
| 10 | GET | /worker-stats | Worker-Qualität aggregiert |
| 11 | POST | /swarm | Worker-Swarm direkt |
| 12 | POST | /push | Dateien committen (jetzt mit Chunking!) |
| 13 | GET | /render/status | Deploy-Status + Server-Info |
| 14 | POST | /render/redeploy | Render-Deployment triggern |
| 15 | GET | /render/env | Env-Vars auflisten |
| 16 | PUT | /render/env/:key | Env-Var setzen |
| 17 | POST | /decompose | Dry-Run Schnittplan ($0) |
| 18 | GET | /pipeline-info | Pipeline-Metadaten |
| 19 | GET | /standup | Daily Standup Report ($0) |
| 20 | POST | /standup/cleanup | Invalide Worker-Scores entfernen |
| 21 | POST | /build | ⭐ All-in-One: execute→deploy→verify→retry |
| 22 | POST | /self-test | Builder testet sich selbst (3ms intern) |
| 23 | POST | /cleanup | Stuck Tasks >2h → cancelled |
| 24-33 | | (legacy) | execute variants, deploy-status, health |

Auth: `?opus_token=opus-bridge-2026-geheim`

---

## REPAIR PIPELINE — Status

### Abgeschlossen ✅

| # | Fix | Worker | Score | Ergebnis |
|---|-----|--------|-------|----------|
| 01 | Worker-Prompt SEARCH/REPLACE-only | minimax | 92 | 8x Token-Reduktion, Project DNA nur opus/sonnet |
| 02 | Stuck Tasks Cleanup Endpoint | deepseek | 85 | POST /cleanup live, 62 Zombies bereinigt |
| 03 | Architecture Graph | Claude | — | 42 Nodes, 28 Edges (vorher: leer für Builder) |
| 04 | Push Chunking | deepseek | 90 | triggerGithubActionChunked + /push verdrahtet |
| 05 | Verification-Katalog | kimi | 90 | 10 STANDARD_TESTS (vorher: 3) |

### Offen ❌

| # | Fix | Problem | Lösung |
|---|-----|---------|--------|
| 06 | GPT-5 temperature in openai-test | Datei 66KB, Worker sieht Mitte nicht wegen Truncation | FIX-01 verbessern: Truncation muss scope-relevanten Abschnitt einschließen (±30 Zeilen) |
| 07 | 4 tote Dateien löschen | /push kann nicht löschen | Manuell: git rm builderHealthCheck.ts builderPingTest.ts builderTimestamp.ts builderUptime.ts |
| 08 | ~8 Legacy-Dateien (alte Builder v3.2) | Importiert von builderDialogEngine.ts | Nicht kritisch, alle im Graph als Legacy markiert |

### Erkannter Design-Bug in FIX-01
Die Truncation in buildWorkerPrompt() zeigt bei >300 Zeilen nur Zeile 1-50 + letzte 50.
Wenn der zu ändernde Code in der Mitte liegt, sieht der Worker ihn nicht.
**Fix:** Scope-basierte Truncation — zeige ±30 Zeilen um den SEARCH-Bereich statt Anfang+Ende.

---

## Worker-Ranking (aktualisiert nach Session 7)

### Direkt-Test-Scores (via /worker-direct)
| Worker | Score | Stärken |
|--------|-------|---------|
| qwen | 95 | ⭐ Rehabilitiert! Perfekt bei klaren SEARCH/REPLACE Tasks |
| minimax | 92 | Zuverlässig, guter Prompt-Rewriter |
| kimi | 90 | Stark bei Katalog/Struktur-Aufgaben |
| deepseek | 88 | Solide bei DB + Logik, sauberes Chunking |

### System-Scores (aus Worker-Swarm, VOR FIX-01)
| Worker | avg | tasks | trend |
|--------|-----|-------|-------|
| minimax | 51 | 23 | stable |
| deepseek | 46 | 11 | declining |
| sonnet | 46 | 3 | stable |
| kimi | 45 | 7 | stable |
| qwen | 18 | 6 | stable ← unfair, lag am alten Prompt |

**Wichtig:** Die System-Scores sind NICHT vergleichbar mit den Direkt-Test-Scores.
Die System-Scores stammen vom alten Full-File-Prompt der alle Worker benachteiligt hat.
Nach FIX-01 sollten die System-Scores bei neuen Tasks deutlich steigen.

---

## Audit-Stand nach Cleanup

```
done: 35
cancelled: 62 (bereinigt)
error: 6 (alte permanente Fehler)
applying: 2 (letzte FIX-06 Versuche, <2h)
```

---

## Dateien der Opus-Bridge (21 aktive + 2 neue)

```
server/src/routes/opusBridge.ts           — 33 Endpoints (780+ Zeilen)
server/src/lib/opusBridgeAuth.ts          — Token-Auth
server/src/lib/opusBridgeController.ts    — executeTask() + getTaskSummary()
server/src/lib/opusBuildPipeline.ts       — ⭐ NEU: All-in-One /build Pipeline
server/src/lib/opusSelfTest.ts            — ⭐ NEU: Self-Test (interner fetch)
server/src/lib/opusChainController.ts     — runChain()
server/src/lib/opusChatPool.ts            — ChatPool CRUD
server/src/lib/opusScoutRunner.ts         — 4 Scouts parallel
server/src/lib/opusRoundtable.ts          — Roundtable + @READ + Validator
server/src/lib/opusGraphIntegration.ts    — Graph lesen/schreiben
server/src/lib/opusPulseCrush.ts          — Pulse-Crush
server/src/lib/opusVerification.ts        — 10 STANDARD_TESTS (erweitert)
server/src/lib/opusErrorLearning.ts       — Error-Card Generierung
server/src/lib/opusBudgetGate.ts          — Session Budget
server/src/lib/opusDecomposer.ts          — 7-Stufen Pipeline (725 Zeilen)
server/src/lib/opusDailyStandup.ts        — Worker-Performance + recentTaskTitles
server/src/lib/opusRenderBridge.ts        — Render API Controller
server/src/lib/opusWorkerSwarm.ts         — Worker-Swarm (SEARCH/REPLACE-only Prompt)
server/src/lib/builderGithubBridge.ts     — GitHub + triggerGithubActionChunked
server/src/lib/builderBdlParser.ts        — BDL Parser
server/src/lib/builderPatchExecutor.ts    — Patch SEARCH/REPLACE
server/src/lib/builderMemory.ts           — 3-Schichten Memory

architecture/trunks/soulmatch.json        — 42 Nodes (inkl. Builder)
architecture/edges.json                   — 28 Edges
```

---

## Provider-Konfiguration (unverändert)

| Provider | Model | Rolle | $/1M In/Out |
|----------|-------|-------|-------------|
| anthropic | claude-opus-4-6 | Meister | $5/$25 |
| anthropic | claude-sonnet-4-6 | Roundtable Writer | $3/$15 |
| openai | gpt-5.4 | Roundtable Kritiker | $2.50/$15 |
| zhipu | glm-4.7-flash | Scout (FREE) | FREE |
| google | gemini-3-flash-preview | Scout | $0.50/$3 |
| xai | grok-4-1-fast | Scout | $0.20/$0.50 |
| deepseek | deepseek-chat | Worker | $0.28/$0.42 |
| openrouter | minimax-m2.7 | Worker + Meister | $0.30/$1.20 |
| openrouter | kimi-k2.5 | Worker | $0.60/$2.80 |
| openrouter | qwen3.6-plus | Worker (rehabilitiert) | ~$0.10 |

---

## Nächste Schritte (priorisiert)

1. **FIX-01 verbessern** — Scope-basierte Truncation statt Anfang+Ende
   - Dann FIX-06 (openai-test temperature) nochmal versuchen
2. **Worker-Benchmark** — Gleiche Aufgabe an alle 5 Worker senden, neue Scores nach FIX-01
3. **Tote Dateien** — git rm für 4 Dateien (manuell oder via Agent)
4. **Erstes echtes Soulmatch-Feature** per /build bauen (z.B. Credits-Dashboard)
5. **Multi-File Decomposer E2E** — 2-3 Dateien gleichzeitig testen

---

## Auth / Zugang

```
Opus-Bridge:    ?opus_token=opus-bridge-2026-geheim
Builder UI:     soulmatch-1.onrender.com/builder?token=builder-2026-geheim
Render Service: srv-d69537c9c44c7384tl50
```
