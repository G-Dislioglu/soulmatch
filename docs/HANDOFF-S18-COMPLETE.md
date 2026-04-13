# HANDOFF — S18 Complete: Auth-Fix + UI-Buttons + Pipeline-Durchbruch
# Stand: 13.04.2026, ~07:30

## WAS HEUTE GEBAUT WURDE (S18)

### Deployed & Verifiziert

| # | Feature | Status |
|---|---------|--------|
| 1 | `/maya/action` Proxy Auth — OPUS_BRIDGE_SECRET statt User-Token | ✅ Deployed, verifiziert |
| 2 | Cascade Delete — alle 8 FK-Tabellen in Override + neuer DELETE /tasks/:id | ✅ Deployed |
| 3 | `cancel` Action im Override-Endpoint (zusaetzlich zu block/retry/delete) | ✅ Deployed |
| 4 | Cancel (✕) + Delete (🗑) Buttons in `/maya` Sidebar | ✅ Deployed |
| 5 | Cancel (✕) + Delete (🗑) Buttons in `/builder` Task-Liste | ✅ Deployed |
| 6 | `/builder` Token-Validation via `/maya/context` statt opus-bridge | ✅ Deployed, Tasks laden |
| 7 | `/builder` Initial Load + localStorage Token | ✅ Deployed |
| 8 | Gemini → Maya Chat Umbenennung | ✅ Deployed |
| 9 | Stale-Detector: 10 Statuse statt 3 | ✅ Deployed |
| 10 | **File-Reader GitHub API Fallback** (Roundtable @READ) | ✅ Deployed, getestet |
| 11 | **Erster erfolgreicher Pipeline-Loop** (getTaskStats) | ✅ Commit 38ea269 |
| 12 | Encoding-Fix: Ausfuehren-Button + Guercan-Label Unicode | ✅ Deployed |
| 13 | SESSION-STATE.md auf S18 aktualisiert | ✅ Deployed |
| 14 | Task-DB aufgeraeumt (50 Tasks, 0 non-done) | ✅ Done |

### Pipeline-Durchbruch: Erster Erfolgreicher Loop

Task: getTaskStats() in builderMetrics.ts
Dauer: 6.6 Minuten (Pipeline-Modus)
Ergebnis: Sauberes SQL mit COUNT(*) FILTER, async, korrekte Typen
Commit: 38ea269

Ablauf: Maya Chat → Task Creation → Pipeline-Modus → Scouts (4 Dateien) → Distiller → Council (Roundtable mit @READ via GitHub API) → Worker → TSC ✅ → Push → Deploy → Done

**Der Schluessel war der File-Reader GitHub API Fallback** — vorher scheiterte jeder Task der @READ brauchte, weil Render keine TS-Quellen auf Disk hat.

---

## ENTDECKTE UND BEHOBENE BUGS (S18)

### Bug 1: /build Unauthorized — ✅ BEHOBEN
**Problem:** /maya/action Proxy sendete falschen Token-Namen (`token` statt `opus_token`) und falschen Token-Wert (User-Token statt OPUS_BRIDGE_SECRET).
**Fix:** Proxy liest `process.env.OPUS_BRIDGE_SECRET` fuer opus-bridge-Routen, sendet als `opus_token` + `Authorization: Bearer`.

### Bug 2: DELETE scheitert an FK-Constraints — ✅ BEHOBEN
**Problem:** `DELETE /tasks/:id` fehlte komplett. Override-Delete fehlten `builderWorkerScores` + `builderErrorCards` Tabellen.
**Fix:** Neuer `DELETE /api/builder/tasks/:id` mit Cascade fuer alle 8 FK-Tabellen. Override-Delete ebenso erweitert.

### Bug 3: /builder zeigt 0 Tasks — ✅ BEHOBEN
**Problem:** `validateBuilderToken()` pruefte gegen `/opus-bridge/pipeline-info` (erwartet OPUS_BRIDGE_SECRET), aber URL hat `builder-2026-geheim` (BUILDER_SECRET). Kein Initial-Load-Effect nach Auth.
**Fix:** Validation gegen `/maya/context`. localStorage Fallback. useEffect fuer Initial-Load.

### Bug 4: File-Reader @READ scheitert auf Render — ✅ BEHOBEN
**Problem:** `resolveReadCommands()` in `opusRoundtable.ts` liest per `fs.readFileSync` — auf Render existieren keine TS-Quellen. Council bekommt "Datei nicht gefunden" und blockt.
**Fix:** Async Fallback auf GitHub Contents API (fetchFileFromGitHub). Lokal zuerst, GitHub als Fallback.

### Bug 5: Stale-Detector deckt nur 3 Statuse ab — ✅ BEHOBEN
**Problem:** Nur `planning`, `consensus`, `push_candidate`. Fehlten: `classifying`, `scouting`, `scouted`, `swarm`, `no_consensus`, `review_needed`, `applying`.
**Fix:** STALE_THRESHOLDS auf 10 Statuse erweitert.

### Bug 6: Ausfuehren-Button Unicode-Escape — ✅ BEHOBEN
**Problem:** JSX-Text `Ausf\u00FChren` wird literal angezeigt statt als "Ausfuehren" (Unicode-Escapes in JSX-Text werden nicht aufgeloest).
**Fix:** Echte UTF-8 Zeichen statt Escape-Sequenzen.

---

## GEAENDERTE DATEIEN (S18)

