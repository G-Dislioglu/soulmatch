# HANDOFF S31 — DNS-Fix, Outbound-Observability, /git-push Atomic-Commits

**Datum:** 2026-04-18 (Morgen- und Tagsession)
**Vorgänger:** S30 (2026-04-17, `docs/HANDOFF-S30.md`)
**Repo-Head bei Session-Start:** `58887c7` (gemäß SESSION-STATE)
**Repo-Head bei Handoff-Commit:** `e3691c9` (vor diesem Handoff-Commit selbst)

---

## 1. Geliefert heute

### 1a. DNS-overflow Hardening

**Commits:** `fad69d1`, `4d29750`, `f6b080f`, `5300975`

Side-Finding aus S30 (intermittent `DNS cache overflow` mit HTTP 503 an `/api/health` und der Opus-Bridge) war als offener Task 4 in SESSION-STATE gelistet. Adressiert in zwei Iterationen:

- `fad69d1` + `4d29750`: Basis-Hardening in `server/src/lib/outboundHttp.ts` — `undici`-Dispatcher mit `connections: 128, pipelining: 1` plus `dns.setDefaultResultOrder('ipv4first')` und `setDefaultAutoSelectFamily(false)`. IPv4-Preference statt hartem `family: 4`-Enforcement; funktional gleichwertig für Hosts mit A+AAAA-Records wie `api.github.com`.
- `f6b080f`: Sieben Hotpath-Files auf die zentrale `outboundFetch`-Funktion umgestellt: `index.ts`, `builderGithubBridge.ts`, `opusBridge.ts`, `opusRenderBridge.ts`, `opusAssist.ts`, `opusIndexGenerator.ts`, `opusPatchMode.ts`. Damit geht jeder externe GitHub-/Render-API-Call durch dieselbe DNS-/Dispatcher-Konfiguration.
- `5300975`: TypeScript-Nachfix. `f6b080f` hatte lokal sauber kompiliert, aber Render lehnte den Build ab, weil `undici.fetch().json()` `unknown` statt `any` zurückgibt (Render ist strikter als lokales `tsc --noEmit` ohne `-b`). Explizite Response-Types für GitHub Contents API eingeführt plus `OutboundFetchInit` und `OutboundFetchResponse` als Re-Export.

**Verifikation:** Zwei `/git-push`-Probes (`70156d1`, `20bc008`) nach dem Deploy. Beide HTTP 200 in ~1.5s, kein DNS-overflow, kein Timeout. Im Verlauf des Tages über 5 weitere `/git-push`-Calls erfolgreich durchgelaufen — Bug ist praktisch verschwunden.

**Wichtige Einordnung:** Wir haben geheilt, nicht diagnostiziert. Ob der ursprüngliche 503 durch v8-DNS-Cache-Overflow, IPv6-Connect-Timeouts oder Node-20-native-`fetch`-Regression verursacht war, bleibt formal offen. Das neue Observability-System (1b) erlaubt jetzt echte Autopsie beim nächsten Vorfall.

### 1b. Outbound-HTTP Observability

**Commit:** `efa5e5e` — `feat(server): add outbound http observability`

Lücke aus 1a geschlossen: wenn der DNS-Bug wiederkommt, ist jetzt Diagnose-Material da. `outboundFetch()` in `server/src/lib/outboundHttp.ts` loggt jeden Call mit:

- **Success:** `[outbound] {requestId, method, host, durationMs, status, ok}`
- **Error:** `[outbound-err] {requestId, method, host, durationMs, errName, errCode, errCause}`

Scope bewusst eng gehalten:

- `requestId` = `Math.random().toString(36).slice(2, 10)` — 8 Zeichen, keine Dependency
- **Host-only Logging** (kein Path, kein Header, kein Body). Opus-Bridge-URLs tragen `?opus_token=...` in Query-Params; Path-Logging würde den Bridge-Secret leaken.
- Opt-out via `OUTBOUND_HTTP_QUIET=1` für Stress-Tests / lokale Dev-Loops.
- Kein Return-/Throw-Verhaltens-Change. Response-Objekte durchreichen, Errors rethrown.

**Verifikation (Render-Log-Tail, manuell im Dashboard, 2026-04-18 12:39 UTC):**

```
[outbound] {"requestId":"y84xifkd","method":"GET","host":"api.github.com","durationMs":183,"status":404,"ok":false}
[outbound] {"requestId":"fpklv6tv","method":"PUT","host":"api.github.com","durationMs":910,"status":201,"ok":true}
[outbound] {"requestId":"vc5vbi65","method":"GET","host":"api.github.com","durationMs":179,"status":200,"ok":true}
[outbound] {"requestId":"xaqbhq71","method":"PUT","host":"api.github.com","durationMs":606,"status":200,"ok":true}
```

