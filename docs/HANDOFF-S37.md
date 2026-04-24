# Handoff S37 - Kernel Stand 2026-04-24

Fuer den naechsten Chat mit Claude, Copilot oder ChatGPT.
Ziel dieses Handoffs ist kein Tagesprotokoll, sondern ein enger, repo- und live-verifizierter Startpunkt.

## Harte Fakten

- Git-HEAD auf `main`: `3082dd68688c889d31a46e87b4ef49fb7fe9dc96`
- Live-Render-Commit: `3082dd68688c889d31a46e87b4ef49fb7fe9dc96`
- Live-Base-URL: `https://soulmatch-1.onrender.com`
- DNS-Fix v2 liegt in `server/src/lib/outboundHttp.ts`
- Feature-Code-Anchor fuer den Architect-Phase-1-Block bleibt `4a072ec`
- Docs-Truth-Sync nach Phase 1 ist `020ea2c`
- DNS-Fix v2 ist `3082dd6`

## Wichtige Korrekturen zu frueheren Handoffs

- `STATE.md` ist absichtlich kein reiner Git-HEAD-Spiegel. `current_repo_head: 4a072ec` markiert dort den letzten produktrelevanten Feature-Code-Anchor, nicht den spaeteren Docs- oder Infra-Fix-Commit.
- `docs/SESSION-STATE.md` war vor diesem Hygiene-Block noch auf S36 / `c8171c8` und ist jetzt auf S37 nachgezogen. Dieser Handoff bleibt trotzdem der engere Startanker fuer den naechsten Chat.
- Normales DNS fuer `soulmatch-1.onrender.com` ist auf dieser lokalen Maschine nicht stabil genug, um als verlässlich geloest zu gelten. Ein aktueller Test am 2026-04-24 lieferte lokal wieder `curl: (6) Could not resolve host`.
- Fuer Live-Checks auf dieser Maschine weiter `--resolve soulmatch-1.onrender.com:443:216.24.57.7` oder `DEPLOY_RESOLVE_IP=216.24.57.7` verwenden.

## Was heute live verifiziert wurde

### Architect / Builder Block

- Phase 0 Control Plane: `3565dcd`
- Spec-Hardening vor Worker-Dispatch: `65e705d`
- Phase 1 Hardened Architect: `47deb25`
- Regex-Hotfix fuer AICOS-`Token:`-False-Positive: `4a072ec`
- Truth-Sync nach Phase 1: `020ea2c`

### DNS-Fix v2

- Commit: `3082dd6`
- Datei: `server/src/lib/outboundHttp.ts`
- Inhalt:
  - expliziter DNS-Lookup mit TTL-gebundenem LRU-Cache
  - Cache-Key beruecksichtigt Hostname plus Lookup-Optionen
  - `undici`-Agent nutzt `connect.lookup: customLookup`
  - Cache wird bei Dispatcher-Rotation geleert
  - bestehende Rotation bei DNS-Fehlern bleibt als zweite Verteidigungslinie erhalten

### Akzeptanzchecks fuer DNS-Fix v2

- `cd server && pnpm build` gruen
- `cd client && pnpm typecheck` gruen
- Deploy-Verify via `DEPLOY_RESOLVE_IP=216.24.57.7 bash tools/wait-for-deploy.sh` gruen auf `3082dd6`
- Health-Stabilitaetstest: 10 aufeinanderfolgende `GET /api/health` im 5-Sekunden-Abstand, alle `HTTP 200`
- Dry-run-Dispatch-Probe `job-modbbct9`: final `status=done`, `resultStatus=dry_run`, keine DNS-Signale im Submit oder Polling

## Was der naechste Chat nicht falsch annehmen darf

- Kein Capability-Register gebaut
- Kein `meta-008` gebaut
- Keine Maya-Core-Integration als operativer Builder-Layer
- Keine Bluepilot-Implementation
- Kein Cleanup der AICOS-Orphans als Teil dieses Blocks

## Offiziell enger naechster Block

Der naechste sinnvolle Block bleibt eng und review-orientiert:

- `/api/architect/state` Observability
- Guard-False-Positive-Haertung
- `findings` / `truncation` sichtbarer machen

Kein breiter Governance-Ausbau, kein Capability-Register, kein strategischer Neubau.

## Empfohlene Startoptionen fuer den naechsten Chat

### Option A - Guard-False-Positive-Haertung

Systematische Pruefung der Forbidden-Patterns gegen legitime Prosa, Specs und Doku. Ziel: weitere False-Positives wie bei `Token:` verhindern.

### Option B - Observability fuer `/api/architect/state`

Aggregationen fuer Findings, Truncation und blocked assumptions auf dem bestehenden observational endpoint sichtbarer machen.

### Option C - Findings-Persistierung

Erst anfangen, wenn ein echter Consumer fuer die Findings existiert. Im Moment hinter A und B priorisieren.

## Beste Lesereihenfolge im neuen Chat

1. `STATE.md`
2. `RADAR.md`
3. `FEATURES.md`
4. `docs/HANDOFF-S37.md`
5. `docs/SESSION-STATE.md`
6. `docs/PHASE-1-SPEC-HARDENED.md`
7. danach erst relevante Code-Dateien wie `server/src/lib/architectPhase1.ts` oder `server/src/lib/outboundHttp.ts`

`docs/HANDOFF-S37.md` bleibt absichtlich kompakter als `docs/SESSION-STATE.md` und sollte fuer den ersten Zuschnitt priorisiert werden.

## Hilfreiche Repo- und Live-Anker

- `https://raw.githubusercontent.com/G-Dislioglu/soulmatch/main/STATE.md`
- `https://raw.githubusercontent.com/G-Dislioglu/soulmatch/main/RADAR.md`
- `https://raw.githubusercontent.com/G-Dislioglu/soulmatch/main/FEATURES.md`
- `https://raw.githubusercontent.com/G-Dislioglu/soulmatch/main/docs/HANDOFF-S37.md`
- `https://raw.githubusercontent.com/G-Dislioglu/soulmatch/47deb25/server/src/lib/architectPhase1.ts`
- `https://raw.githubusercontent.com/G-Dislioglu/soulmatch/65e705d/server/src/lib/specHardening.ts`
- `https://raw.githubusercontent.com/G-Dislioglu/soulmatch/3082dd6/server/src/lib/outboundHttp.ts`

Live-Check lokal auf dieser Maschine bevorzugt mit Resolver-Override:

`curl --resolve soulmatch-1.onrender.com:443:216.24.57.7 https://soulmatch-1.onrender.com/api/health`

## Ein-Satz-Zuschnitt fuer den naechsten Chat

"Repo und Live stehen auf `3082dd6`; Architect Phase 1 ist live, DNS-Fix v2 ist live, `SESSION-STATE.md` ist auf S37 synchronisiert, normales DNS ist lokal weiter unzuverlaessig, und der naechste kleine Block sollte Guard-False-Positive-Haertung oder `/api/architect/state`-Observability sein."