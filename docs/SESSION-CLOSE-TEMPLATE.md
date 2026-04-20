# SESSION-CLOSE-TEMPLATE

Dieses Dokument ist die verbindliche Checkliste für den Start, die Durchführung und den Abschluss jeder Soulmatch-Arbeits-Session. Drei Phasen, die nacheinander laufen: **Kontext-Check** vor der Arbeit, **Kern-Arbeit** während, **Session-Close** nach der Arbeit.

Der Sammelbegriff ist **"Session-Close"** (historisch etabliert). Gürcan kann jede Phase einzeln triggern (*"Session-Close, nur Phase 3"*) oder den ganzen Ablauf (*"Session-Close"*).

---

## Warum diese Struktur

Das alte Template konzentrierte sich nur auf Docs-Hygiene am Ende einer Session. Die F9-Session am 2026-04-20 hat gezeigt: mindestens genauso wichtig sind (a) ein Unstimmigkeits-Check *bevor* Code angefasst wird und (b) ein Live-Verify der belegt, dass der gepushte Code im Container tatsächlich läuft. Ohne (a) arbeiten wir auf Sand; ohne (b) ist "deployed" eine Behauptung, keine Wahrheit.

Die drei Phasen sind **Pflicht**, nicht Empfehlung. Die Mechanik am Ende dieses Dokuments erklärt, wie das Auslassen erkannt und korrigiert wird.

---

## Phase 1 — Kontext-Check (vor der Arbeit)

**Trigger:** Jeder neue Chat zu Soulmatch, egal ob Kontext-Handoff oder Kaltstart.

**Ziel:** Unstimmigkeiten finden und benennen, *bevor* auch nur eine Zeile Code berührt wird.

### Schritt 1.1 — Lesereihenfolge einhalten

In genau dieser Reihenfolge:

- [ ] `docs/CLAUDE-CONTEXT.md` — Anker, Drift-Watchlist, active_threads
- [ ] `STATE.md` — Header-Block (`current_repo_head`, `last_completed_block`, `next_recommended_block`)
- [ ] `RADAR.md` — relevante Kandidaten (suchen nach dem Thema der Session)
- [ ] `docs/SESSION-STATE.md` — aktive Entscheidungen, offene Tasks
- [ ] Neuester `docs/HANDOFF-S*.md` (höchste Session-Nummer)
- [ ] Relevante Code-Dateien für die geplante Session

### Schritt 1.2 — Automatischer Konsistenz-Check (Selbst-Check)

Beim Lesen prüft Claude drei Invarianten:

- [ ] **Handoff-Integrität:** Existiert `docs/HANDOFF-S{last_session}.md` oder ein entsprechender File für die letzte Session-Nummer aus CLAUDE-CONTEXT.md?
- [ ] **Head-Konsistenz:** Passt `STATE.md.current_repo_head` zum letzten Non-Docs-Commit auf main? (Backfill-Commits oder docs-only-Commits dürfen dazwischenliegen — dann den letzten Code-Commit als Referenz nehmen.)
- [ ] **Thread-Konsistenz:** Sind die `active_threads` in CLAUDE-CONTEXT plausibel zum Stand der Code-Dateien? Steht irgendein Thread als `active`, obwohl der Code ihn zeigt als erledigt?

**Wenn NEIN zu einem dieser Punkte:** Claude benennt das explizit als Drift und schlägt vor, die vorherige Session nachträglich zu schließen (Phase 3), bevor neue Arbeit beginnt. Das ist kein Fehler-Modus, sondern reguläre Aufräum-Arbeit.

### Schritt 1.3 — Unstimmigkeiten beim Lesen notieren

Während des Lesens fallen typische Drifts auf:

- Header sagt X, Body weiter unten sagt Y (wie STATE.md in F9)
- Task ist DONE aber nicht markiert
- Commit-SHAs in Doku sind stale
- Spec-Dokumente listen "noch nicht implementiert"-Punkte die längst live sind (Drift 10)

Diese Fundstücke als **separate Task-Liste** notieren. Nicht sofort fixen — der eigentliche Arbeits-Fokus darf nicht verloren gehen. Die Aufräumer kommen mit dem Session-Close-Commit in Phase 3.

### Schritt 1.4 — Kontext-Zusammenfassung an Gürcan

Bevor der erste Code-Vorschlag fällt, fasst Claude in 5-7 Sätzen zusammen:

- Welchen Code-Stand er gesehen hat
- Welchen Arbeitshebel er zuerst anfassen will
- Welche Risiken sichtbar werden
- Welche Unstimmigkeiten beim Lesen aufgefallen sind
- Ob Rückfragen nötig sind

**Erst danach** beginnt Phase 2.

---

## Phase 2 — Kern-Arbeit

**Trigger:** Grünes Licht von Gürcan nach Phase-1-Zusammenfassung.

**Ziel:** Den eigentlichen Arbeitshebel umsetzen, in-scope der Session.

