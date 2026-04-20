# HANDOFF S22-S29 (rekonstruiert aus Commit-Historie)

**Erstellt:** 2026-04-20 abends, Session S35
**Grund:** Die Sessions S22, S23, S26, S27, S28, S29 hatten keine committeten Handoff-Dokumente (Session-Historie-Lücke, in jedem neueren Handoff erwähnt). Diese Lücke wurde heute im Backlog-Audit sichtbar und schließlich geschlossen.

**Methode:** Rekonstruktion aus `git log` der jeweiligen Zeiträume zwischen den umgebenden (vorhandenen) Handoffs. Granularität: Haupt-Feature-Commits, gefiltert auf `feat(...)`, `fix(...)`, `docs(...)`. Regen-Index-Commits und Auto-Applied-Patches sind als Rauschen ausgeschlossen, bleiben aber in Git als Artefakt sichtbar.

**Vertrauen:** 70/100. Diese Rekonstruktion ist ehrlich aus Commit-Nachrichten abgeleitet, kann aber nicht den gleichen Kontext-Wert haben wie ein zeitnah verfasster Handoff. Sie dient zur **Navigation**: damit zukünftige Sessions nicht im Nichts stehen wenn sie zurückblicken wollen. Für Detail-Fragen zum damaligen Zustand ist `git show <sha>` der Wahrheitsspeicher.

---

## S22 — 2026-04-14 morgens bis nachmittags (vor dem S23-Handoff um 19:23 Uhr)

**Datumsanker:** Zwischen S21-Handoff (13.04 22:58) und S23-Handoff (14.04 19:23).

**Thema:** Patrol-Infrastruktur-Aufbau und Read-File-/Anchor-Patch-Fundament.

**Wichtige Commits:**

- `8d3e2e5` — `feat(builder): add read-file + anchor-patch + ls internals (ChatGPT Ebene A)` — Einführung dreier innerer Builder-Endpoints für Dateizugriff
- `bd18ed0` — `feat(builder): internals bootstrap with lazy dynamic import`
- `1b46864` — `feat(builder): mount internals bootstrap via opusMeisterPlan import`
- `463a1bc` — `feat(patrol): self-mounting patrol routes on opusBridgeRouter` — Patrol-Routes mounten sich selbst
- `c1c67b3` — `feat(patrol): lazy-mount patrol routes via dynamic import (no circular dep)` — Zirkulär-Dependencies aufgelöst via Lazy Import
- `c0dec32` — `feat(patrol): add diagnostic patrol API for schema discovery`
- `0d98c04` + `1f171c4` — `/read-file` Endpoint für Pipeline-Debugging
- `5cad776` — `feat(patrol): add PatrolConsole UI component with severity filter and finding details`
- `8d4bbca` — PatrolConsole vom M16_builder-Barrel exportiert
- Mehrere `fix: add @ts-nocheck to patrolMount/fileReader` (`5b01f3b`, `5433815`, `5cec4bc`, `2361300`) — TypeScript Build repariert
- `d1b0e57` — `feat(builder): add patrol console route and lift swarm token limits`
- `c7f53e0` — `feat(builder): add patrol status and findings endpoints`
- `fa35086` — Cleanup veralteter Patrol-Route-Files

**Kernaussage:** S22 hat den Patrol-Layer strukturell installiert (self-mounting, lazy import, diagnostic API, UI-Komponente) und parallel die „Internals"-Ebene für direkten Dateizugriff eingeführt. Einige Zirkulärdependenz-Fallstricke führten zu mehreren Fix-Runden.

---

## S23 — 2026-04-14 abends (Handoff-Datei `undefined` im Repo-Root)

**Status:** **Handoff existiert, aber unter falschem Dateinamen** — Commit `6ff65f9` hat die Datei fälschlich als `undefined` (statt `docs/HANDOFF-S23.md`) abgelegt, vermutlich ein Bridge-Push-Bug der den Dateinamen-Feld nicht korrekt belegt hat. Die Datei `/undefined` liegt heute noch im Repo-Root und enthält den vollständigen S23-Inhalt. Sollte in einer späteren Session verschoben/umbenannt und `undefined` entfernt werden.