Alle Felder korrekt befüllt, nur Host (kein Leak), plausible Dauer.

**Semantische Fallen beim Log-Lesen:**

- `GET 404 + PUT 201`: Neu-Datei wird erstellt. 404 ist der SHA-Lookup, findet noch nichts; 201 ist der Create. **Das ist der Normalzustand, nicht ein Bug.**
- `GET 200 + PUT 200`: Datei-Update. SHA gefunden, Update erfolgreich.
- `GET 200 + PUT 409` wäre ein echter Konflikt (anderer SHA mittendrin).

Wenn der DNS-Bug wiederkommt, wird er sich als `[outbound-err]` mit `errCause: "ENOTFOUND"` oder ähnlichem zeigen — **mit Host, Dauer und Request-ID**, also mit allem nötigen für eine ernsthafte Diagnose.

### 1c. SESSION-STATE.md auf Probe-Stand gezogen

**Commits:** `30c9d4e`, `71742b3`, `a95c366`

Drift beseitigt. `current_repo_head` hing im `STATE.md`-Header noch auf `f6b080f`, bevor heute mittag geräumt wurde. SESSION-STATE um Task 4 auf `[DONE 2026-04-18]`, Task 4a hinzugefügt und auch geschlossen, Task 4b als offener Prozess-Thread festgehalten.

---

## 2. Drei Prozess-Lehren aus dieser Session

### 2a. Pre-Push TSC-Regel ist nicht verhandelbar

`f6b080f` hat den vorgeschriebenen `cd server && npx tsc --noEmit` vor dem Push übersprungen. Lokal kompilierte es, weil unter strengerer Render-Config (die u.a. `noUnusedParameters` erzwingt) Fehler auftraten, die `--noEmit` ohne `-b` nicht findet. Resultat:

- `f6b080f` Deploy: **failed**
- `b99b663` (docs-Sync mit unverändertem Build) erbte denselben Build: **failed**
- `5300975` mit nachgezogenen Types: **succeeded**

Das ist kein Tooling-Problem, das ist eine übersprungene Regel. Die Regel ist jetzt prominent in SESSION-STATE dokumentiert (Task 4b). Für S32+: jeder Agent-Prompt für Code-Änderungen muss die TSC-Check-Anforderung explizit als Akzeptanzkriterium tragen, nicht als Hintergrund-Disziplin.

### 2b. /git-push Multi-File-Quirk und Deploy-Race

Der `/git-push`-Handler in `server/src/routes/opusBridge.ts:1603` macht pro Datei in der `files[]`-Payload einen separaten PUT gegen die GitHub Contents API. Die Contents API arbeitet **atomar pro Datei** — N Dateien → N Commits.

Zwei Commits innerhalb weniger Sekunden triggern auf Render einen Deploy-Race: parallele Deploy-Runs auf demselben SHA, einer wird gecancelled/überholt, fliegt als "failure" in den Events aus. Heute mehrfach sichtbar gewesen:

- `30c9d4e` + `71742b3` (docs-Sync 2 Files, 1s Abstand) → `30c9d4e` failed, `71742b3` success
- `70156d1` + `20bc008` (zwei Probe-Pushes in Folge) → gleiches Muster
- `7a4b550` tauchte im Dashboard mit paralleler live+failed Anzeige auf

**Diagnose-Lesson:** Phantom-Failures bei zwei Commits in Sekunden-Abstand sind keine echten Build-Failures. Der tatsächliche Build auf dem gleichen SHA parallel war grün. Beim Diagnostizieren immer die Zeitstempel der Runs nebeneinander legen.

**Behoben durch:** `363d416` — `feat(opus-bridge): make git-push atomic for multi-file commits`. Umstieg auf GitHub Git Data API: `GET /git/ref/heads/<branch>` → Parent-Commit-SHA, `GET /git/commits/<sha>` → Base-Tree-SHA, `GET /git/trees/<sha>?recursive=1` → Existenz-Check für `create` vs `update`, `POST /git/blobs` pro Datei (außer Deletes), `POST /git/trees` mit `base_tree` + neuen Blobs, `POST /git/commits` mit neuem Tree + Parent, `PATCH /git/refs/heads/<branch>` → neuer HEAD. Alle Calls über `outboundFetch` (also mit Observability aus 4a). Zusatz-Features über den Prompt hinaus: Duplicate-Path-Guard (400 bei doppeltem Pfad in Payload) und Windows-Pfad-Normalisierung (`\\` → `/`).

