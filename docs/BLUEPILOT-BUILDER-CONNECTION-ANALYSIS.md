# BLUEPILOT -> BUILDER CONNECTION ANALYSIS

Stand: 2026-04-20
Scope: Analyse-only. Kein Produktumbau. Keine neue Runtime-Wahrheit behaupten.

## Zweck

Dieses Dokument vergleicht die BLUEPILOT-Spezifikation v2.0 mit der realen
Builder-Struktur in `soulmatch` und beantwortet drei Fragen:

1. Was aus Bluepilot existiert im Builder heute bereits ganz oder teilweise?
2. Wo waere eine Verbindung sinnvoller Reuse und wo wuerde sie nur doppeln?
3. Welche Bausteine muessten fuer eine belastbare Bluepilot-Anbindung oder
   spaetere Extraction neu gebaut werden?

Das Dokument behandelt Bluepilot als externe Zielarchitektur bzw. Schwester-
Engine. Es behandelt Bluepilot nicht als bereits live gebaute Wahrheit in
Soulmatch.

## Kurzurteil

Bluepilot v2 ist nicht "fremd" zur aktuellen Builder-Landschaft. Ein grosser
Teil der Kernmechanik existiert bereits in Soulmatch unter anderen Namen:

- Maya-Regie existiert bereits in `builderFusionChat.ts` plus Pipeline-Regie in
  `opusBridgeController.ts`.
- Pool-Routing existiert in `poolState.ts`.
- Council/Mehrmodell-Diskurs existiert in `opusRoundtable.ts` und zusaetzlich
  als eigenes Debate-System in `councilDebate.ts`.
- Parallele Worker-Ausfuehrung existiert in `opusWorkerSwarm.ts` plus
  `opusDecomposer.ts`.
- Gedaechtnis/Continuity existiert in `builderMemory.ts`, `memoryBus.ts` und
  `agentHabitat.ts`.
- Ueberwachung existiert teilweise in `scoutPatrol.ts`, `builderCanary.ts` und
  den TSC-/Deploy-/Verify-Schritten der Pipeline.

Der Kernbefund ist deshalb:

- Bluepilot sollte nicht als zweite vollstaendige Orchestrierungs-Engine neben
  dem bestehenden Builder in Soulmatch eingebaut werden.
- Die saubere Verbindung ist: Soulmatch-Builder als Donor-System, Bluepilot als
  naechste, klarer geschnittene Extraction-/Produktisierungsstufe.
- Fuer Phase 1 von Bluepilot sind die hoechstwertigen Reuse-Seams bereits
  vorhanden. Die groessten echten Luecken sind nicht Worker oder Council,
  sondern `Lens-Agents`, `Template System`, ein expliziter `Phase Scanner`,
  ein echtes `/api/architect`, eine `Assumption Registry` und eine saubere
  projektbezogene Persistenz.

## Harte Repo-Wahrheit im Builder heute

### Orchestrierung

- `server/src/lib/builderFusionChat.ts`
  - Maya ist die Builder-Eingangsschicht.
  - Die Datei klassifiziert Intents und routet zwischen Quick Mode und
    Pipeline Mode via `determineBuildMode()`.
- `server/src/lib/opusBridgeController.ts`
  - Ist die faktische Kern-Orchestrierung.
  - Reihenfolge heute: Budget-Gate -> Scout -> Distiller -> Council oder
    direkter Decomposer -> Worker Swarm -> Meister-Validierung -> TSC-Retry ->
    GitHub Push/Deploy/Reflection.
- `server/src/lib/opusBuildPipeline.ts`
  - Kapselt den Vollpfad `/build` inklusive Auto-Approve, Deploy-Wait und
    Self-Verify.

### Multi-Agent-Struktur

- `server/src/lib/poolState.ts`
  - Zentraler Source of Truth fuer Maya-, Council-, Worker-, Scout- und
    Distiller-Pools.
  - Pools sind DB-persistiert und nicht nur statisch im Code verdrahtet.
- `server/src/lib/opusScoutRunner.ts`
  - Fuehrt mehrere Scouts parallel aus und mischt Graph, Error Cards und
    Web-Scout dazu.
