# HANDOFF S22–S23 + S26–S29 (RECONSTRUCTED)

**Rekonstruktions-Datum:** 2026-04-20 abends (während S35-Abend-Session)
**Methode:** Commit-Historie + Commit-Messages durchgelesen, zu Sessions gruppiert nach Zeitzone (Europe/Berlin) und Arbeits-Thema. Keine Live-Memory, keine originalen Chat-Logs — deshalb kein detailliertes Chat-Protokoll sondern **Code-Ground-Truth-Rekonstruktion**.

**Grund für die Rekonstruktion:** Sechs Sessions (S22, S23, S26, S27, S28, S29) haben historisch keinen Handoff bekommen. Sie tauchen deshalb in jedem neuen Chat als Unbekannte auf („Session-Historie-Lücke"), was bei mehreren Chats zu Verwirrung und Doppelarbeit führt. Dieser Sammel-Handoff schließt die Lücke permanent. Fehlt was, ist das im Code nicht mehr auffindbar — dann war es nicht wichtig genug.

**Zeitlicher Rahmen:**
- S21 Ende: 2026-04-13 22:58
- S22 Anfang: 2026-04-14 morgens
- S24 Ende: 2026-04-14 23:52 (hat eigenen Handoff)
- S25 Ende: 2026-04-15 09:49 (hat eigenen Handoff)
- S26 Anfang: 2026-04-15 ca. 12:50
- S30 Anfang: 2026-04-17 ca. 20:48 (hat eigenen Handoff)

---

## S22 — Patrol-Diagnostics + Builder-Internals (2026-04-14 morgens)

**Zeitfenster:** ca. 06:50 – 08:45 (Europe/Berlin)

**Schlüssel-Commits:**
- `c0dec32` — feat(patrol): add diagnostic patrol API for schema discovery
- `463a1bc` — feat(patrol): self-mounting patrol routes on opusBridgeRouter
- `c1c67b3` — feat(patrol): lazy-mount patrol routes via dynamic import (no circular dep)
- `8d3e2e5` — feat(builder): add read-file + anchor-patch + ls internals (ChatGPT Ebene A)
- `bd18ed0` — feat(builder): internals bootstrap with lazy dynamic import
- `1b46864` — feat(builder): mount internals bootstrap via opusMeisterPlan import
- `0d98c04` — feat: add /read-file endpoint for pipeline debugging
- `5cad776` — feat(patrol): add PatrolConsole UI component with severity filter and finding details
- `8d4bbca` — feat(patrol): export PatrolConsole from M16_builder barrel

**Inhaltlich passiert:**
Patrol-Diagnostics wurde von einem konzeptionellen Vorschlag in eine echte API-Oberfläche übersetzt. Drei Komponenten entstanden: der Patrol-Endpoint mit Schema-Discovery, der lazy-mount-Mechanismus um Zirkularabhängigkeiten zu vermeiden (Patrol-Routen wurden über dynamischen Import ins `opusBridgeRouter` geklinkt), und die `PatrolConsole`-UI im M16_builder-Modul zur visuellen Inspektion der Findings.

Parallel dazu wurden die Builder-Internals (ChatGPT-Ebene-A) eingeführt: `read-file`, `anchor-patch` und `ls`-internals als Bootstrap via dynamischem Import. Der `/read-file`-Endpoint wurde als Pipeline-Debugging-Werkzeug geboren — vorher ging Pfad-Inspektion nur über Repo-Klon im Chat.

**Technische Entscheidung:** Lazy-Dynamic-Import überall. Patrol-Routen und Internals-Bootstrap registrieren sich erst zur Laufzeit, nicht beim Modul-Load. Das verhindert Zirkularabhängigkeiten zwischen `opusBridge` und den Feature-Modulen.

**Offener Rand am Session-Ende:** Der PatrolConsole-Export aus dem barrel war ein „letzter Feinschliff"; der S23-Bugfix-Block zeigte, dass `patrolMount`- und `fileReader`-Imports in `opusVordenker` noch nicht sauber waren und den Build brachen.

---

## S23 — PatrolMount-Build-Fix (2026-04-14 nachmittags)

**Zeitfenster:** 2026-04-14 16:37 – 2026-04-14 23:52 (bis S24-Anfang)

**Schlüssel-Commits:**
- `5b01f3b` — fix: remove broken patrolMount/fileReader imports from opusVordenker (fixes build)
- `2361300` — fix: add @ts-nocheck to patrolMount/fileReader, re-add patrolMount import (unblocks build)

**Inhaltlich passiert:**
Kurze Aufräum-Session. Der S22-Rollout hatte `patrolMount`- und `fileReader`-Imports in `opusVordenker.ts` hinterlassen, die den TypeScript-Build brachen. Erster Fix: Imports entfernen. Zweiter Fix: Imports wieder rein, aber mit `@ts-nocheck`-Direktive — um die lazy-Dynamic-Import-Strategie zu erhalten, ohne den strict-Mode zu brechen.

**Warum das wichtig war:** Ohne diesen Fix war jeder folgende `/git-push` rot geblieben. Die beiden Commits sind die Brücke zwischen dem S22-Patrol-Rollout und der S24-Nacht-Session, in der dann Token-Limits auf 100K erhöht wurden und `anchorPatch.ts` als Surgical-Edit-Modul gebaut wurde.

**Typische Session-S23-Charakteristik:** Zwei Commits, rund 1 Minute auseinander, klassische „Fix-und-weiter"-Muster. Kein Spec, kein Plan, reines Entstör-Arbeiten.

---

## S26 — Maya Director + Brain Continuity + GLM 5.1 Pools (2026-04-15 nachmittags + abends)

**Zeitfenster:** 2026-04-15 12:50 – 23:56

**Schlüssel-Commits:**
- `86d9155` — feat(builder): add maya director control path
- `912ef9e` — fix(builder): harden director action parsing
- `b926ac7` — fix(builder): resolve director read-file paths on render
- `55dc6cb` — feat(builder): add director thinking and glm51 paths
- `376e7e9` — feat(builder): wire maya brain continuity memory
- `cfe68ac` — fix(builder): surface maya brain mode in ui
- `ce0b04b` — feat(builder): maya brain UI + GLM 5.1 pools in live BuilderStudioPage
- `c7356b5` — chore: remove dead MayaDashboard and unused builder files
- `ee9e693` — fix(builder): refresh file index after successful push
- `79ca9fc` — fix(builder): make create mode explicit in opus tasks
- `ecb9d4f` — fix(builder): reject semantically drifted opus candidates

**Inhaltlich passiert:**
Großer Maya-Director-Rollout. Maya bekommt einen eigenständigen Control-Path: Director-Action-Parsing (hart gegen halluzinierte Outputs), Directory-Resolution im Render-Container (Pfad-Probleme beim `read-file`-Zugriff), und ein expliziter Thinking-Modus der optional auf GLM 5.1 umschalten kann.

Zentral: **Maya Brain Continuity Memory** (`376e7e9`). Maya speichert Gesprächskontext über Sessions hinweg und liefert das an ihre eigenen Worker. UI zeigt den aktuellen Brain-Mode. Parallel dazu: GLM 5.1-Pools (Worker-Klasse) gingen erstmals live im `BuilderStudioPage`.

**Aufräumungen im gleichen Zug:**
- `MayaDashboard`-Route und zugehörige Dead-Files gelöscht (Vorläufer von `/maya` aus S16/Pipeline-Completion-Zeit)
- File-Index-Regeneration nach jedem erfolgreichen Push (`ee9e693`) — das wurde später in F9/F6 wieder berührt
- Opus-Tasks: `method: 'create'` muss jetzt **explizit** gesetzt sein; halluzinierte Worker-Outputs, die semantisch driften (Funktionsnamen umbenennen o. Ä.), werden vom Judge rejected

**Verbindung zu späteren Sessions:**
Das "refresh file index after successful push" aus `ee9e693` ist genau der Mechanismus, den F9 gegen False-Positive-Pushes abgesichert hat und den F9-Followup (`6064636`) am redundanten `/push`-Dispatch-Pfad bereinigt hat. Der "reject semantically drifted candidates"-Block aus `ecb9d4f` ist ein Vorläufer der späteren Judge-Hardening-Arbeit.

---

## S27 — Honest Async Executor + Deterministic Related Files (2026-04-15/16 Nacht + Morgen)

**Zeitfenster:** 2026-04-15 23:58 – 2026-04-16 14:30

**Schlüssel-Commits:**
- `04bf687` — fix(builder): harden create detection and fallback judge
- `5e872f6` — fix(builder): deploy async executor pushes honestly
- `36a86ca` — feat(builder): deterministic related files in worker context
- `2817c1c` — fix(builder): make maya fast mode explicit

**Inhaltlich passiert:**
Zwei Härtungen am Builder-Kern.

**Create-Detection-Härtung (`04bf687`):** Der Create-Signal-Erkennungs-Pfad wurde mit Fallback-Judge ergänzt. Wenn die primäre Create-Detection zweifelhaft ist, fragt ein zweiter Judge. Das war der direkte Vorläufer der F6-Regel von heute: "hart rejecten ohne eindeutiges Create-Signal" (Hebel α).

**Honest Async Executor (`5e872f6`):** Der async-Executor-Pfad meldete vorher bei `/deploy`-Dispatches einen Erfolg, obwohl noch nicht klar war ob der Deploy tatsächlich passierte. Dieser Fix hat `pushed: true` an den tatsächlichen Deploy-Erfolg geknüpft — historisch der erste Versuch dessen, was F9 viel später (zwei Sessions weiter) sauber als Callback-Pattern umgebaut hat.

**Deterministic Related Files (`36a86ca`):** Worker-Kontext enthielt vorher Related Files aus LLM-Ranking (wackelig). Umbau auf deterministic — Related Files werden aus dem Repo-Index mit Symbol-Graph-Traversierung berechnet. Das ist genau die Grundlage, auf der F6 heute `isIndexedRepoFile()` nutzt.

**Maya fast mode (`2817c1c`):** Explicit statt implicit. Bei schnellen Tasks nicht mehr in den großen Orchestrator-Pfad fallen, sondern direkter Worker-Call.

**Nebenthemen:**
Scout-Pool-Chat-Window (Block 4.6a) startete hier mit `6ece7e4`. Das wurde in S28 fortgesetzt.

---

## S28 — Pool-Popups + Block 4.6a–4.6e (2026-04-16 nachmittags + abends)

**Zeitfenster:** 2026-04-16 15:11 – 21:22

**Schlüssel-Commits:**
- `4d671f2` — fix(builder): fall back to read-file for maya director
- `6ece7e4` — feat(builder): scout pool chat window (block 4.6a)
- `d3c0779` — fix(builder): authorize scout pool observe call
- `0d8a908` — feat(builder): distiller pool + persistent opus token
- `6386a6b` — feat(builder): topbar pool popups + worker pool (block 4.6c)
- `da68fa8` — fix(builder): pool card score/chat overlap + wider popups (4.6c-fix)
- `ad1fa42` — feat(builder): council pool + rename chat→live + wider popups (block 4.6d)
- `af85374` — feat(builder): patrol findings feed in session bar (block 4.6e)

**Inhaltlich passiert:**
Der Builder-Studio-UI-Block 4.6 ging von konzeptionell zu vollständig. Fünf Teil-Blöcke:

- **4.6a Scout Pool:** Live-Chat-Fenster für die Scout-Pool-Messages. Observe-Call brauchte Auth-Fix (`d3c0779`).
- **4.6b Distiller Pool:** Distiller bekam eigenen Pool mit persistent Opus-Token. Das ist dieselbe Token-Logik, die wir heute bei den Bridge-Requests benutzen.
- **4.6c Worker Pool + Topbar Popups:** Worker-Pool als sichtbare Komponente in der Topbar mit Popups zum Einblicken in Messages. Nachtrag (`da68fa8`) wegen Score/Chat-Overlap und zu schmaler Popups.
- **4.6d Council Pool + Rename chat→live:** Council wurde sichtbar, "Chat" im UI durchgängig zu "Live" umbenannt — weil echte Live-Streams statt statischer Chat-Logs.
- **4.6e Patrol Findings Feed:** Die Patrol-Findings aus S22 landeten jetzt als Feed in der Session-Bar. Der Loop von S22-Build zu S28-sichtbarkeit war geschlossen.

**Typische S28-Arbeit:** Feature-Dichtes UI-Design mit direkter Backend-Verknüpfung. Jede Pool-Komponente braucht Observe-Endpoint, Auth-Token, Rendering, und optional eine Persistenz-Schicht. Das ist die Grundlage auf der später F7 (Pool-Persistenz) in S33 aufgesetzt hat.

---

## S29 — Maya Presence + Council Debate Engine (2026-04-16 Nacht + 2026-04-17 Morgen)

**Zeitfenster:** 2026-04-16 22:50 – 2026-04-17 19:40 (bis kurz vor S30-Anfang)

**Schlüssel-Commits:**
- `40d95ed` — feat(builder): maya figure + target registry + navigation (block 5)
- `f108854` — feat(builder): add event-based maya guide triggers
- `505b2db` — feat(builder): add maya chat navigation and voice input
- `0a25e43` — fix(deploy): avoid duplicate render deploys
- `f681ab1` — fix(builder): restore maya episode context and visible idle position
- `538f938` — feat(builder): add council debate engine (GLM 5.1 design + Claude corrections)
- `737c8a1` — feat(builder): add council-debate route to opusBridge
- `4af9376` — fix(builder): add forceJsonObject:false to fix DeepSeek council calls
- `b7eff3e` — feat(builder): replace DeepSeek with GLM 5.1 as Pragmatiker in council
- `091c964` — test(builder): A/B test GLM 5 Turbo vs GLM 5.1 as Pragmatiker + maxTokens 4000
- `15fa7cc` — feat(builder): 5-role council — add GLM 5.1 Implementierer alongside GLM Turbo Pragmatiker
- `a5a10ff` — feat(builder): async council-debate + status endpoint + 5 roles (GLM Turbo + GLM 5.1)
- `9627bef` — feat(builder): add scout phase to council — repo scan + gemini web search + AICOS cards + crush
- `82da82d` — fix(opus-bridge): return taskId + ?full=true on council-debate (pipeline consistency)
- `a322ac0` — feat(builder): harden maya guide transitions and drag flow

**Inhaltlich passiert:**

Drei große Baustellen parallel.

**Maya Presence (Block 5, `40d95ed` und Folge):** Maya-Figure als UI-Element. Target-Registry (welche Bereiche der App kann Maya „zeigen"), Navigation, Event-Basierte Guide-Triggers. Maya-Chat-Integration mit Voice-Input. Episode-Context-Restoration (wenn User wiederkommt, weiß Maya wo sie war). Idle-Position. **Das ist die Grundlage des heutigen `/maya`-Surface und der GuideProvider-Context**, den wir im S35-Backlog-Audit als bereits gebaut bestätigt haben.

**Council Debate Engine (`538f938` und Folge):** Sequenz `Vordenker → Pragmatiker → Idealist → Kritiker → Implementierer`, jeder mit eigenem Modell. DeepSeek wurde als Pragmatiker eingesetzt, scheiterte wegen JSON-Mode-Problemen (`4af9376` fügte `forceJsonObject:false` hinzu, dann Umstieg auf GLM 5.1). A/B-Test zwischen GLM Turbo und GLM 5.1 (`091c964`), Ergebnis: GLM 5.1 setzte sich für die Implementierer-Rolle durch. Async-Variante mit Status-Endpoint (`a5a10ff`) löste das Render 60s-Timeout-Problem — dieser Mechanismus ist das Vorbild für `/api/health/opus-task-async`, das wir heute in S35-F6 erweitert haben.

**Scout-Phase im Council (`9627bef`):** Vor dem Debate scannt der Scout das Repo, macht Gemini-Web-Search, zieht AICOS-Karten heran und wendet Crush-Operatoren an. Das ist die Evolution der Distiller-Kette, die S28 gestartet hat.

**Doppel-Deploy-Fix (`0a25e43`):** Erster Anlauf gegen Double-Deploys bei Render. Wurde in S30 mit `58887c7` endgültig gelöst (automatischer Redeploy aus `/git-push` entfernt).

**Technische Entscheidung:** Async-Pattern für alle potentiell >60s-Tasks. Das war die Antwort auf Render's Request-Timeout und ist die Architektur-Grundlage für F10 (Async-Jobs-Persistenz), den wir gerade implementieren.

---

## Was aus diesen Sessions heute noch lebt

Eine kompakte Übersicht, welche Bausteine aus S22–S29 weiterhin tragend sind (mit S35-Perspektive):

- **Patrol-API + `PatrolConsole` UI** (S22) — aktiv, wird als Patrol-Findings-Feed in der Session-Bar gerendert
- **`/read-file`-Endpoint** (S22) — aktiv, wird vom Maya Director genutzt (`4d671f2`-Fallback)
- **Lazy-Dynamic-Import-Strategie** (S22) — aktiv, ganzer Builder-Kern hängt an dem Pattern
- **Maya Director** (S26) — aktiv, ist der Control-Path für Maya-Chat
- **Maya Brain Continuity Memory** (S26) — aktiv, wird über Sessions hinweg gelesen
- **GLM 5.1 Pools** (S26) — aktiv, Worker-Pool nutzt sie
- **Deterministic Related Files** (S27) — aktiv, F6 nutzt denselben Repo-Index
- **File-Index-Refresh nach Push** (S26 `ee9e693`) — aktiv, wurde durch F9-Followup von redundanten Duplikaten bereinigt
- **Pool-Popups 4.6a-e + Topbar** (S28) — aktiv, Builder-Studio-UI
- **Maya Presence Block 5** (S29) — aktiv, `GuideProvider` ist Produktions-Code
- **Council Debate Engine mit 5 Rollen** (S29) — aktiv, einer der Hauptpfade im Builder
- **Async-Pattern mit Status-Endpoint** (S29) — aktiv, wurde in S35 erweitert um scope-Pass-Through, bekommt jetzt in F10 DB-Persistenz

**Was nicht mehr aktiv ist:**
- `MayaDashboard` als Route (in S26 `c7356b5` entfernt)
- DeepSeek als Council-Pragmatiker (in S29 `b7eff3e` durch GLM 5.1 ersetzt)
- `@ts-nocheck` auf `patrolMount` (S23) ist vermutlich noch drin, aber keine akute Last

## Lehren aus der Rekonstruktion

1. **Sessions ohne Handoffs hinterlassen erhebliche Orientierungs-Schulden.** Selbst bei klarer Commit-Disziplin (Conventional Commits, aussagekräftige Messages) muss für eine fundierte Rekonstruktion ca. 90 Minuten investiert werden. Das ist genau die Zeit, die ein sauberer End-of-Session-Handoff am Tag kostet — nur verteilt man den Aufwand besser direkt statt Monate später.

2. **Die Session-Close-Template-v2-Einführung in S35 war überfällig.** Seit S30 gibt es durchgängig Handoffs; davor war es unregelmäßig. Das Template macht die Disziplin reproduzierbar.

3. **Die hier dokumentierten Sessions zeigen die Evolution der Builder-Pipeline in Echtzeit.** Jede spätere Härtung (F6, F9, F10) hat einen Vorläufer in diesen Sessions. Das ist kein Zufall — wir bauen an derselben Architektur-Schicht weiter, und frühe Fixes zeigen, wo die Sollbruchstellen sind.

## Nicht Teil dieser Rekonstruktion

- Originale Chat-Protokolle oder Gedankengänge sind verloren (kein Memory-Zugriff auf diese Sessions).
- Reihenfolge der Commits innerhalb einer Session ist rekonstruiert aus Timestamps + Commit-Messages, nicht aus Chat-Flow.
- Entscheidungen, die nicht zu Commits führten (verworfene Wege, verworfene Experimente), sind hier nicht erfasst.
- Betrachtung von Maya-Core oder AICOS-Registry — diese Repos haben eigene Historien und Handoffs dort.

## Session-Historie komplett nach dieser Rekonstruktion

- **S17 – S21:** Handoff-Dokumente existieren.
- **S22:** Patrol-Diagnostics + Builder-Internals (dieses Dokument)
- **S23:** PatrolMount-Build-Fix (dieses Dokument)
- **S24 – S25:** Handoffs existieren.
- **S26:** Maya Director + Brain + GLM 5.1 Pools (dieses Dokument)
- **S27:** Honest Async Executor + Deterministic Related Files (dieses Dokument)
- **S28:** Pool-Popups 4.6a–e (dieses Dokument)
- **S29:** Maya Presence + Council Debate Engine (dieses Dokument)
- **S30 – S35-F6:** Handoffs existieren.

Die Lücke ist geschlossen.
