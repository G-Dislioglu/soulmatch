# SESSION-CLOSE-TEMPLATE

Dieses Dokument ist eine Checkliste, die Claude am Ende jeder Soulmatch-Arbeits-Session durchläuft, um `docs/CLAUDE-CONTEXT.md` und (wenn relevant) `STATE.md`, `RADAR.md`, `docs/SESSION-STATE.md` zuverlässig auf aktuellen Stand zu bringen.

Gürcan kann Claude mit dem Stichwort **"Session-Close"** triggern, oder Claude schlägt es am Ende einer Session selbst vor.

---

## Ablauf

### 1. Kurz-Protokoll der Session

Claude schreibt in 5-10 Zeilen:

- Was wurde heute konkret geändert oder entschieden?
- Welche Commits liegen auf `main`? (SHA-Kurzform, wenn bekannt)
- Was ist noch offen und wird in nächster Session weitergeführt?
- Gab es Drift-Momente oder Kontext-Verluste, die dokumentiert werden sollten?

### 2. Front-Matter-Update in CLAUDE-CONTEXT.md

Änderungen im YAML-Front-Matter:

- `last_updated`: heutiges Datum
- `last_session`: aktuelle Session-Nummer (z.B. S33)
- `active_threads`: Status anpassen, falls Thread begonnen/pausiert/abgeschlossen wurde
- `drift_watchlist`: neuer Eintrag, falls in dieser Session ein neuer Drift-Typ aufgetreten ist

### 3. Prosa-Sektionen prüfen

Kurz durchsehen und aktualisieren, wenn:

- Unter "Aktive Arbeits-Threads": Ein Thread hat seinen Status geändert
- Unter "Drift-Warnungen": Neuer Drift wurde beobachtet und sollte als Warnung festgehalten werden
- Unter "Wer ist der User": Gürcan hat eine neue Präferenz oder Arbeitsweise explizit gemacht
- Unter "Architektur-Kernpunkte": Relevante Code-Pfade oder Zahlen haben sich geändert

Wenn nichts davon zutrifft, bleibt die Prosa-Sektion unberührt.

### 4. Standard-Dateien prüfen

Claude checkt, ob auch die Agenten-übergreifenden Dateien Update brauchen:

- **`STATE.md`**: Update pflichtig, wenn `current_repo_head`, `last_completed_block` oder `next_recommended_block` sich geändert haben
- **`RADAR.md`**: Update pflichtig, wenn ein Kandidat `active` / `parked` / `adopted` / `rejected` geworden ist
- **`docs/SESSION-STATE.md`**: Update pflichtig, wenn eine Entscheidung in "Aktive Entscheidungen" betroffen ist oder ein Task in "Offene Tasks" abgeschlossen wurde

Falls Änderungen nötig sind: Claude erstellt die Patches explizit und separat, damit jeder Commit klar zu einer Datei gehört.

### 5. Commit-Vorschlag

Claude liefert am Ende der Session entweder:

- Einen direkten Commit über die Builder-Pipeline (wenn verfügbar und Gürcan zustimmt), oder
- Einen Copilot-Prompt, den Gürcan selbst ausführt

Der Commit-Titel folgt dem Schema:

```
docs(claude-context): update after session S{nummer}

- Front-Matter auf {datum} aktualisiert
- Active threads: {kurze stichworte}
- Drift-Warnungen: {falls neu, sonst "keine neu"}
```

### 6. Archivierungs-Check

Wenn `docs/CLAUDE-CONTEXT.md` über 600 Zeilen wächst, schlägt Claude vor, die ältesten Drift-Einträge nach `docs/CLAUDE-CONTEXT-archive.md` auszulagern. Das passiert nicht automatisch — Gürcan bestätigt.

---

## Kurzform für regelmäßige Sessions

Wenn wenig Kontext-Änderung stattfand, reicht:

1. Front-Matter `last_updated` und `last_session` anpassen
2. Wenn ein neuer Drift aufgetreten: Eintrag hinzufügen
3. Commit

Dauer: unter 5 Minuten.

## Langform für Umbruch-Sessions

Wenn strukturelle Weichen gestellt wurden (neue Architektur-Entscheidung, neuer Fokus, etc.), läuft Claude den vollen Prozess durch und passt auch die Prosa-Sektionen substantiell an.

Dauer: 15-30 Minuten.

---

## Grundregel

Die Session-Close-Übung ist nicht optional. Sie ist die einzige Versicherung gegen den Kontext-Verlust, der heute (2026-04-19, Session S32) mehrfach aufgetreten ist. Wenn sie ausgelassen wird, ist die nächste Session weniger zuverlässig.

Wenn Gürcan die Session beendet, ohne Session-Close zu triggern, schlägt Claude es von sich aus vor. Nicht aufdringlich — aber einmal klar.