- `server/src/lib/opusDistiller.ts`
  - Verdichtet Scout-Outputs in einen strukturierten Brief fuer den Council.
- `server/src/lib/opusRoundtable.ts`
  - Mehrmodell-Council mit mehreren Runden und Maya-Moderator.
- `server/src/lib/opusWorkerSwarm.ts`
  - Fuehrt file- bzw. blockbezogene Worker parallel aus.
- `server/src/lib/opusDecomposer.ts`
  - Zerlegt Scope algorithmisch in Units, matcht Worker und merge-t wieder.

### Memory / Lernen / Kontinuitaet

- `server/src/lib/builderMemory.ts`
  - Haelt Working Memory, Episode-Layer, Semantic-Layer und Worker-Profile.
- `server/src/lib/agentHabitat.ts`
  - Persistente Agent-Profile mit Staerken, Schwaechen, Failure Patterns,
    File Experience und Nachdenker-Learnings.
- `server/src/lib/memoryBus.ts`
  - Rollenspezifische Memory-Zufuhr fuer Scout, Distiller, Council und Worker.

### Governance / Safety / Quality

- `server/src/lib/opusBudgetGate.ts`
  - Session-basiertes Task- und Token-Limit.
- `server/src/lib/builderCanary.ts`
  - Stage-Gating mit erlaubten Risiken, Profilen, Lane-Flags und Tageslimit.
- `server/src/lib/builderPolicyProfiles.ts`
  - Policy-Profile mit Pflicht-Lanes und Reuse-/Counterexample-Regeln.
- `server/src/lib/scoutPatrol.ts`
  - Kontinuierlicher Scanner fuer Hinweise, triagierte Findings und Kontinuitaet.
- `server/src/lib/opusBuildPipeline.ts`
  - Self-Verify und Retry nach Deploy/Verify-Fehlern.

### Architektur-Wahrheit / Kontextzugang

- `server/src/routes/contextBroker.ts`
  - Session-Start, Files-Read, Ops-Query und Architecture-Digest.
- `server/src/lib/architectureDigest.ts`
  - Deterministischer Architekturdigest fuer Module, Routes, DB-Tables,
    Konventionen und Cross-Repo-Hinweise.
- `server/src/lib/directorContext.ts`
  - Baut einen verdichteten Architektur-/Statuskontext fuer Builder-Regie.
- `server/src/lib/builderScopeResolver.ts`
  - Deterministische Scope-Aufloesung statt Pfad-Raten.

## Mapping: Bluepilot v2 -> Builder heute

| Bluepilot-Baustein | Builder-Naehester Match | Status | Urteil |
| --- | --- | --- | --- |
| Maya als Dirigentin | `builderFusionChat.ts`, `opusBridgeController.ts`, Maya-Moderator in `opusRoundtable.ts` | teilweise bis stark vorhanden | Reuse moeglich |
| Chorus (parallele Hierarchie) | `opusDecomposer.ts` + `opusWorkerSwarm.ts` | teilweise vorhanden | nicht 1:1, aber klar verwandt |
| Lens-Agents (3x Middle Layer) | Scout/Distiller/Patrol/DirectorContext | nur lose Vorlaeufer | neu bauen |
| Forge-Pool mit dynamischem Routing | `poolState.ts`, Worker/Council/Scout Pools | stark vorhanden | Reuse + erweitern |
| Phase Scanner | Canary + Policy Profiles + PatchValidation + Self-Verify | nur fragmentiert | neu zusammenziehen |
| Template System | Policy Profiles, Task Types, Canary Stage Rules | schwache Vorform | neu bauen |
| Council Chamber | `opusRoundtable.ts`, `/council-debate` | stark vorhanden | Reuse moeglich |
| Denker-Triade | Scout + Patrol + Nachdenker/AgentHabitat | teilweise vorhanden | adaptieren |
| AGENTS.md als persistente Wahrheit | Repo-AGENTS + Context Broker + Architecture Digest | teilweise vorhanden | Governance fehlt noch |
| Internal Architect `/api/architect` | `contextBroker`, `architectureDigest`, `directorContext`, alte Architect-Rolle in `builderDialogEngine.ts` | nicht als API vorhanden | neu bauen |
| Operational Affect | kein echter Match | fehlt | neu bauen |
| Assumption Registry | kein belastbarer Match im Server-Code | fehlt | neu bauen |
| Model Benchmark Modul | kein belastbarer Match | fehlt | neu bauen |
| Project/App DB Layer | `builder_tasks`, `builder_memory`, `builder_agent_profiles`, `pool_state` usw. | teilweise vorhanden | Schema neu schneiden |