**Zusammenfassung des Inhalts aus `undefined` (die echte HANDOFF-S23):**

- **Regex-Fix in `looksLikeTaskRequest` (builderFusionChat.ts):** `fueg` → `fuege?`, `.test(normalized)` restored. Commits `767cf32`, `6a7c9ba`.
- **Patrol Backend-Endpoints in opusBridge.ts:** `GET /patrol-status` mit totalFindings, bySeverity, lastRound, triaged, crossConfirmed. `GET /patrol-findings` mit Severity-Filter und Limit. Datenquelle `builder_error_cards`-Tabelle. Commit `c7f53e0`.
- **PatrolConsole UI (PatrolConsole.tsx):** Dark Theme, Severity-Filter, expandierbare Finding-Cards, Deep-Patrol-Trigger pro Finding, Route `/patrol?opus_token=...`, Barrel-Export in `M16_builder/index.ts`.
- **Patrol als 6. Pool in BuilderConfigPanel:** PoolType um `'patrol'` erweitert.
- **Worker Token-Limits auf 100k angehoben** — `config: worker token limits 100k` (Commit `b8a5dc7`).
- **Anchor-Patch-Modul** — `feat(pipeline): add anchor-patch module for surgical edits` (Commit `5e7b2c6`), Smoke-Tests (`2c73a14`), Integration in Worker-Swarm (`8aa8032`).
- **Deep Patrol Trigger** — Button und Backend-Integration für vertiefte Analyse pro Finding.

---

## S26 — 2026-04-15 nachmittags bis nachts (nach S25-Handoff 09:49)

**Thema:** Maya-Director-Control-Path + GLM 5.1 Maya-Brain-Rollout.

**Wichtige Commits:**

- `86d9155` — `feat(builder): add maya director control path` — Fundament für Maya als autonomer Steuerer
- `912ef9e` — `fix(builder): harden director action parsing`
- `b926ac7` — `fix(builder): resolve director read-file paths on render`
- `b040ceb` — `docs(state): sync director live verification`
- `55dc6cb` — `feat(builder): add director thinking and glm51 paths` — GLM 5.1 in den Director-Pfad aufgenommen
- `e935fd5` — `docs(state): sync builder head after director rollout`
- `376e7e9` — `feat(builder): wire maya brain continuity memory` — Continuity Memory als Maya-Brain-Feature
- `cfe68ac` — `fix(builder): surface maya brain mode in ui`
- `ce0b04b` — `feat(builder): maya brain UI + GLM 5.1 pools in live BuilderStudioPage`
- `d946f31` — `chore(deploy): trigger render via verified github workflow`
- `c7356b5` — `chore: remove dead MayaDashboard and unused builder files` — Altlast-Bereinigung
- `ee9e693` — `fix(builder): refresh file index after successful push` — Frühe Version des regen-index-Mechanismus (später in F9/F6 weiterentwickelt)
- `79ca9fc` — `fix(builder): make create mode explicit in opus tasks` — Vorläufer von F6 Hebel α
- `ecb9d4f` — `fix(builder): reject semantically drifted opus candidates` — Judge-Härtung
- `04bf687` — `fix(builder): harden create detection and fallback judge`

**Kernaussage:** S26 war der Maya-Director-Tag. Der Director-Pfad wurde gebaut, gehärtet, mit GLM 5.1 ausgestattet und in der Builder-Studio-UI sichtbar gemacht. Parallel liefen mehrere Härtungs-Fixes in Builder, darunter Vorläufer-Pattern von F6 (Create-Mode-Explizität, Candidate-Drift-Reject).

---

## S27 — 2026-04-16 (ganzer Tag)

**Thema:** Scout-Pool + Distiller-Pool + Worker-Pool-UI (Block 4.6a-c), dann Council-Pool + Patrol-Feed (Block 4.6d-e), Maya-Presence-Shell (Block 5a).

**Wichtige Commits:**

