# Builder-Task-Spec: /session-log Endpoint

**Zweck:** Automatisches Session-Protokoll, das bei jedem `/git-push` einen Eintrag in `docs/SESSION-LOG.md` anhängt. Bildet die Runtime-Seite des CLAUDE-CONTEXT-Systems ab (siehe `docs/CLAUDE-CONTEXT.md`).

**Trigger:** Dieser Task kann an den Builder via `/opus-feature` gegeben werden.

---

## Aufgabe in einem Satz

Erweitere `/git-push` in `server/src/routes/opusBridge.ts`, sodass bei jedem erfolgreichen Push ein strukturierter Eintrag an `docs/SESSION-LOG.md` angehängt und im **gleichen Commit** mitgepusht wird.

## Details

### Eintrag-Format

Jeder Log-Eintrag folgt diesem festen Schema (neue Einträge oben angehängt, ältere unten):

```markdown
## {ISO-Zeitstempel UTC} — {Commit-SHA kurz}

**Message:** {erste Zeile der Commit-Message}

**Files:** {n Dateien geändert}
- {path/to/file1.ts}
- {path/to/file2.ts}
- ...

**Task-ID:** {taskId falls im /git-push-Request mitgegeben, sonst "(direkt)"}

**Pushed-by:** {apiKey-Fingerprint oder "opus-bridge" wenn standard}

---
```

### Technische Anforderungen

1. **Einzel-Commit-Semantik:** Der Log-Eintrag muss Teil desselben Commits sein, den der User ursprünglich gewünscht hat. Nicht als Follow-up-Commit. Das bedeutet: vor dem Bauen des Tree-Objekts in `/git-push` wird die aktuelle `docs/SESSION-LOG.md` gelesen, der neue Eintrag oben angehängt, und die Datei als Teil des Tree mit geschrieben.

2. **Robust bei Nicht-Existenz:** Wenn `docs/SESSION-LOG.md` noch nicht existiert, wird sie neu angelegt mit Header:
   ```markdown
   # SESSION-LOG

   Automatisch gepflegtes Protokoll aller `/git-push`-Commits. Neueste oben.
   Siehe `docs/CLAUDE-CONTEXT.md` für die Lese-Reihenfolge in neuen Chat-Sessions.

   ---
   ```

3. **Kein Rekursions-Problem:** Wenn der Log-Eintrag selbst Teil des Commits ist, darf er nicht als eigener separater Push-Aufruf noch einen weiteren Log-Eintrag erzeugen. Der Log-Pfad `docs/SESSION-LOG.md` wird in der Eintrags-Darstellung nicht als "geänderte Datei" mitgelistet.

4. **Fehler-Toleranz:** Wenn das Anhängen des Log-Eintrags fehlschlägt (z.B. wegen Race-Condition beim Tree-Lesen), gilt: **Code-Commit geht trotzdem durch.** Das Logging darf nicht den Hauptpfad blockieren. In diesem Fall wird ein Fehler in Render-Logs ausgegeben, aber die Response an den Caller bleibt success.

5. **Rotation:** Wenn `docs/SESSION-LOG.md` über 1000 Zeilen wächst, verschiebt der Endpoint automatisch den ältesten 500-Zeilen-Block nach `docs/SESSION-LOG-archive-{YYYY-MM}.md` und lässt die neuesten 500 in der aktiven Datei. Das passiert vor dem Anhängen des neuen Eintrags, als eigener Teil des gleichen Commits.

### Optionale Felder im /git-push-Request

Das `/git-push`-Request-Schema wird um optionale Felder erweitert:

- `sessionLog.taskId?: string` — Referenz zu Task-Tracking
- `sessionLog.skip?: boolean` — wenn `true`, kein Log-Eintrag (für interne Server-Pushes)

Default: Log-Eintrag wird geschrieben.

### Paths-Ignore-Interaktion

`docs/SESSION-LOG.md` liegt unter `docs/**`. Das passt zum bestehenden `paths-ignore` in `.github/workflows/render-deploy.yml` und zum Render-Build-Filter. Log-Einträge lösen also keine Render-Deploys aus — gewollt.

Wenn ein Code-Commit eine Log-Zeile hinzufügt, ändert sich der Gesamt-Diff trotzdem an Nicht-Docs-Dateien. Der Render-Deploy läuft also ganz normal durch. Das ist korrekt.

## Akzeptanzkriterien

1. Nach erfolgreichem `/git-push`: `docs/SESSION-LOG.md` existiert oder ist gewachsen
2. Der Log-Eintrag steht ganz oben unter dem Header
3. Zeitstempel, Commit-SHA, Message, Files stimmen mit dem tatsächlichen Commit
4. Bestehende Tests für `/git-push` laufen grün
5. `cd server && pnpm build` und `cd client && npx tsc -b` kompilieren

## Referenz-Dateien

- `server/src/routes/opusBridge.ts` — hier liegt `/git-push`
- `server/src/lib/githubGitDataApi.ts` — wenn hier die Tree-Manipulation sitzt
- `docs/CLAUDE-CONTEXT.md` — konzeptueller Hintergrund

## Nach dem Task

Einmaliger manueller Schritt nach dem Task: ersten Log-Eintrag manuell prüfen auf korrektes Format. Dann wird der Endpoint von selbst weiterlaufen.

## Nicht Teil dieses Tasks

- UI-Anzeige des Logs (nicht nötig — Claude liest die Markdown-Datei direkt)
- Query-Endpoint wie `/session-log/since/:date` — erst bauen, wenn die Datei so groß wird, dass gezieltes Filtern gebraucht wird
- Chronist-Agent der aus dem Log automatisch STATE.md und CLAUDE-CONTEXT.md aktualisiert — das ist ein späterer Schritt