## Wo Bluepilot bereits klar auf dem Builder aufsitzt

### 1. Maya-Regie ist kein Neubauproblem mehr

Bluepilot beschreibt Maya als Architektin, die nicht simple Tasks baut, sondern
plant, priorisiert und eskaliert. Genau diese Rolle ist im Builder bereits
verteilt vorhanden:

- Maya als User-Eingang und Modus-Router in `builderFusionChat.ts`
- Maya als Council-Moderator in `opusBridgeController.ts`
- Maya-nahe Direktor-Schicht in `directorContext.ts` und `directorActions.ts`

Wichtig: Das ist funktional schon nah an Bluepilot, aber noch kein sauber
geschnittenes "Maya Core" fuer eine separate Engine. Die Rolle ist derzeit ueber
mehrere Builder-Dateien verteilt.

### 2. Chorus ist als Dateiblock-/Scope-Parallellauf schon real

Bluepilot v2 macht Chorus zum Kernprinzip. Soulmatch hat noch keinen
phasenbasierten DAG-Orchestrator im Bluepilot-Sinn, aber es hat bereits:

- algorithmische Zerlegung in `opusDecomposer.ts`
- parallele Worker-Ausfuehrung in `opusWorkerSwarm.ts`
- automatische Re-Routing-Pfade bei grossen Dateien und TSC-Retry im
  `opusBridgeController.ts`

Das bedeutet: Der Builder kann heute schon parallel bauen, aber er denkt dabei
noch primär in Dateien, Blocks und Patch-Slices, nicht in expliziten Phasen 1-12
mit Lens-Aufsicht.

### 3. Council Chamber ist nicht Vision, sondern schon implementiert

Bluepilot beschreibt einen konkreten Multi-Modell-Diskurs mit Maya als Chair.
Das trifft direkt auf zwei Builder-Seams zu:

- `opusRoundtable.ts`
  - mehrstufiges Council fuer Build-Entscheidungen
  - mehrere Rollen und Maya-Moderation
- `councilDebate.ts` plus Route `/api/builder/opus-bridge/council-debate`
  - separates Debattenformat fuer Architekturfragen

Hier muss fuer Bluepilot nicht neu erfunden werden. Hier muss hoechstens
entschieden werden, welches der zwei existierenden Council-Formate zum kanonischen
Bluepilot-Council wird.

### 4. Memory-Schichten sind bereits naeher an Bluepilot als die Spezifikation vermuten laesst

Bluepilot fordert Denker-Triade, Kurzzeitgedaechtnis und persistente Wahrheit.
Im Builder gibt es heute bereits:

- Working Memory in `builderMemory.ts`
- Episode-/Semantic-Layer in `builderMemory.ts`
- Worker-Lernen in `agentHabitat.ts`
- rollenspezifischen Memory-Bus in `memoryBus.ts`
- Patrol-/Fehlerkontinuitaet in `scoutPatrol.ts` und `builder_error_cards`

Das ist nicht deckungsgleich mit Bluepilots Begriffsapparat, aber operativ nah
genug, dass Reuse realistisch ist.

## Wo Bluepilot dem Builder heute voraus ist

### 1. Lens-Agents existieren noch nicht als eigene taktische Schicht

Der groesste strukturelle Unterschied ist die fehlende Middle-Layer-Hierarchie.
Der Builder kennt Scouts, Distiller, Council und Worker. Er kennt aber keine
stabile 3-Linsen-Schicht, die:

- ueber definierte Phasenbereiche wacht,
- Worker-Konflikte live schlichtet,
- Periodic Syncs faehrt,
- Maya nur mit kompakten Trigger-Briefings versorgt.

Die naechsten Verwandten sind `scoutPatrol.ts`, `directorContext.ts` und Teile
des `memoryBus.ts`, aber das ist noch keine Lens-Architektur.

