# Return-Anchored Reasoning (RAR) — Getestetes Protokoll v1

## Kernprinzip

Kein Denkpfad ohne Rückweganker.
Kein Rückweg ohne Kernwirkung.

## Die 6 Phasen

### Phase 0 — Zielkern setzen
Fixiere: Ziel, Nicht-Ziel, Erfolg, Grenzen, offene Unbekannte.
Ohne Zielkern keine Exploration.

### Phase 1 — Kernpfade schneiden
3–5 tragende Denkachsen. Nicht mehr.
Jeder Kernpfad hat eine zentrale Frage.

### Phase 2 — Pfade öffnen (nur mit Rückweg)
Jeder abgeleitete Pfad braucht BEIM ÖFFNEN:
- Ursprungskern
- Explorationsfrage
- Rückweg: Was ändert sich am Kern, wenn dieser Pfad Ergebnisse liefert?
- Abbruchbedingung: Woran erkennt man, dass der Pfad nur Metapher ist?

Pfadtypen, die sich im Test bewährt haben:
- **counter_path** — bewusste Gegenposition ("Was wenn niemand das Ergebnis nutzt?")
- **abductive_probe** — Umkehr der Annahme ("Was wenn der Zeitpunkt falsch ist?")

### Phase 3 — Verdichten (CRUSH)
Jeden Pfad auf seinen Kernkonflikt komprimieren.
Nicht: "Was wurde alles erkundet?"
Sondern: "Was ist der eine Hebel?"

### Phase 4 — Gegenprüfung (ATTACK)
Aktiv angreifen:
- Brauchen wir das überhaupt?
- Was passiert, wenn wir es NICHT bauen?
- Existiert die Lösung schon und wir sehen sie nicht?
- Ist das Problem falsch geschnitten?

### Phase 5 — Rückmeldung (RETURN)
Jeder Pfad meldet zurück. Drei erlaubte Wirkungen:
1. **Verstärkung** — der Kern war richtig
2. **Korrektur** — der Kern war zu grob oder falsch geschnitten
3. **Umbau** — das Ziel oder die Kernstruktur selbst muss angepasst werden

Umbau ist PFLICHT als Option. Ohne Umbaurecht wird das System dogmatisch.

### Phase 6 — Kollaps
Nur das wird Arbeitswahrheit, was:
- Zielbezug hat
- Gegenprüfung überlebt hat
- Rückbindung zum Kern hat

Verworfene Pfade werden benannt. Geparkte Ideen werden separat notiert.

---

## Was RAR verhindert

- Lineare Schnellantwort ohne Sucharbeit
- Exploration ohne Rückweg
- Schöne Metaphern ohne Systemwirkung
- Zu früher Kollaps
- Inflationäre Pfaderzeugung
- Verlust der Verbindung zum Zielkern

## Was RAR erlaubt

- Mutige Exploration
- Gegenpfade und Zielkorrektur
- Kernumbau durch Rückmeldung
- Schattenwissen parken statt löschen
- Späten Kollaps statt vorschneller Glättung

---

## Anti-Drift-Regel

Ein Pfad driftet, wenn er:
- keinen klaren Bezug mehr zum Zielkern hat
- keine plausible Kernwirkung erzeugt
- nur interessante Nebenideen ohne Rückkopplung liefert
- an Komplexität wächst ohne an Erkenntnis zu gewinnen

Driftende Pfade: komprimieren, parken oder beenden.

---

## Kompaktform (Masterprompt)

```
1. Setze den Zielkern (Ziel, Nicht-Ziel, Erfolg, Grenzen).
2. Schneide 3–5 Kernpfade.
3. Öffne Pfade nur mit Rückweganker und Abbruchbedingung.
4. Komprimiere jeden Pfad auf seinen Kernkonflikt.
5. Greife an: Brauchen wir das? Existiert es schon? Ist das Problem falsch geschnitten?
6. Melde zurück: verstärken, korrigieren oder umbauen.
7. Kollabiere erst nach Gegenprüfung.
```

---

## Beweis: Nachdenker-Case

RAR wurde an einem echten Problem getestet: "Wie soll der Nachdenker arbeiten?"

**Ergebnis:**
- Angriff 1 ("Brauchen wir den Nachdenker als eigene Komponente?") hat den gesamten Scope verändert.
- Der Nachdenker wurde von einer eigenständigen Komponente zu einer kleinen Erweiterung von agentHabitat reduziert.
- Der Zielkern wurde umgebaut (narrow_goal): von "Nachdenker implementieren" zu "agentHabitat um LLM-Mini-Review erweitern".
- Geschätzter Aufwand sank von ~1 Tag auf ~30 Minuten.

**Was getragen hat:** Zielkern, Kernpfade, Rückweganker, Gegenprüfung, Kollaps.
**Was nicht gebraucht wurde:** JSON-Schema, numerische Scores, formale Pfad-IDs, Bridge Paths.

---

## Herkunft

Entstanden aus einem Explorationsgespräch über Quantencomputing, Mehrpfad-Denken und "gleichzeitiges KI-Denken".

Der brauchbare Kern war nicht Quantenphysik, sondern Architektur:
Eine KI, die mehrere Zustandsräume gleichzeitig offenhält, ihre Abhängigkeiten verfolgt, Widersprüche propagiert, Resonanz misst und erst spät auf eine Arbeitswahrheit kollabiert.

Zusätzliche Explorations-Primitive aus DeepSeek-Analyse:
- counter_path (bewusste Gegenposition)
- abductive_probe (Umkehr der Grundannahme)
- curiosity_probe (Zonen hoher Unsicherheit erkunden)
- far_analogy_path (Strukturähnlichkeit aus fernen Domänen)

Diese sind als Pfadöffnungs-Verstärker brauchbar, nicht als Hauptlogik.
