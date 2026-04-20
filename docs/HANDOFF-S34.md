# HANDOFF S34 — Session-Log-Endpoint live, Copilot-Parallelarbeit, Build-Fehler-Lehren

**Datum:** 2026-04-20 (morgens, ~07:30 MEZ)
**Vorgänger:** S33b (`docs/HANDOFF-S33b.md`, Commit `c3cc557`)
**Code-Commits:** `df85a18` (Copilot S34, fehlgeschlagen) + `b6fa46f` (PUT-Fix, gebaut) + `c342ddd` (Test-Push) + `9c72a6f` (erster automatischer SHA-Backfill, Live-Beweis)
**Session-Close-Commit:** wird in diesem Commit selbst gesetzt

---

## 1. Was passiert ist

### 1a. Copilot-Parallelarbeit über Nacht

Gestern abend nach dem S33b-Close ging Gürcan schlafen. Zwischen ~04:00 und ~04:11 UTC heute morgen hat Copilot auf Gürcans Laptop autonom einen Commit gepusht: `df85a18 — S34: Session-Log SHA-Backfill`. Der Commit erweitert den `/git-push`-Endpoint in `server/src/routes/opusBridge.ts` um einen fire-and-forget Follow-up, der nach dem Hauptcommit die `docs/SESSION-LOG.md` liest und den `pending`-Marker durch den echten Commit-SHA ersetzt.

Das ist **genau die Lösung, die ich in der Morgensession ursprünglich als Option B vorgeschlagen hätte** — bevor ich überhaupt realisierte, dass der `/session-log`-Endpoint bereits gebaut war (das war in `fdd1097` und `a30dbdf` schon gelandet, ohne dass ein Handoff es dokumentiert hätte). Copilots Implementierung war technisch sauber: Timestamp als Anker-Key, Fire-and-forget (blockiert nicht), docs-only Follow-up (kein Render-Deploy durch paths-ignore).

### 1b. Drei fehlgeschlagene Deploys in Folge

`df85a18` scheiterte dreimal beim Render-Build:
- Copilots Push direkt (~07:07 MEZ)
- Mein erster manueller Redeploy (~07:11 MEZ)
- Mein zweiter manueller Redeploy (~07:19 MEZ)

Mein erster Reflex: Infrastruktur-Problem, wie die `short read EOF`-Fehler von gestern Abend. **Falsch.** Die Build-Logs zeigten klar:

```
src/routes/opusBridge.ts(2012,15): error TS2322:
Type '"PUT"' is not assignable to type '"GET" | "POST" | "PATCH" | undefined'.
```