### 2. Phase Scanner ist nur als verteiltes Gate-System vorhanden

Bluepilot will einen expliziten Pre-Build-Scanner mit Confidence-Score und Ampel.
Der Builder hat heute mehrere Einzelteile:

- Scope-/Risk-/Policy-Gates
- Canary Stage Gate
- Reuse-/Lane-Regeln
- Patch Validation
- TSC Retry
- Deploy Verify

Was fehlt, ist die explizite Zusammenziehung zu einem kanonischen Objekt wie:

- `scanResult.confidence`
- `scanResult.reasons`
- `scanResult.stoplight`
- `scanResult.parallelizableTracks`
- `scanResult.requiredCouncil`

Bluepilot wuerde hier nicht einen voellig neuen Bereich erfinden, sondern eine
klare Fassung von etwas bauen, das heute verteilt existiert.

### 3. Template System fehlt fast komplett

Bluepilot denkt in App-Archetypen und Phasenbaeumen. Der Builder denkt heute in:

- Task Types A/B/C/D/P/S
- Policy Profiles wie `ui_layout`, `arch_sensitive`, `db_sensitive`
- Canary Stages mit Lane-Flags

Das ist nuetzlich, aber noch kein echtes Template System. Es beschreibt vor allem
Pruefregeln und Sicherheitsprofile, nicht archetypische Projektablaeufe mit
Abhaengigkeitsregeln und Phasenstruktur.

### 4. `/api/architect` fehlt als explizites Selbstbeobachtungs-System

Bluepilot nennt vier Architekt-Endpoints:

- `/api/architect/check`
- `/api/architect/sync`
- `/api/architect/next`
- `/api/architect/drift`

In Soulmatch gibt es heute nur die Vorstufen:

- `contextBroker.ts` fuer Session-Start / Files / Ops / Architecture Digest
- `architectureDigest.ts` fuer deterministische Architekturorientierung
- `directorContext.ts` fuer Regie-Kontext
- eine aeltere Architect-Rolle in `builderDialogEngine.ts`

Das ist ein wichtiger Befund: Bluepilot Phase 1 koennte sehr effizient auf dem
bereits gebauten Kontext-Stack aufsetzen, aber das eigentliche
Architect-Governance-API ist noch nicht gebaut.

### 5. Assumption Registry, Benchmarking und projektbezogene Persistenz fehlen

Bluepilot verlangt ausdruecklich:

- Annahmen-Register
- Modell-Benchmark-Modul
- Projekt- und App-Kontext-Tabellen
- Council-History als explizite erste Klasse

Im Builder gibt es heute zwar viele relevante Tabellen, aber die Form passt noch
nicht sauber dazu.

## Datenmodell: Bluepilot-Schema gegen Builder-Schema

### Builder-Tabellen, die schon anschlussfaehig sind

- `builder_tasks`
  - nah an Bluepilot `tasks`
- `builder_agent_profiles`
  - nah an Teilen von `agent_runs` oder spaeterer Worker-Historie
- `builder_worker_scores`
  - nah an Qualitaets-/Ranking-Historie
- `builder_memory`
  - nah an `app_context`-Teilflaechen, Session-Memory und Registry-artigen Notizen
- `builder_opus_log`
  - nah an Audit-/Execution-Trail
- `pool_state`
  - brauchbar fuer Routing-Konfiguration
- `builder_error_cards`
  - nah an loesungs-/fehlerbezogenem Lernregister

### Bluepilot-Tabellen, die als echte Luecken bleiben

- `projects`
  - Builder kennt heute keine saubere Projektinstanz fuer mehrere Produkte.
- `app_context`
  - Builder hat Kontext-Fragmente, aber keine kanonische Projektkontext-Tabelle.
- `agent_runs`
  - Teilspuren existieren, aber kein klares Run-Objekt mit Dauer, Tokens,
    Output und Lens-Zuordnung.
- `assumptions`
  - fehlt.
- `phase_templates`
  - fehlt.
- `council_sessions`
  - Debatten liegen implizit in Task/Chatpool, nicht als saubere Entitaet.
- `model_benchmarks`
  - fehlt.
