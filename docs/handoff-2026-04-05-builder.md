# Handoff 2026-04-05

## Copy-Paste fuer den naechsten Chat

Arbeite im Soulmatch-Repo.

Wichtiger Kontext zuerst:
- Lies zuerst `STATE.md`, dann `RADAR.md`, `AGENTS.md`, `FEATURES.md`, `CLAUDE.md`.
- Fokus der letzten Bloecke war Builder, nicht allgemeines UI-Redesign.
- Der aktuelle Builder-Stand wurde in mehreren kleinen Commits direkt auf `main` gepusht.
- Wenn etwas unklar ist, recherchiere zuerst lokal im Repo und dann ueber `git log` / `git show`, statt alte Chat-Annahmen zu wiederholen.

Aktueller Builder-Kontext:
- Der GitHub-Apply-Pfad wurde gegen stilles Overwrite bei reinen `+`-Patches gehaertet. Bestehende Dateien werden jetzt append-sicher behandelt.
- Die Builder-Memory fuer Maya ist als 3-Layer-System im Code verdrahtet:
  - RAM-Arbeitsgedaechtnis fuer aktiven Task und letzte Chat-Nachrichten
  - episodische Persistenz in `builder_memory`
  - semantische Verdichtung und Worker-Profile aus Episoden
- Diese neue Persistenz ist im Code eingebaut, aber auf Render erst nach manuellem Schema-Push voll aktiv.
- WICHTIG: Der Agent darf den Render-Shell-Schritt nicht selbst ausfuehren. Der Nutzer muss dort manuell `npx drizzle-kit push` laufen lassen.
- Zuletzt wurde Maya fuer Intent-Classification und Complexity-Classification von `gemini-2.5-flash` auf `gemini-3-flash-preview` angehoben.

Wichtige letzte Commits:
- `2f87a39` feat(builder): upgrade Maya to gemini-3-flash-preview for better intent classification
- `4fe876a` feat(builder): add three-layer memory context
- `b55cf2e` feat(builder): task 37327025-c73e-4027-9ee0-b6424193177e — auto-applied patches
- `4df236c` fix(builder): restore builderMetrics + append to existing files instead of overwriting

Dateien, die fuer Builder zuletzt relevant waren:
- `server/src/lib/builderGithubBridge.ts`
- `.github/workflows/builder-executor.yml`
- `server/src/lib/builderMemory.ts`
- `server/src/lib/builderFusionChat.ts`
- `server/src/lib/builderDialogEngine.ts`
- `server/src/routes/builder.ts`
- `server/src/schema/builder.ts`
- `STATE.md`
- `RADAR.md`
- `FEATURES.md`

Was bereits verifiziert wurde:
- Append/overwrite-Fix live gegen echten Builder-Task validiert.
- `server/src/lib/builderMetrics.ts` wurde nach Overwrite-Regressionsfall wiederhergestellt und spaeter mit Append-Verhalten erneut live geprueft.
- `pnpm --dir server build` war gruen fuer den 3-Layer-Memory-Block.
- Fuer den Modellwechsel auf `gemini-3-flash-preview` waren diese Checks gruen:
  - `grep "gemini-2.5-flash" server/src/lib/builderFusionChat.ts server/src/lib/builderDialogEngine.ts` => 0 Treffer
  - `grep "gemini-3-flash-preview" server/src/lib/builderFusionChat.ts server/src/lib/builderDialogEngine.ts` => 2 Treffer
  - `pnpm --dir server build`

Offene operative Wahrheit:
- Der neue DB-Pfad `builder_memory` ist im Code da, aber auf Render erst nach manuellem `drizzle-kit push` persistent wirksam.
- Bis dahin degradiert die Builder-Memory weich: RAM-Teil bleibt nutzbar, DB-Schritte loggen Fehler statt den Builder komplett zu brechen.
- Wenn im naechsten Chat von "Memory funktioniert nicht live" die Rede ist, zuerst den Render-Schema-Stand pruefen.

Empfohlener naechster Block:
- Render-Schema-Push fuer `builder_memory` durch den Nutzer ausfuehren lassen.
- Danach einen echten Builder-Chat oder Task-Lauf gegen Deploy fahren.
- Dann pruefen, ob Episode-, Semantic- und Worker-Profileintraege wirklich geschrieben werden.

Wenn du im neuen Chat schnell nachrecherchieren musst, starte damit:

```bash
cd /c/Users/guerc/OneDrive/Desktop/soulmatch/soulmatch
git log --oneline -6
git show 4fe876a --stat
git show 2f87a39 --stat
grep -R "builder_memory" server/src
grep -R "gemini-3-flash-preview" server/src/lib/builderFusionChat.ts server/src/lib/builderDialogEngine.ts
```

Wenn Runtime-Wahrheit fuer Builder benoetigt wird, dann diese Dateien zuerst lesen:
- `server/src/lib/builderMemory.ts`
- `server/src/lib/builderFusionChat.ts`
- `server/src/lib/builderDialogEngine.ts`
- `server/src/routes/builder.ts`
- `server/src/schema/builder.ts`

Wenn Dokumentationswahrheit benoetigt wird, dann diese Dateien zuerst lesen:
- `STATE.md`
- `RADAR.md`
- `FEATURES.md`
- `AGENTS.md`

## Kurzfazit

Der letzte relevante Builder-Stand ist: append-sicherer GitHub-Apply-Pfad, neue Maya-3-Layer-Memory im Code, Modellwechsel auf `gemini-3-flash-preview`, alles auf `main` gepusht. Der einzige grosse noch offene Runtime-Schritt ist der manuelle Render-Schema-Push fuer `builder_memory` plus anschliessende Live-Verifikation.