### Server
- `server/src/routes/builder.ts` — Proxy Auth Fix, DELETE /tasks/:id, isOverride in ALLOWED
- `server/src/routes/opusBridge.ts` — cancel Action, Cascade Delete erweitert
- `server/src/lib/opusRoundtable.ts` — async resolveReadCommands + fetchFileFromGitHub
- `server/src/lib/builderStaleDetector.ts` — 10 Statuse statt 3
- `server/src/lib/builderMetrics.ts` — getTaskStats() (auto-pushed durch Pipeline)
- `docs/SESSION-STATE.md` — S18 aktualisiert

### Client
- `client/src/modules/M16_builder/hooks/useMayaApi.ts` — cancelTask + deleteTask
- `client/src/modules/M16_builder/ui/BuilderStudioPage.tsx` — Token-Fix, Initial Load, Maya Labels, Cancel/Delete
- `client/src/modules/M16_builder/ui/MayaDashboard.tsx` — Cancel/Delete Sidebar, Encoding-Fix

---

## ARCHITEKTUR NACH S18

```
User ←→ /maya (MayaDashboard) oder /builder (BuilderStudioPage)
              ↓
         Maya Chat (builderFusionChat.ts)
              ↓ determineBuildMode()
         ┌────────────┬──────────────┐
         │ QUICK      │ PIPELINE     │
         │ executeTask│ runBuild     │ ← Auth gefixt ✅
         │ ✅ WORKS   │ ✅ WORKS     │ ← File-Reader gefixt ✅
         │            │              │
         │ Scope(448) │ Scout (Pool) │
         │  → Worker  │  → Distiller │ ← Intent-Treue (S17)
         │  → JSON OW │  → Council   │ ← @READ via GitHub API ✅
         │  → TSC     │  → Worker    │
         │  → Push    │  → TSC [×3]  │
         │  → Deploy  │  → Push      │
         └─────┬──────┴──────┬───────┘
               │             │
               └──── ↓ ──────┘
         Post-Task-Loop (agentHabitat.ts)
           → updateAgentProfiles()
           → reflectOnTask()
           → buildAgentBrief()

         Autonome Systeme:
           → builderStaleDetector.ts  ← 10 Statuse ✅
           → cancel intent + UI       ← Beide Seiten ✅
           → auto-index-regen         ← Via /git-push, keine Zombies
```

---

## TECHNISCHE DETAILS

- **Repo:** github.com/G-Dislioglu/soulmatch, Branch main
- **Live:** soulmatch-1.onrender.com
- **Auth:** token=builder-2026-geheim, opus_token=opus-bridge-2026-geheim
- **Task-DB:** ~50 Tasks, alle done
- **Letzter Pipeline-Commit:** 38ea269 (getTaskStats)

---

## OFFENE TODOS (priorisiert)

### Sofort (S19)
1. **`/builder` + `/maya` konsolidieren:** Guercan bevorzugt `/builder` Layout. Pool-Config, Continuity Notes, Memory Episodes von `/maya` rueberholen.
2. **Task-Detail-View fixen:** "undefined" und "Kein Dialog" in `/builder` UI.
3. **Pipeline weiter testen:** Verschiedene Task-Typen, Edge Cases, Fehler-Szenarien.

### Naechste Woche
4. **Nachdenker bei echtem Fehler testen:** Kein Task hat bisher gefailt nach dem @READ-Fix.
5. **Crush-Score verbessern:** Aktuell ~52, Ziel 70+.
6. **Audio-System:** Buffered text+audio sync.
7. **`/migrate` Runtime-Fix:** drizzle-kit als Dependency.
8. **orchestrateTask entfernen:** Legacy-Code.

### Perspektivisch
9. **Nachdenker-Aggregation:** Learnings ueber mehrere Tasks sammeln.
10. **AICOS-Card-Integration:** Explorations-Primitive als Card-Typen.
11. **Pipeline-Monitoring UI:** Live-Fortschritt im Chat.

---

## ERKENNTNISSE S18

### Was funktioniert
- **Pipeline-Loop komplett:** Erster erfolgreicher Durchlauf. @READ via GitHub API war der Schluessel.
- **File-Reader Fallback:** Einfacher Fix, riesiger Effekt. ~30 Zeilen neuer Code loesen das groesste Architekturproblem.
- **Proxy Auth:** Server-seitiges Secret fuer interne Calls ist der richtige Ansatz.
- **Stale-Detector:** Faengt jetzt alle stuck-prone Statuse ab.

### Was nicht optimal ist
- **Zwei Builder-Seiten:** `/maya` und `/builder` haben verschiedene Features. Konsolidierung noetig.
- **Pipeline-Modus erzeugt internen Task:** ChatPool des Haupt-Tasks bleibt leer weil executeTask ein separates Task-Objekt nutzt.
- **Pipeline dauert 6.6min:** Akzeptabel, aber Optimierung moeglich.

### Prozess-Lernen
- Token-Auth-Bugs sind heimtueckisch: alles scheint zu funktionieren, aber der falsche Token oder Parameter-Name macht alles kaputt.
- Die meisten "Pipeline-Bugs" waren eigentlich Infrastruktur-Bugs (Auth, File-System, FK-Constraints).
- Screenshots vom User sind Gold wert — ohne Guercans Screenshots haette ich die Buttons auf der falschen Seite gelassen.

---

## IM NAECHSTEN CHAT (S19)

Handoff pasten, dann:
1. `/builder` + `/maya` Konsolidierung (Pool-Config, Notes, Memory nach `/builder`)
2. Task-Detail-View "undefined" fixen
3. Pipeline mit verschiedenen Task-Typen testen