- `solution_registry`
  - `builder_error_cards` und Memory helfen, sind aber kein sauberer Ersatz.

Urteil: Das Builder-Schema ist ein guter Donor fuer Bluepilot Phase 1, aber kein
sauberer Zielzustand fuer Bluepilot als eigenstaendige Engine.

## Governance-Mismatch zwischen Bluepilot-Spec und Builder heute

### 1. Bluepilot will getrennte, explizite Governance

Bluepilot v2 beschreibt:

- hartes Tagesbudget
- Council-Budget pro Session
- Kill-Switch
- Architecture-Drift-Stop
- Three-Phase-Protocol als Pflicht
- automatische AGENTS.md-Pflege

### 2. Builder hat Governance, aber anders geschnitten

Heute real vorhanden:

- `opusBudgetGate.ts` mit Session-Limits, nicht Projekt-/Tagesbudget
- `builderCanary.ts` mit Stage-Limits und Lane-Regeln
- Block-/Review-/Needs-Human-Review-Zustaende
- TSC-/Deploy-/Verify-Gates

Nicht real vorhanden:

- zentraler Kill-Switch als first-class Mechanismus
- Architecture-Drift-Score, der einen Block haelt
- Assumption Registry als Pflichtspur
- automatische Repo-Doku-Synchronisation aus Builder-Laeufen

### 3. Ein wichtiger Spek-Konflikt

Bluepilot sagt: "Merge immer durch Guercan oder Maya - nie automatisch."

Der Builder hat heute Pfade, die automatischer sind:

- `/build` kann `review_needed` auto-approven und anschliessend Push/Deploy
  weiterfahren.

Wenn Bluepilot auf dem Builder aufsetzt, muss diese Stelle bewusst entschieden
werden. Sonst importiert Bluepilot ein Verhalten, das seiner eigenen
Governance-Spezifikation widerspricht.

## Verbindungspfade: was ist sinnvoll, was nicht?

### Pfad A - Bluepilot als zweite Engine innerhalb des Soulmatch-Builders

Urteil: nicht empfehlenswert.

Warum:

- doppelte Dirigentin (Maya im Builder und Maya in Bluepilot)
- doppelte Council-Systeme
- doppelte Budget-/Governance-Logik
- hohes Drift-Risiko zwischen Soulmatch-Produktwahrheit und Bluepilot-Engine-
  Wahrheit
- unklare Ownership: ist Soulmatch dann Host-App, Testbed oder Produktiv-Engine?

Dieser Pfad erzeugt eher Layer-Chaos als Klarheit.

### Pfad B - Soulmatch-Builder als Donor-System fuer Bluepilot-Phase-1

Urteil: bevorzugter Pfad.

Reuse-Kandidaten mit hohem Hebel:

- `poolState.ts`
  - Multi-Provider-Pool-Logik und Persistenz
- `opusRoundtable.ts`
  - Council-Kern
- `opusWorkerSwarm.ts`
  - parallele Worker-Ausfuehrung
- `opusDecomposer.ts`
  - algorithmische Zerlegung und Merge
- `agentHabitat.ts`
  - Worker-Lernen und Profile
- `builderMemory.ts` und `memoryBus.ts`
  - Memory-Layer
- `scoutPatrol.ts`
  - Watch/Patrol-Vorform
- `contextBroker.ts` plus `architectureDigest.ts`
  - idealer Unterbau fuer spaeteres `/api/architect`
- `builderScopeResolver.ts`
  - deterministische Scope-Aufloesung

Was nicht 1:1 mitgenommen werden sollte:

- `builderFusionChat.ts`
  - zu Soulmatch-/Maya-UI-spezifisch
- `routes/builder.ts` und `routes/opusBridge.ts`
  - enthalten Soulmatch-spezifische Route-Flaeche und Betriebsdetails
- heutige `builder.ts`-Schemaform als Endzustand
  - brauchbar als Seed, aber nicht als Bluepilot-Endmodell

### Pfad C - Bluepilot als Zielarchitektur fuer Builder-Refactor im Soulmatch-Repo

Urteil: nur begrenzt sinnvoll.

Dieser Pfad kann als interne Leitarchitektur helfen, wenn Bluepilot nicht sofort
als separates Repo gebaut wird. Dann waere Bluepilot weniger "neues Produkt im
Repo" und mehr "Soll-Zustand fuer Builder v2".