**Verifikation (Probe-Commit `ad8abd0`):** drei Dateien in einer Payload → ein Commit, drei identische `commitSha` in den Response-Results, ein Deploy-Run (Workflow `#74`, success, keine Phantom-Failure-Parallele). Zusätzlich Pre-Push-TSC grün protokolliert (`CLIENT_TSC_OK`, `SERVER_TSC_OK`).

### 2c. Root-Cause-Disziplin: heilen ≠ verstehen

DNS-overflow ist praktisch gelöst. Was ihn verursacht hat, bleibt unklar. Legitime Schließung, solange der neue Log-Tail beim Rückfall eine echte Autopsie erlaubt. Aber **als "gelöst" im Sinne von "verstanden" ist der Bug nicht in den Büchern** — wenn er in Monaten in einer anderen Form (Render-Pod-Restart? Node-Upgrade? IPv6-Rollout?) wiederkommt, werden wir nicht wissen, ob es dasselbe Problem ist.

Bei der Beobachtung der `[outbound]`-Logs die nächsten Tage mit achten auf: ungewöhnlich langsame `durationMs` (>2s gegen `api.github.com` wäre auffällig), gehäufte Error-Typen, ENOTFOUND-Cluster zu bestimmten Tageszeiten.

---

## 3. Offener Stand am Session-Ende

### Aus S31 entstandene Kandidaten

- **`/git-push` Atomic-Multi-File-Commit** → DONE (`363d416`, live-verifiziert via `ad8abd0`, siehe 2b)
- **Root-Cause DNS-overflow** → Beobachtungs-Task, keine aktive Arbeit bis Wiederauftritt
- **Pre-Push-TSC-Check als Tooling** → SESSION-STATE Task 4b. Optionen: Git-Hook, Agent-Workflow-Integration, oder `/git-push`-seitig vor dem ersten blob-Call tscheck triggern. Nicht dringend, aber latent.
- **End-to-End Opus-Bridge-Verifikation auf Render** (RADAR-Kandidat F3) — `@READ`-Pfade, BDL-Disziplin, Distiller/Judge-Treue im vollen Pipeline-Run. Das ist der nächste enge Block, nicht mehr `/git-push`.

### Aus S30 übernommen und weiter offen

1. **TSC-Retry Roundtable-Pfad schließen** — `tscRetryContext` aus Roundtable-Patches synthetisieren (S30-Task 1). ~30min.
2. **Block 5d PR #2 — Context-Split** — Maya-Guide via React Context statt Prop-Drilling. ~45min.
3. **Maya-Core nächsten Block schneiden** — produktseitige Entscheidung nötig, blockiert seit 2026-04-05.
4. **Async Job-Pattern für `/opus-task`** — Render 60s Timeout bei großen Tasks (S24-Rest).
5. **Patrol Finding Auto-Fix** (S24-Rest).
6. **Docs-Consolidation:** `opus-bridge-v4-spec.md` Status-Abgleich, `MAYA-BUILDER-AUSBAU-BLUEPRINT-v2.md` + `MAYA-BUILDER-CONTRACT.md` Aktualität.

### Strategischer Ausblick

Maya ist substanziell komplett. Der nächste große Sprung wäre **Bluepilot Phase 1**-Start gemäß Spec v1.0 — der Schritt von "Builder baut Soulmatch weiter" zu "Autonomes App-Building-System". Das ist keine Micro-Task mehr, sondern ein Session-füllendes Unterfangen, für das es eine bewusste Planungsrunde braucht, nicht einen `/opus-feature`-Call.

---

## 4. Für neue Chats: Einstiegs-Reihenfolge

1. `STATE.md` — kanonischer aktueller Stand
2. `docs/SESSION-STATE.md` — Session-Entscheidungen, offene Tasks
3. Dieser Handoff (`docs/HANDOFF-S31.md`) — was in S31 passiert ist
4. Bei DNS/Bridge-Themen: `docs/HANDOFF-S30.md` (Doppel-Deploy-Fix-Kontext)
5. Bei Pipeline-Themen: `docs/HANDOFF-2026-04-12-PIPELINE-COMPLETE.md` und `docs/HANDOFF-S25.md`

Session-Historie-Lücke unverändert: S22, S23, S26, S27, S28, S29 ohne Handoff-Files im Repo — Kontext via Memory + Code-Befund.
