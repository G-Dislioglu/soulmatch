# Backlog-Audit — 2026-04-20

Ausgangspunkt: `docs/HANDOFF-S35-F9.md` Section 4 listete drei Resttasks aus alten Sessions. Während der F6-Session wurde jeder Task gegen den aktuellen Code-Stand auf main geprüft. Zwei von drei sind bereits erledigt, die Handoff-Notizen waren stale. Das ist Drift 10 (Specs/Handoffs mit falschem Umsetzungs-Stand) in Lehrbuchform.

## Audit-Methode

Pro Task: Handoff-Beschreibung lesen → Ziel-Code-Datei holen → gegen Erwartung matchen → Entscheidung: `bereits_erledigt` / `teilweise_erledigt` / `weiterhin_offen`.

## Ergebnisse

### Task 1 — TSC-Retry Roundtable-Pfad schließen (Ursprung: S30)

**Handoff-Beschreibung:** *"Im Roundtable-only-Pfad tscRetryContext aus Roundtable-Patches synthetisieren und an Decomposer delegieren. Schließt Schritt 6 auf 100%. ~30 Min."*

**Befund:** **bereits erledigt.** `server/src/lib/opusBridgeController.ts` Zeile 850-880 enthält den `roundtable-tsc-fallback`-Zweig, der genau das tut: Wenn Roundtable Konsens hat und kleine Patches produziert (keine Auto-Decomposer-Trigger), werden fallback-WorkerAssignments aus den Roundtable-Patches synthetisiert und `tscRetryContext` entsprechend gesetzt. Der Retry-Loop ab Zeile 950 konsumiert den Context in allen drei Pfaden (`decomposer-direct`, `auto-decomposer`, `roundtable-tsc-fallback`).

**Konsequenz:** Task aus SESSION-STATE entfernen oder DONE-Marker setzen. Vermutlich in S30 oder S31 gelandet, aber nie im Handoff nachgezogen.

### Task 2 — Block 5d PR #2 Context-Split (Ursprung: S30)

**Handoff-Beschreibung:** *"Maya-Guide via React Context statt Prop-Drilling. lostpointercapture + Click-Debounce sind schon in PR #1 enthalten. ~45 Min."*

**Befund:** **bereits erledigt.** `client/src/modules/M14_guide/GuideProvider.tsx` enthält einen vollständigen React-Context (`GuideContext`, `useGuide`-Hook) mit `guideActive`, `startOnboarding`, `startContextual`, `stopGuide`, `nextStep`. `App.tsx` wrappt alles in `GuideProvider` (Zeile 2335/2343). `MayaGuideBubble` und `MayaGuideRing` werden innerhalb des Providers konsumiert. Kein Prop-Drilling sichtbar.

**Konsequenz:** Task aus SESSION-STATE entfernen.

### Task 3 — Async Job-Pattern für /opus-task (Ursprung: S24)

**Handoff-Beschreibung:** *"löst Render 60s Timeout bei großen Tasks."*

**Befund:** **teilweise erledigt.** `POST /api/health/opus-task-async` + `GET /api/health/opus-job-status` sind in `server/src/routes/health.ts:78+115` live. In-memory `asyncOpusJobs`-Map hält Jobs über ihre Laufzeit.

**Was fehlt für "vollständig":**
- **Persistenz über Container-Restarts** — ein laufender Job geht verloren wenn Render den Container neustartet. Für kurze Tasks unkritisch, für große Decomposer-Runs mit mehreren Minuten Laufzeit relevant.
- **Body-Parameter sind unvollständig** — `opus-task-async` ignoriert `scope`, `skipDeploy`, `targetFile` aus dem Body (entdeckt während F6-Live-Verify-Versuch am 2026-04-20, separater Fix in Arbeit).

**Konsequenz:** Task als teilweise DONE markieren mit klarer Benennung was noch fehlt. Persistenz ist eigener Block, nicht dringend.

## Lehre für Session-Close-Protokoll

Die neue Phase 3.3 (Satelliten-Docs-Audit) im Session-Close-Template fängt genau diesen Driftet-Typ ab, aber nur wenn er beim Schreiben eines Handoffs mitläuft. Für den bestehenden Altbestand an Handoffs/Tasks war ein gezielter Audit nötig (dieses Dokument). Vorschlag: **periodischer Backlog-Audit** alle ~10 Sessions oder bei jedem Umbruch-Punkt. Kein Code, nur docs-only, braucht ~20 Minuten.

## Nicht Teil dieses Audits

- Inhaltliche Bewertung der Tasks (ob sie gut gelöst wurden, ob die Architektur stimmt) — nur Prüfung ob die Code-Realität der Handoff-Beschreibung widerspricht.
- Andere potenziell stale Einträge in `SESSION-STATE.md` Abschnitt "Offene Tasks" außer den drei geprüften.
- Alle stale Hinweise in Spec-Dokumenten (`BUILDER-STUDIO-SPEC-v3.3.md`, `MAYA-BUILDER-AUSBAU-BLUEPRINT-v2.md`, etc.) — dafür gab es den S34-Docs-Audit.