Er ist aber nur sinnvoll, wenn klar bleibt:

- Soulmatch-Builder bleibt die Runtime-Wahrheit.
- Bluepilot-Spec bleibt Proposal-/Zielbild.
- jede Uebernahme wird einzeln gegen den existierenden Builder geprueft.

## Konkrete Anschlussstrategie

Wenn Bluepilot wirklich mit der bestehenden Builder-Struktur verbunden werden
soll, ist die sinnvolle Reihenfolge:

1. Kontext- und Architektur-Layer wiederverwenden.
   - `contextBroker.ts`
   - `architectureDigest.ts`
   - `directorContext.ts`
   - `builderScopeResolver.ts`

2. Orchestrierungs-Kern wiederverwenden.
   - `poolState.ts`
   - `opusRoundtable.ts`
   - `opusWorkerSwarm.ts`
   - `opusDecomposer.ts`

3. Memory- und Lern-Layer wiederverwenden.
   - `builderMemory.ts`
   - `memoryBus.ts`
   - `agentHabitat.ts`
   - `scoutPatrol.ts`

4. Erst danach echte Bluepilot-v2-Neubauten schneiden.
   - `Lens-Agents`
   - `Phase Scanner`
   - `Template System`
   - `/api/architect`
   - `Assumption Registry`
   - `Model Benchmark`
   - neues projektbezogenes DB-Schema

Das ist absichtlich nicht "alles neu bauen", sondern `reuse -> adapt -> new`.

## Minimaler Bluepilot-Phase-1-Schnitt auf Basis des Builders

Wenn man nur den kleinstmoeglichen ernsthaften Bluepilot-Anschluss bauen wollte,
waere der richtige erste Block nicht Chorus oder Lens-Agents, sondern:

### Block 1 - Internal Architect API

Baubar auf Basis von:

- `contextBroker.ts`
- `architectureDigest.ts`
- `directorContext.ts`
- `builderCanary.ts`
- `builderPolicyProfiles.ts`

Ziel:

- `check`
- `sync`
- `next`
- `drift`

Warum zuerst:

- hoechster Governance-Hebel
- nutzt bereits gebaute Kontextinfrastruktur
- erzeugt wenig Konflikt mit produktiver Builder-Pipeline
- ist die fehlende Schicht, die Bluepilot logisch zusammenzieht

### Block 2 - Phase Scanner

Nicht als voellig neues System, sondern als Zusammenzug von:

- Policy Profiles
- Canary Gate
- Scope Resolver
- Budget Gate
- Patch Validation
- Self Verify

Zielobjekt:

- `confidence`
- `reasons`
- `stoplight`
- `requiresCouncil`
- `parallelizableTracks`

### Block 3 - Lens-Agents

Nicht von Null, sondern als geordnete Ueberbauung von:

- Scout
- Distiller
- Patrol
- DirectorContext

## Klare Nicht-Ziele fuer die Verbindung

- Kein stiller Umbau des laufenden Soulmatch-Builders in "Bluepilot", nur weil
  die Begriffe verwandt sind.
- Keine zweite Maya-Regie parallel zur bestehenden Builder-Regie im selben
  Runtime-Pfad.
- Kein direktes Uebernehmen der Bluepilot-Spec als Ist-Zustand.
- Kein Schema-Mischbau, bei dem Soulmatch-Builder-Tabellen und Bluepilot-
  Zieltabellen ohne Migrationsplan ineinanderlaufen.

## Endfazit

Bluepilot und der bestehende Soulmatch-Builder sind architektonisch nah genug,
dass eine Verbindung realistisch und sinnvoll ist. Aber die Verbindung ist nicht:

- "Bluepilot komplett neu in Soulmatch einbauen"

sondern:

- "den bestehenden Builder als Donor und Vorlaeufer lesen"
- "die vorhandenen Kernmodule extrahierbar machen"
- "nur die echten Bluepilot-v2-Luecken neu bauen"

In dieser Lesart ist der Builder heute kein Konkurrenzsystem zu Bluepilot,
sondern sein wertvollstes Vorfeld.