- `6ece7e4` — `feat(builder): scout pool chat window (block 4.6a)`
- `d3c0779` — `fix(builder): authorize scout pool observe call`
- `0d8a908` — `feat(builder): distiller pool + persistent opus token`
- `6386a6b` — `feat(builder): topbar pool popups + worker pool (block 4.6c)`
- `da68fa8` — `fix(builder): pool card score/chat overlap + wider popups (4.6c-fix)`
- `39de532` — `docs(state): sync builder pool popup status`
- `ad1fa42` — `feat(builder): council pool + rename chat→live + wider popups (block 4.6d)`
- `643d343` — `docs(state): sync builder council live feed status`
- `af85374` — `feat(builder): patrol findings feed in session bar (block 4.6e)`
- `9343607` — `docs(state): sync patrol session feed status`
- `40d95ed` — `feat(builder): maya figure + target registry + navigation (block 5)` — Maya als interaktive Figur
- `958b4ad` — `docs(state): sync maya presence shell status`
- `f108854` — `feat(builder): add event-based maya guide triggers`
- `990916c` — `docs(state): sync maya guide trigger status`
- `505b2db` — `feat(builder): add maya chat navigation and voice input`
- `91f3fb0` — `docs(state): sync maya chat navigation status`
- `2817c1c` — `fix(builder): make maya fast mode explicit`
- `4d671f2` — `fix(builder): fall back to read-file for maya director`
- `5e872f6` — `fix(builder): deploy async executor pushes honestly` — früher F9-Vorläufer (Honesty-Thema)
- `36a86ca` — `feat(builder): deterministic related files in worker context`

**Kernaussage:** S27 war der größte UI-Tag: alle fünf Builder-Pools (Scout, Distiller, Worker, Council, Patrol) haben Live-Feed-Karten in der Topbar, und Maya wurde als Figur mit Target-Registry, Navigation und Guide-Triggern eingeführt. Abends kam die Maya-Chat-Navigation plus Voice-Input dazu.

---

## S28 — 2026-04-17 morgens/vormittags (vor der S30-Abendsession)

**Thema:** Council-Debate-Engine (GLM 5.1 Design mit Claude-Korrekturen).

**Wichtige Commits:**

- `538f938` — `feat(builder): add council debate engine (GLM 5.1 design + Claude corrections)`
- `737c8a1` — `feat(builder): add council-debate route to opusBridge`
- `51c1c1b` — `chore: bump version to trigger deploy with council-debate endpoint`
- `30761e3` — `fix(URGENT): restore opusBridge.ts + council-debate route` — offenbar ein Patch-Unfall, gleichen Tages gefixt
- `902d59f` — `fix(builder): correct import paths and callProvider interface in councilDebate`
- `1a9adee` — `docs: add council-debate documentation (trigger fresh deploy)`
- `c460db5` — `fix(builder): add eq import, remove dynamic drizzle import in councilDebate`
- `4af9376` — `fix(builder): add forceJsonObject:false to fix DeepSeek council calls`
- `b7eff3e` — `feat(builder): replace DeepSeek with GLM 5.1 as Pragmatiker in council`
- `091c964` — `test(builder): A/B test GLM 5 Turbo vs GLM 5.1 as Pragmatiker + maxTokens 4000`
- `15fa7cc` — `feat(builder): 5-role council — add GLM 5.1 Implementierer alongside GLM Turbo Pragmatiker`
- `addc56a` — `feat(builder): async council-debate + status endpoint + 5 roles (GLM Turbo + GLM 5.1)`
- `9627bef`/`f992bef` — `feat(builder): add scout phase to council — repo scan + gemini web search + AICOS cards + crush`
- `82da82d`/`c22b00e` — `fix(opus-bridge): return taskId + ?full=true on council-debate (pipeline consistency)`
- `a322ac0` — `feat(builder): harden maya guide transitions and drag flow` — V3-Guardrails für Maya-Guide (Block 5d)