### Schritt 2.1 — Scope halten

- [ ] Nur das machen, was in der Phase-1-Zusammenfassung angekündigt wurde
- [ ] Scope-Drift in andere Themen unterlassen
- [ ] Wenn Nebenbefunde auftauchen: als Task für Phase 3 notieren, nicht jetzt anfassen

### Schritt 2.2 — Pre-Push-TSC-Pflicht

Vor jedem `/git-push` mit Code-Änderung:

- [ ] `cd client && npx tsc -b` — grün
- [ ] `cd server && npx tsc --noEmit` — grün

Render's Build ist strikter als viele lokale Configs (noUnusedParameters, noUnusedLocals). Der lokale TSC-Lauf hier im Container fängt das zuverlässig ab. Die 2-3 Minuten sind **Pflicht**, nicht Luxus. Ohne diesen Check landet bei Code-Änderungen regelmäßig ein roter Render-Build, und die Session endet mit einem Fix-Push hinterher.

### Schritt 2.3 — Atomare Commits, klare Messages

- [ ] Code-Änderungen und Docs-Änderungen möglichst in separate Commits (Docs triggern kein Deploy wegen paths-ignore)
- [ ] Body-Limit der Bridge: ~100 KB pro `/git-push`. Bei größeren Payloads splitten.
- [ ] Workflow-Dateien (`.github/workflows/*`) NICHT über die Bridge pushen — Bridge-Token hat keinen `workflows`-Scope (Drift 12). Manuell via Web-UI.
- [ ] Commit-Message beschreibt *was* und *warum*, nicht *wie*.

---

## Phase 3 — Session-Close (nach der Arbeit)

**Trigger:** Entweder proaktiv durch Claude (sobald Kern-Arbeit abgeschlossen ist), oder durch Gürcans Stichwort *"Session-Close"*, oder automatisch vor Chat-Ende wenn in der Session ein Code-Commit passierte.

**Ziel:** Die nächste Chat-Session kann nahtlos einsteigen, ohne dass Kontext verloren geht oder Docs-Drift entsteht.

### Schritt 3.1 — Live-Verify

Nicht nur prüfen ob der Commit auf main liegt — prüfen ob der Container den neuen Code **ausführt**.

- [ ] Billigster Weg: ein Probe-Call, der einen Fingerabdruck der neuen Semantik zeigt. Bei F9 war das `reason:"checks_failed"` im `builderActions.result` — altes Schema hatte das Feld nicht.
- [ ] Wenn Probe nicht möglich (z.B. reine Refactorings ohne Verhaltensänderung): zumindest `/api/health` checken und bestätigen dass `commit` SHA den neuen Stand enthält.
- [ ] Wenn Live-Verify fehlschlägt: Problem dokumentieren, bevor weiter gearbeitet wird. "Deployed" ohne Live-Verify ist eine Behauptung, keine Wahrheit.

### Schritt 3.2 — Anker-Docs-Sync

Alle vier Anker müssen dieselbe Story erzählen:

- [ ] **`docs/CLAUDE-CONTEXT.md`** — Front-Matter (`last_updated`, `last_session`, `active_threads`, `drift_watchlist`). Prosa-Sektionen (Drift-Warnungen bei neuem Drift-Fund, Aktive Threads bei Status-Änderung).
- [ ] **`STATE.md`** — Header (`current_repo_head`, `last_completed_block`, `next_recommended_block`) UND Body (`## Last Completed Block`, `## Next Recommended Block`, und die Repo-Visible-Truth-Liste bei Code-Pfad-Änderungen). Kein Header-Body-Drift mehr.
- [ ] **`RADAR.md`** — Kandidat-Status (`active` / `adopted` / `mostly_adopted` / `parked`). Absorbed_into-Felder aktualisieren.
- [ ] **`docs/SESSION-STATE.md`** — Header-Block (Letzte Session, Handoff, Repo-Head). Offene Tasks (DONE markieren, neue Tasks nach hinten).

### Schritt 3.3 — Satelliten-Docs-Audit

Welche anderen Spec-Dateien sind durch diese Session betroffen?

- [ ] `grep -rln "<schlüsselbegriff>" docs/` mit dem Hauptthema der Session laufen lassen
- [ ] Jede Fundstelle prüfen: sagt sie "noch offen" zu etwas das jetzt erledigt ist?
- [ ] Falls ja: aktualisieren. Das ist Drift 10 (Spec-Dateien mit stale "Umsetzungs-Stand"-Angaben).
- [ ] Wenn unklar ob ein Update nötig: eher lassen als falsch ändern.

### Schritt 3.4 — Neuer Handoff

- [ ] Datei anlegen: `docs/HANDOFF-S{nummer}[-thema].md` (z.B. `HANDOFF-S35-F9.md`)
- [ ] Gliederung nach dem S34b-Muster:
  - 1. Was in dieser Session passiert ist (mit Commit-SHAs)
  - 2. Prozess-Lehren / neue Drifts
  - 3. Was live ist nach der Session
  - 4. Offen für die nächste Session
  - 5. Für neue Chats: Einstiegs-Reihenfolge

