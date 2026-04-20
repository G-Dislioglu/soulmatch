# F6 — Scope-Halluzination Hard-Reject

- **Status:** in_implementation (Session S35-F6, 2026-04-20 abends)
- **Vorgänger-Kandidat:** F9 (False-Positive Pipeline Path) — komplett geschlossen, ist Sicherheitsnetz unter F6
- **Umsetzungs-Modus:** alle drei Hebel, hard-reject, ein atomarer Commit via Copilot (Bridge-Token-Scope reicht für die beiden Server-Dateien, kein Workflow betroffen)

## Problem

Nach F9 endet jeder halluzinierte Dateipfad in `status: 'partial'` statt silent-success — das ist gut. Aber die Halluzination wird erst spät im Workflow erkannt (empty_staged_diff oder REPLACE_FAILED), nicht bereits bei der Scope-Auflösung. Das heißt: ein Worker-Swarm-Lauf plus GitHub-Action-Lauf werden verbrannt, bevor der Fehler erkannt ist. Kostet Zeit und Tokens.

F6 fixt die Ursache: halluzinierte Pfade werden **bei der Scope-Phase abgefangen**, vor dem ersten Token-Call. F9 bleibt als Sicherheitsnetz für die Fälle wo Scope zwar valid ist aber der Worker-Output nicht anwendbar.

## Inspection Report

**Befund (2026-04-20):** Der Resolver `server/src/lib/builderScopeResolver.ts` ist bereits vollständig deterministisch — er iteriert über `loadIndex()` und kann nichts erfinden. Die Halluzinations-Quellen liegen an **drei Nebeneinstiegen**, die den Index umgehen:

### Lücke 1 — manualScope-Override

`server/src/lib/opusTaskOrchestrator.ts` Zeile 76-77 in `runScopePhase()`:

```typescript
if (manualScope && manualScope.length > 0) {
  return { files: manualScope, reasoning: ['manual override'], method: 'manual' };
}
```

Wenn der Caller (vor allem `/opus-feature` über den Bridge-Controller) `input.scope = [...]` mitgibt, wird der Array **komplett ohne Index-Check übernommen**. Reasoning nur "manual override". Das ist der Haupt-Einstiegspunkt. Der Distiller im `/opus-feature`-Pfad kann Scope-Arrays vorschlagen mit falschem Prefix (`client/src/...` statt `server/src/...`), falschem Dateinamen oder reiner Phantasie — und die rutschen ungeprüft durch zum Worker.

### Lücke 2 — Create-Regex-Fallback

`server/src/lib/builderScopeResolver.ts` Zeilen 136-152 in `resolveScope()`:

```typescript
if (files.length === 0) {
  const pm = instruction.match(/(?:server|client)\/src\/[\w/. -]+\.tsx?/i);
  if (pm && hasCreateSignal) {
    files.push(pm[0]);
    reasoning.push(pm[0] + " (CREATE): path not in index, instruction requests creation");
    method = 'create';
  }
}
```

Zwei fast identische Regex-Blöcke. Wenn Scoring 0 Treffer produziert und die Instruction "erstell/create/neue/hinzufueg" enthält, wird ein Pfad per Regex aus der Instruction extrahiert und ungeprüft als Create-Target zurückgegeben. Kein Sanity-Check gegen die bestehende Ordnerstruktur — ein Phantasie-Pfad wie `server/src/foo/bar/baz.ts` wird 1:1 als Create durchgereicht.

### Lücke 3 — targetFile-Parameter

`server/src/lib/opusTaskOrchestrator.ts` Zeilen 80-86:

```typescript
if (targetFile && !result.files.includes(targetFile)) {
  result.files.unshift(targetFile);
  result.reasoning.unshift(`${targetFile} (forced): targetFile parameter`);
  if (!isIndexedRepoFile(targetFile) && /erstell|create|neue|hinzufueg|new file/i.test(instruction)) {
    result.method = 'create';
    result.reasoning.unshift(`${targetFile} (CREATE): targetFile is not in repo index`);
  }
}
```

`targetFile` wird immer in Scope eingefügt, auch wenn nicht im Index. Create-Signal-Check folgt einem laxer Regex. Wenn kein Create-Signal, dann kommt eine nicht-existente Datei in den Scope als "update" und landet beim Worker als "NEW FILE"-Marker. Worker versucht zu überschreiben was nie existiert hat.

## Umsetzungs-Plan — Drei Hebel

### Hebel α — manualScope gegen Index prüfen

In `runScopePhase()`: Statt blindem Durchreichen wird `manualScope` in `indexed[]` und `unindexed[]` gesplittet. Die `unindexed`-Gruppe nur dann akzeptieren, wenn die Instruction ein Create-Signal enthält (`/erstell|create|neue|hinzufueg|new file/i`). Dann als `method: 'create'` mit `createTargets` weitergeben. Ohne Create-Signal: **Hard-Reject** mit expliziter Reasoning-Liste der abgelehnten Pfade.

### Hebel β — Create-Regex-Sanity-Check

In `resolveScope()`: Neue Helper-Funktion `hasPlausiblePrefix(path, index)` prüft, ob mindestens eine indexierte Datei die ersten drei Pfad-Segmente mit dem extrahierten Pfad teilt. Wenn nicht: Pfad rejecten mit Reasoning-Eintrag "no indexed file shares the first 3 path segments, likely hallucination". Edge-Case: Pfade mit nur 2 Segmenten (`docs/foo.md`) nur auf das erste Segment prüfen.

### Hebel γ — Phase-Report surfacet Rejections

In der `phase: 'scope'`-Detail-Ausgabe neue Felder: `indexedFiles` (echte Repo-Hits), `createTargets` (neue Dateien), `rejectedPaths` (halluzinierte Rejects). Wenn `scope.files` leer UND `rejectedPaths` nicht leer: Fehlermeldung wird von generisch auf spezifisch umgestellt: *"Scope rejected N hallucinated path(s): <liste>. Include exact paths in instruction or provide explicit create signal."*

## Akzeptanzkriterium

Zwei Live-Proben gegen die deployte Bridge:

**Probe 1 — manualScope mit halluziniertem Pfad, kein Create-Signal:**
`input.scope = ['client/src/lib/opusSmartPush.ts']` (falscher `client/`-Prefix), Instruction ohne Create-Keyword. Erwartet:
- `phase: 'scope'` status `error`
- `detail.rejectedPaths` enthält `'client/src/lib/opusSmartPush.ts'`
- Return status `failed`
- Summary mit Wort "rejected" oder "hallucinated"

**Probe 2 — Phantasie-Pfad ohne indizierten Prefix:**
Instruction "erstelle foo/bar/baz.ts", keine manualScope. Erwartet:
- Pfad rejected mit Reasoning "no indexed file shares the first 3 path segments"
- Keine Worker-Swarm-Phase läuft an

## Session-Tracking

- **S35-F9 (2026-04-20 vormittags):** F9 komplett, Sicherheitsnetz scharf. F6 explizit als nächster Block empfohlen.
- **S35-F6 (2026-04-20 abends):** Drei-Hebel-Umsetzung via Copilot (kein Bridge-Push nötig wegen Server-Scope). Inspection-Report in diesem Dokument, Akzeptanztest-Protokoll im Session-Close-Handoff.

## Nicht-Scope

- Keine Änderung am LLM-Ranking innerhalb des Resolvers (bleibt deterministisch)
- Keine neue Index-Generierungs-Logik
- Kein Umbau der `fetchFileContents`-Kette (greift erst nach Scope)
- Keine UI-Änderung für Observe (die neuen Detail-Felder sind sichtbar durch Schema-Reaktivität)