Die Signatur von `githubGitRequest()` in derselben Datei erlaubte nur GET/POST/PATCH. Copilot hatte für den Contents-API-Write PUT gewählt (korrekt für GitHub's File-Upsert-API), aber die Typ-Einschränkung nicht angefasst.

### 1c. Ein-Zeilen-Fix und Live-Verifikation

Fix in `b6fa46f`: `'GET' | 'POST' | 'PATCH'` → `'GET' | 'POST' | 'PATCH' | 'PUT'`. Ein einziger String zur Union-Signatur hinzugefügt. Deploy lief diesmal sauber durch.

**Live-Test:**

1. Pool-Config-Read nach Deploy: `maya: ['glm51'], worker: [glm-turbo, glm51, minimax, kimi, qwen]` — F7-Persistenz hat den Deploy überlebt.
2. Test-Push mit STATE-Header-Update landete als `c342ddd` auf main.
3. ~2 Sekunden später kam automatisch Commit `9c72a6f — session-log: backfill sha c342ddd` mit genau einer Diff-Zeile in `docs/SESSION-LOG.md`: `- \`pending\` — STATE-Header...` → `- \`c342ddd\` — STATE-Header...`
4. Der Follow-up-Commit hat keinen Render-Deploy getriggert (paths-ignore für `docs/**` greift).

---

## 2. Prozess-Lehren

### 2a. Copilot-Parallelarbeit ist real und muss einkalkuliert werden

Bisher habe ich implizit angenommen: zwischen zwei Claude-Sessions passiert nichts am Code. Das stimmt nicht mehr. Copilot kann über Nacht arbeiten, autonom committen und die Session-Wahrheit verschieben. Beim Start jeder Claude-Session ist jetzt Pflicht:

1. GitHub-main-HEAD lesen
2. `/api/health`-Commit lesen
3. Gegen `last_verified_against_code` in STATE.md vergleichen
4. Wenn auseinandergelaufen: erst `git log` seit letztem bekannten Stand durchgehen, dann arbeiten

Ich habe das heute morgen bemerkt, aber erst als Gürcan den Screenshot vom fehlgeschlagenen Deploy gezeigt hat. Ohne den Screenshot hätte ich vielleicht noch länger daneben gearbeitet. Drift-Eintrag 8 in CLAUDE-CONTEXT.md dokumentiert das dauerhaft.

### 2b. Build-Fehler nicht reflexhaft als Infra abtun

Der `short read EOF`-Fehler gestern Abend war tatsächlich Infra (Docker-Layer-Cache/Netzwerk). Heute morgen sah es auf den ersten Blick ähnlich aus — "Exited with status 1 while building your code" — aber es war ein TypeScript-Compile-Fehler. Die tatsächliche Fehlerzeile stand mehrere Zeilen tiefer in den Build-Logs.

Konsequenz: bei Build-Fails **immer zuerst die konkrete Fehlerzeile lesen**, nicht die zusammenfassende Meldung. Ein `error TS...` ist immer ein Code-Fehler, egal welche andere Infrastruktur-Symptome drumherum sichtbar sind. Drift-Eintrag 9 dokumentiert das.

### 2c. Der Session-Log funktionierte länger als ich dachte

Beim Einlesen heute früh habe ich `docs/SESSION-LOG.md` gefunden und war überrascht — die Datei war ausgefüllt mit allen gestrigen Pushs. Das bedeutet: der Kern-Endpoint (`formatSessionLogEntry` + `buildSessionLogBlob` + Tree-Injection in `/git-push`) war schon bei einem früheren Commit ins Repo gekommen (`fdd1097`/`a30dbdf`, beide vor S33). Nur die `SESSION-LOG.md`-Datei selbst wurde erst durch den ersten `/git-push` **nach** ihrer Existenz auf Disk erzeugt — und das war gestern Abend beim S33-Zhipu-Commit.

Heisst: die Spec in `docs/BUILDER-TASK-session-log.md` sagte "zu bauen", aber das Kern-System war längst da. Was wirklich fehlte, war der SHA-Backfill — und genau den hat Copilot geliefert.

---

## 3. Was jetzt live ist

- **F7 (Pool-Persistenz):** Überlebt alle Deploys. In Produktion seit `ae3e020`.
- **Session-Log (Kern):** Schreibt automatisch bei jedem `/git-push`. In Produktion seit `fdd1097`/`a30dbdf` (vor S33).
- **Session-Log (SHA-Backfill):** Fire-and-forget Follow-up ersetzt `pending` durch echten SHA. In Produktion seit `b6fa46f`, live verifiziert mit `9c72a6f`.

---

## 4. Offener Stand am Session-Ende

Aus der S33-Handoff-Liste ist nur noch offen:

- **S31-False-Positive-Pipeline-Path-Fix** (Hauptthread, Spec: `docs/S31-CANDIDATES.md` Schritte A, C, D)
- **RADAR.md-Nachzug** — F6 (file-scout) eintragen, F7 + S34 als closed markieren (diese Session)
- **`workerProfiles.ts`-Drift** — veraltete Model-IDs fixen
- **Kaya-Rename im Code** (zurückgestellt bis Maya-Core-Schnitt)
- **TSC-Retry Roundtable-Pfad** (S30-Rest)
- **Block 5d PR #2 Context-Split** (S30-Rest)
- **Maya-Core nächsten Block schneiden** (blockiert seit 2026-04-05)
- **Async Job-Pattern für /opus-task** (S24-Rest)
- **Patrol Finding Auto-Fix** (S24-Rest)

Empfohlene Reihenfolge für die nächste Session: RADAR-Nachzug zuerst (kleiner Aufräumer, ~15 min), dann S31-Fix als Haupt-Thread.

---

## 5. Für neue Chats

Einstiegs-Reihenfolge unverändert, nur Handoff-Liste wächst:

1. `docs/CLAUDE-CONTEXT.md` — Anker (jetzt mit Drift 8+9)
2. `STATE.md`
3. `RADAR.md`
4. `docs/SESSION-STATE.md`
5. **Dieser Handoff** (`docs/HANDOFF-S34.md`)
6. Bei Bedarf: `HANDOFF-S33b.md`, `HANDOFF-S33.md`, `HANDOFF-S32.md`, ...
7. Bei Pipeline-Themen: `HANDOFF-2026-04-12-PIPELINE-COMPLETE.md` und `HANDOFF-S25.md`

Session-Historie-Lücke unverändert: S22, S23, S26, S27, S28, S29.