**Kernaussage:** S28 war der Council-Debate-Tag. Eine neue Engine für Council-Roundtable mit 5 Rollen (GLM Turbo Pragmatiker + GLM 5.1 Implementierer + drei weitere) wurde gebaut, async-gemacht, mit Status-Endpoint ausgestattet und um eine Scout-Phase erweitert (Repo-Scan + Gemini-Web-Search + AICOS-Karten + Crush-Analyse). Parallel Maya-Guide V3-Härtung.

---

## S29 — 2026-04-17 nachmittags (zwischen Council-Debate und S30-Handoff 20:48)

**Thema:** Double-Deploy-Bug-Fix + DNS-Hardening.

**Wichtige Commits:**

- `58887c7` — `fix(opus-bridge): remove auto-redeploy from /git-push (fixes double-deploy bug)` — der Doppel-Deploy-Bug der in S30 dokumentiert wurde: `/git-push` triggerte neben der GitHub-Action auch einen direkten Render-Redeploy, was zwei parallele Builds erzeugte
- `832581d`/`9c0f780`/`56177e5` — `docs(s30): sync STATE/SESSION-STATE to 58887c7 + add HANDOFF-S30` — mehrfach gepushed (Bridge-Push-Retry-Artefakt)

**Kernaussage:** S29 war eine kurze Fix-Session: der Double-Deploy-Bug wurde gefunden und gefixt, dann direkt in den S30-Handoff mit übernommen. Deshalb ist S29 nie als separate Handoff-Datei geschrieben worden.

**S29-Folgearbeit (außerhalb des S29-Fensters, aber inhaltlich zugehörig):**
- `f6b6990` — `fix(opus-bridge): close TSC retry gap in roundtable-only path` — der S30-Task "TSC-Retry Roundtable-Pfad schließen" wurde hier gelöst (heute S35-Backlog-Audit hat das als DONE bestätigt)
- `4667527` — `docs(s31): add observability inspection candidate` — Initial-Eintrag des späteren F9
- `fad69d1` + `4d29750` — DNS-Hardening gegen v8-Cache-Overflow
- `f6b080f` + `b99b663` — Outbound-Fetch-Pfade gehärtet

---

## Was die Lücken strukturell zeigen

Drei Muster sind bei der Rekonstruktion sichtbar geworden:

1. **Bridge-Push-Bug `undefined`-Datei (S23):** Ein Handoff wurde gepusht, aber der Bridge-Endpoint hat den Dateipfad nicht korrekt belegt und die Datei als `/undefined` im Repo-Root abgelegt. Dokumentiert war das nirgends. Sollte als Drift 14 notiert und die Datei in einer Session aufgeräumt werden (entweder korrekt umbenennen zu `docs/HANDOFF-S23.md` oder `undefined` löschen und S23-Infos in diesen Sammel-Handoff verdichten).

2. **Session ohne Handoff weil direkt in nächste fortgesetzt (S22, S29):** Beide Sessions waren arbeitsreich aber endeten in einer direkten Anschluss-Session, deren Handoff die vorherige Arbeit mit abdeckte. Pragmatisch nachvollziehbar, aber führt zu Lücken in der Numerierung.

3. **Session ohne Handoff trotz hoher Aktivität (S26, S27, S28):** Diese drei waren intensive Arbeitstage mit großen Feature-Schritten (Director, Pool-UI, Council-Debate). Hier fehlen die Handoffs vermutlich aus Zeitdruck am Session-Ende. Das neue Session-Close-Template v2 (S35-F9 eingeführt) soll solche Lücken in Zukunft verhindern.

---

## Ausdrücklich nicht Teil dieser Rekonstruktion

- Inhaltliche Bewertung der damaligen Entscheidungen
- Offene-Tasks-Liste (die müssen aus heutiger Sicht aus Code-Stand abgeleitet werden, nicht aus alten Sessions)
- Live-Verify alter Features (nicht mehr möglich)
- Architektur-Stand zu dem Zeitpunkt (inzwischen weiter)

Diese Rekonstruktion ersetzt **nicht** die damaligen Session-Kontexte — sie macht die Historie nur navigierbar statt blind.
