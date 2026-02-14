# M04 — Astrology Engine

**Summary:** Echte astronomische Berechnungen basierend auf JPL-Orbitalelementen und Meeus-Algorithmen. Keine externen Dependencies.

## Features
- **RealAstrologyEngine** — Echte Planetenpositionen (Sonne, Mond, Merkur–Pluto, Chiron, Lilith)
- **Astronomische Berechnungen** (astronomy.ts):
  - Julian Day Konvertierung
  - Planetenpositionen via JPL DE405 Orbitalelemente + Kepler-Gleichung
  - Mondposition (Meeus Kap. 47, 16 Hauptterme)
  - Mean Black Moon Lilith (Mondapogäum)
  - Chiron (Näherung via Orbitalelemente)
  - Retrograde-Erkennung
  - Sternzeit (GMST) → ASC/MC Berechnung
  - Häuserspitzen (Equal House + Whole Sign)
  - Aspekt-Erkennung (Konjunktion, Opposition, Trigon, Quadrat, Sextil)
- **Geocoding** (geocode.ts): Statische Tabelle mit ~100 Städten (DE/AT/CH/TR/EU/Welt)
- **Zeitzonen + DST** Approximation für UT-Konvertierung
- StubAstrologyEngine bleibt als Fallback/Testengine erhalten

## Genauigkeit
| Himmelskörper | Genauigkeit | Methode |
|---|---|---|
| Sonne | ~0.01° | VSOP87-äquivalent via JPL-Elemente |
| Mond | ~0.3° | Meeus Kap. 47 (16 Terme) |
| Merkur–Saturn | ~1° | JPL Orbitalelemente |
| Uranus–Neptun | ~1° | JPL + Perturbationsterme |
| Pluto | ~2° | JPL Orbitalelemente |
| Chiron | ~3° | Näherung |
| Lilith | exakt | Mittleres Mondapogäum (lineare Rate) |

Gültigkeitsbereich: **1800–2050 AD**

## Public Exports
- `AstrologyEngine` (type)
- `buildAstrologyRequestFromProfile`
- `computeAstrology` (nutzt RealAstrologyEngine als Default)
- `RealAstrologyEngine`, `StubAstrologyEngine`

## Dateien
- `lib/astronomy.ts` — Kern-Astronomie (Julian Day, Planeten, Mond, Häuser, Aspekte)
- `lib/geocode.ts` — Stadtname → {lat, lon, tz} + UT-Konvertierung
- `lib/realEngine.ts` — AstrologyEngine-Implementierung
- `lib/stubEngine.ts` — Deterministische Testdaten (Legacy)
- `lib/astrologyEngine.ts` — Interface + Request-Builder

## Einschränkungen
- Häusersystem: Nur Equal House und Whole Sign (kein Placidus-Iteration)
- Geburtsort muss in der statischen Tabelle sein (sonst keine Häuser/ASC/MC)
- DST-Berechnung ist approximativ (±1h möglich an Umstellungstagen)
- Ohne Geburtszeit: Mittag-Default, Mond ±6° unsicher
