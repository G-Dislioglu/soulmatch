# HANDOFF S30 — Block 5d V3 + Doppel-Deploy-Fix + Roadmap-Audit

**Datum:** 2026-04-17 (Abendsession)
**Vorgänger:** S29 (kein committed Handoff, nur Memory; davor S25 als letzter committed Handoff)
**Aktueller Repo-Head:** `58887c7`

---

## 1. Geliefert heute

### 1a. Block 5d V3 — Maya-Guide-Figur gehärtet
**Commit:** `a322ac0` — `feat(builder): harden maya guide transitions and drag flow`

Copilot hat die vier V3-Guardrails aus `block-5d-copilot-prompt-v3-crush-gehaertet.md` umgesetzt.
Dateien: `useMayaFigureGuide.ts` (+565), `MayaFigure.tsx` (+164), `BuilderStudioPage.tsx` (−57), `mayaTransitions.ts` (NEU, 40), `maya-highlight.css` (NEU, 31).

- **GR-1 Generation-scoped AbortController** — `beginGeneration()` aborted previous, bumps `generationRef`. Jeder async Pfad via `{ signal: controller.signal }`.
- **GR-2 `transitioncancel` handling** — Beide `transitionend` + `transitioncancel` triggern denselben settle().
- **GR-3 Reduced-motion + rAF stabilization** — microtask settle bei reduced-motion; 3-frame stabilization + 20-frame cap mit DEV-warn.
- **GR-4 Direct DOM transform** — `applyPosition()` schreibt `figureRef.current.style.transform` direkt, kein setState während Drag. 5px Deadzone.