### Schritt 3.5 — Nebenbefund-Dokumentation

Alles was unterwegs auffiel aber nicht gefixt wurde:

- [ ] Als Task in SESSION-STATE.md oder als Kandidat in RADAR.md eintragen
- [ ] Im Handoff Section 4 explizit benennen mit Begründung warum zurückgestellt
- [ ] Bei neuen Drift-Typen: Drift-Eintrag in CLAUDE-CONTEXT.md und zusätzlich in der drift_watchlist (YAML-Front-Matter)

### Schritt 3.6 — User-Touchpoint-Cheatsheet

Wenn etwas manuell durch Gürcan gemacht werden muss:

- [ ] Kompakte Anleitung nach `/mnt/user-data/outputs/` legen
- [ ] Titel: `{session}-{thema}-Checkliste.md`
- [ ] Enthält: Was zu tun ist, warum manuell, wie (URLs, Commands), was danach kommt
- [ ] Keine Informations-Sammlung aus dem ganzen Chat — nur die Schritte, die Gürcan braucht.

---

## Mechanik — Warum das nicht vergessen wird

### Ebene 1 — Self-Check am Chat-Start (Phase 1.2)

Bei jedem neuen Chat prüft Claude automatisch, ob die vorherige Session sauber geschlossen wurde. Wenn nein, roter Flag an Gürcan und Vorschlag nachzuschließen. Damit kann ein versäumter Close höchstens eine Session lang offen bleiben.

### Ebene 2 — Pflicht-Prompt vor Chat-Ende

Wenn in einer laufenden Session ein Code-Commit passiert ist (erkennbar an `/git-push`-Aufrufen oder direkten Code-Artefakten) und die Session sich dem Ende nähert — erkennbar an User-Signalen wie "bis später", "mach pause", "fertig", "ciao", oder einfach einer längeren Ruhephase — bietet Claude Phase 3 **proaktiv** an, bevor der Chat endet. Nicht fragen ob, sondern sagen: *"Session-Close läuft jetzt — Schritte 3.1 bis 3.6."*

### Ebene 3 — Grundregel in CLAUDE-CONTEXT.md

Die Grundregel unten in CLAUDE-CONTEXT.md verankert: Session-Close ist nicht optional. Wenn Gürcan bemerkt, dass Claude ohne Close abbricht, ist das ein Fehler auf Claude-Seite. Die Regel gilt symmetrisch zur bestehenden "Du hast Recht, ich habe CLAUDE-CONTEXT.md nicht gelesen"-Regel.

### Ebene 4 — Verifier-Script (optional, future)

Ein kleines Shell-Script `tools/verify-session-close.sh` kann die Invarianten aus Phase 1.2 deterministisch prüfen. Noch nicht implementiert; kommt wenn die ersten drei Ebenen sich als ausreichend erweisen oder nicht.

---

## Kurzform für kleine Sessions

Wenn die Session nur Docs-Änderungen oder triviale Code-Fixes enthielt, reicht:

- Phase 1 minimal (nur die relevanten Docs lesen)
- Phase 2 ausführen
- Phase 3 Schritte 3.2 (Anker-Sync) und 3.4 (Handoff) — Rest überspringen wenn nichts Neues zu dokumentieren ist

Dauer: unter 10 Minuten.

## Langform für strukturelle Umbrüche

Wenn in der Session ein neuer Architekturpfad geöffnet, ein Drift neu entdeckt oder eine größere Entscheidung getroffen wurde: volle drei Phasen durchlaufen, alle sechs Phase-3-Schritte ausführen, Satelliten-Docs-Audit besonders gründlich.

Dauer: 30-60 Minuten.

---

## Grundregel

Die drei Phasen sind nicht optional. Jede ausgelassene Phase erhöht die Wahrscheinlichkeit, dass die nächste Session mit falscher Prämisse startet. Das ist die Hauptquelle von Kontext-Verlust, die dieses Dokument verhindern soll.

Wenn Gürcan bemerkt, dass Claude Phase 3 übersprungen hat, ist die erste Antwort: *"Du hast Recht, ich habe Phase 3 nicht ausgeführt. Ich hole das jetzt nach."* Keine Ausrede, keine Verteidigung.

---

## Historie dieses Dokuments

- **Version 1** (S32, 2026-04-19): Erste Fassung, konzentriert auf Docs-Update nach Session-Ende.
- **Version 2** (S35-F9, 2026-04-20): Erweitert auf drei Phasen (Kontext-Check + Kern-Arbeit + Session-Close). Mechanik-Sektion hinzugefügt. Grund: F9-Session zeigte dass Vor-Check und Live-Verify mindestens so wichtig sind wie Docs-Hygiene.
