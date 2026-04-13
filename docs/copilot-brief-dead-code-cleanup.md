# Task: Dead-Code-Cleanup + Doc-Archivierung

## Kontext
Opus-Review vom 13.04.2026 hat 14 tote Code-Dateien und 6 archivierbare Docs identifiziert.
CLAUDE.md und STATE.md sind bereits aktualisiert (separate Pushes).

## Teil 1: Tote Code-Dateien loeschen (git rm)

Alle folgenden Dateien sind NIRGENDS importiert — verifiziert per grep:

```bash
git rm server/src/services/builderFusionChat.ts
git rm server/src/services/builderMemory.ts
git rm server/src/opusBridge.ts
git rm server/src/lib/opusNoop.ts
git rm server/src/lib/opusEcho.ts
git rm server/src/lib/opusPing.ts
git rm server/src/lib/opusTimestamp.ts
git rm server/src/lib/opusHealthDeep.ts
git rm server/src/lib/opusSelfTestV2.ts
git rm server/src/lib/builderPing.ts
git rm server/src/lib/builderPingTest.ts
git rm server/src/lib/builderTimestamp.ts
git rm server/src/lib/builderUptime.ts
git rm server/src/lib/builderHealthCheck.ts
```

Falls nach dem Loeschen das services/ Verzeichnis leer ist:
```bash
rmdir server/src/services/
```

## Teil 2: Erledigte Docs archivieren

```bash
git mv docs/copilot-brief-cancel-task.md docs/archive/
git mv docs/copilot-brief-distiller-intent.md docs/archive/
git mv docs/copilot-brief-stale-detector.md docs/archive/
git mv docs/push-test.md docs/archive/
git mv docs/opus-bridge-spec-v3.0.md docs/archive/
git mv docs/WORKER-SWARM-SPEC-v1.0.md docs/archive/
```

## Teil 3: Leere Datei loeschen

```bash
git rm docs/builder-repo-index.json
```
(Der echte Repo-Index wird von opusIndexGenerator.ts zur Laufzeit generiert.)

## Verifikation

```bash
cd server && npx tsc --noEmit
cd client && npx tsc -b
```

TSC MUSS gruen sein — keine der geloeschten Dateien war importiert.

## Commit

```bash
git commit -m "chore: remove 14 dead code files, archive 6 stale docs, delete empty index"
```

## Nicht tun
- Keine inhaltlichen Aenderungen an verbleibendem Code
- Keine neuen Features
- Keine Aenderungen an CLAUDE.md oder STATE.md (bereits gepusht)