Bonus (waren eigentlich für PR #2 geplant): `onLostPointerCapture` Wiring, Outside-Click Arm-Delay (700ms CLICK_TO_RETURN_ARM_DELAY), adaptive Bubble-Position (above/below/left/right).

**LIVE-PROBE auf Render verifiziert** (alle vier Szenarien grün, Score 95/100):
- A (drag): phase=dragging → transform=translate(Xpx, Ypx), kein React-Rerender, idle nach drop, keine Zurücksprung
- B (rapid re-guide): erster Click→navigating→atTarget bei tasklist mit highlight+bubble, zweiter Click mid-flight → keine hängende Phase, settled atTarget
- C (outside-click): atTarget → Click extern → 1200ms später idle bei (1376, 40), highlight entfernt. Arm-Delay hat initialen Tour-Button-Click korrekt ignoriert
- D (reduced-motion): 250ms nach Tour-Click schon atTarget (bei 600ms transitionDuration unmöglich) → microtask settle greift, `transitionDuration=0`

### 1b. Doppel-Deploy-Bug behoben
**Commit:** `58887c7` — `fix(opus-bridge): remove auto-redeploy from /git-push (fixes double-deploy bug)`

`/git-push` in `opusBridge.ts` (Zeilen 1667–1672) rief zusätzlich `triggerRedeploy()` nach Contents-API-Push.
Kombiniert mit `render-deploy.yml` (GitHub Action auf push-event) ergab das 2–3 Deploys je Commit.

**Empirische Beweiskette aus Deploy-History:**
- `c22b00e` (buggy /git-push): 2 Deploys
- `a322ac0` (manueller git push): 1 Deploy ← Kontrollgruppe
- `58887c7` (Fix-Commit via letzter buggy /git-push): 2 Deploys (self-terminating)

Zukünftige `/git-push`-Läufe: 1 Deploy pro Commit. Für explizite manuelle Redeploys bleibt `POST /render/redeploy` erhalten.

### 1c. Side-Finding: „DNS cache overflow" 503
`/api/health` und `/api/builder/opus-bridge/health` lieferten zweimal `DNS cache overflow` Response-Body mit HTTP 503. Tritt intermittent auf, verschwindet nach Service-Restart (jedem Deploy). Hypothese: v8-DNS-Cache des Node-Prozesses läuft voll.

Fix-Kandidaten für spätere Session: `dns.setDefaultResultOrder`, periodisches Cache-Flush, oder `undici`-Dispatcher mit begrenztem Pool. Nicht dringend, aber latent.

---

## 2. Roadmap-Audit gegen 2026-04-12-Handoff

Vollständige Code-Verifikation der sieben Plan-Schritte gegen den aktuellen Repo-Stand:

| # | Plan-Schritt | Status | Beleg |
|---|-------------|--------|-------|
| 1 | Docs aufräumen + SESSION-STATE | **Teilweise** | Archivierung (10 Files) durch; SESSION-STATE war auf S24 (jetzt durch diesen Block auf S30) |
| 2 | Maya-Routing Quick/Pipeline | **Voll** | `determineBuildMode()` in `builderFusionChat.ts`:233, konsumiert in `builderFusionChat.ts`:674 |
| 3 | Council-Rollen (Architekt/Skeptiker/Pragmatiker) | **Voll** | `COUNCIL_ROLES` + `buildCouncilParticipants()` in `opusBridgeController.ts`:98–133, round-robin mapping |
| 4 | Agent Profiles + Post-Task-Loop | **Voll** | `agentHabitat.ts` komplett; `updateAgentProfiles()` in Post-Pipeline-Hook; `builder_agent_profiles` Tabelle in `schema/builder.ts`:183 |
| 5 | Agent Brief Compiler | **Voll** | `buildAgentBrief()` in `agentHabitat.ts`:266, konsumiert in `opusWorkerSwarm.ts`:594 |
| 6 | Auto-Retry bei TSC-Fehler | **80%** | Retry-Loop in `opusBridgeController.ts`:920–980 funktioniert für `decomposer-direct` und `auto-decomposer` Pfade. Lücke: Roundtable-only-Pfad setzt `tscRetryContext=null`, daher kein Retry wenn Council-Patches klein genug bleiben und TSC fehlschlägt |
| 7 | Pipeline-Monitoring UI | **Voll** | `PoolChatWindow.tsx` mit setInterval-Polling pro Pool-Filter; `getChatPoolForTask` Server-Endpoint |

**Denker-Triade Bonus-Befund:**
- Vordenker: `opusVordenker.ts` existiert, angebunden an `/opus-feature` Pipeline
- Mitdenker: deferred v4.1 (wie Memory sagt)
- Nachdenker: `reflectOnTask()` in `agentHabitat.ts`:184, GLM-5-Turbo, läuft nach jedem Worker-Task

**Pipeline-Executor-Pfade (Stand S30):**
- `/opus-task` — Quick-Modus, deterministischer Scope, ~30–90s (legacy label, aktiv)
- `/opus-feature` — kanonische volle Pipeline mit Scout→Destillierer→Council→Worker→TSC, inklusive Denker-Triade
- `/build` — legacy, wrappt `executeTask()` in `opusBridgeController.ts`

---

## 3. Drift-Befunde zwischen Memory/Docs und Code-Realität

1. **Card-Count:** Memory sagt „101+", AICOS-Registry README sagt 94 (17 errors + 70 solutions + 7 meta). Unklar ob Delta durch neue Cards oder durch Zähl-Methodik.
2. **Bluepilot-Priorität:** Memory-Eintrag 11 (NÄCHSTER GROSSER SCHRITT nach Maya: Bluepilot Phase 1) widerspricht maya-core STATE.md „Not Now: Bluepilot als aktiver Dev-Execution-Folgeblock". Maya-Core-Wahrheit hat Vorrang.
3. **STATE.md `current_repo_head`:** war auf `505b2db` (existiert nicht im Repo). Jetzt durch diesen Block auf `58887c7`.
4. **SESSION-STATE:** war auf S24, offene Tasks sind 2.5 Wochen alt und teilweise längst erledigt (z.B. Agent Profiles). Jetzt durch diesen Block auf S30.
5. **S26–S29 haben keine Handoff-Files** — nur Memory-Einträge. Das ist eine strukturelle Lücke: zwischen HANDOFF-S25 (2026-04-15) und diesem HANDOFF-S30 liegen 4 Sessions ohne Doku. Memory hat Einträge für S28 (Opus-Bridge-Stand) und S30 (aktualisiert), aber nicht für S26/S27/S29 einzeln.
6. **Zwei parallel laufende Arbeitsstile:** AICOS-Registry (formalistisch, proposal-only, anti-drift) und Soulmatch/Maya-Core (pragmatisch-operativ). Die AICOS-Governance-Laws (LAW-01 bis LAW-08) werden in Soulmatch nicht operativ konsumiert — das ist keine konkrete Bug-Diagnose, aber eine strukturelle Beobachtung.

---

## 4. Nächste valide Blöcke (Priorisierung)

**A. Doppel-Deploy-Verifikation durch natürlichen nächsten Push** — erster `/git-push` nach `58887c7` sollte nur 1 Deploy produzieren. Finale empirische Bestätigung. Passt organisch zu jedem kommenden Feature-Push.

**B. TSC-Retry Roundtable-Pfad schließen** — Option B aus vorhin: im Roundtable-only-Pfad einen `tscRetryContext` aus den Roundtable-Patches synthetisieren und an den Decomposer delegieren. ~30 Min, minimal-invasiv. Schließt Schritt 6 auf 100%.

**C. Block 5d PR #2 — Context-Split** — Maya-Guide via React Context statt Prop-Drilling. `lostpointercapture` und Click-Debounce hat Copilot schon in PR #1 mitgenommen, also ist PR #2 deutlich dünner geworden. ~45 Min.

**D. Maya-Core nächsten Block schneiden** — seit `a7385b5` (2026-04-05) wartet maya-core auf expliziten nächsten Produktblock. RADAR.md hat viele kleine Doku-/Review-Kandidaten, aber keinen scharf gewählten Primärblock.

**E. DNS-cache-overflow Hardening** — undici-Dispatcher + `dns.setDefaultResultOrder`. ~30 Min. Nicht dringend, aber Nebenbefund sollte nicht vergessen werden.

**Nicht-Blöcke (geparkt, wie bisher):**
- Bluepilot Phase 1 (maya-core STATE.md Not-Now)
- Desktop-Maya Co-Pilot (Memory-Eintrag 26 geparkt)
- AICOS-Soulmatch-Governance-Brücke (strategisch offen)

---

## 5. Operative Fakten

- Repo: `github.com/G-Dislioglu/soulmatch`, Branch `main`, Head `58887c7`
- Live: `soulmatch-1.onrender.com`, Commit `58887c7` bestätigt via `/api/health`
- Auth: `builder_token=builder-2026-geheim`, `opus_token=opus-bridge-2026-geheim`
- Push-Pfade:
  - Manueller `git push origin main` → GitHub Action → single Render deploy (sauberstes Muster)
  - `POST /api/builder/opus-bridge/git-push` → Contents API PUT → GitHub Action → single Render deploy (ab S30-Fix auch sauber)
  - `POST /api/builder/opus-bridge/render/redeploy` → explicit Render API redeploy (nur für manuelle Notfall-Deploys)
- TSC-Pflicht vor Push: `cd client && npx tsc -b` und `cd server && npx tsc --noEmit` (Render ist strikt mit noUnusedParameters)
- Deploy-Dauer ~3 Min inkl. Build
- Render-Service ID: `srv-d69537c9c44c7384tl50`

## 6. Offene Memory-Diskrepanzen zu korrigieren

- Eintrag 17 (AICOS 101+ Cards) → tatsächlich 94 laut Registry-README
- Eintrag 11 (Bluepilot als nächster großer Schritt) → Maya-Core STATE sagt explizit Not-Now
