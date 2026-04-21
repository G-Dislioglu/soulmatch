# HANDOFF-2026-04-21-F10-CLARIFICATION

## Zweck

Praezisierungs-Nachtrag zu F10, ohne Rueckschreiben des urspruenglichen
Handoffs. Der Original-Handoff bleibt als historische Referenz bestehen,
dieses Dokument korrigiert nur die Evidenz-Sprache.

## Kontext

Im vorherigen F10-Followup-Text wurden einzelne Aussagen staerker formuliert,
als sie durch direkte Evidenz gedeckt waren.

## Korrigierte Aussagen

1. Verify-Status
- Alt: implizit "F10-Verify abgeschlossen".
- Korrektur: Der Fix ist code-seitig korrekt und fuer den adressierten Fall
  logisch plausibel. Ein vollstaendiger E2E-Nachweis mit explizit erzwungenem
  Cache-Miss-Pfad wurde nicht durchgaengig live ausgefuehrt.

2. Live-Commit-Sprache
- Alt: "112132a6 live" ohne Zeitkontext.
- Korrektur: Live-Commit-Aussagen sind zeitabhaengig und muessen als Messpunkt
  mit Datum/Zeit gelesen werden, nicht als dauerhafte Wahrheit.

3. Scope des F10-Fixes
- Alt: rhetorisch nah an "Fix funktioniert" ohne klares Limit.
- Korrektur: Commit 7af6554 behebt den Fall "Cache-Miss bei updateAsyncJob,
  wenn ein Update-Aufruf noch stattfindet". Der Fix heilt nicht den separaten
  Restart-Fall, in dem der Promise-Callback gar nicht mehr feuert.

4. Zombie-Aussagen
- Alt: konkrete Zombie-Befunde ohne reproduzierbar angehaengte DB-Evidenz im
  Handoff.
- Korrektur: Solche Aussagen nur als beobachtete Hypothese markieren, bis
  Query-Ausgabe oder reproduzierbarer Read beiliegen.

5. Ursachen-Spekulation
- Alt: "vermutlich DNS-Cache-Problem" als quasi Diagnose.
- Korrektur: Als Hypothese markieren, solange keine belastbare technische
  Evidenz den Grund belegt.

## Evidenzklasse fuer diesen Nachtrag

- `code_review_verified`:
  - `server/src/routes/health.ts` (updateAsyncJob mit DB-Lookup bei Cache-Miss)
  - Commit 7af6554
- `live_measured_timepoint`:
  - Render meldete bei Pruefzeitpunkt weiterhin Commit 112132a6 als live
- `not_e2e_verified`:
  - Kein kompletter erzwungener Cache-Miss-E2E-Lauf dokumentiert

## D15 Kandidat

Neuer Drift-Kandidat fuer Watchlist:

- Verify-Aussagen in Handoffs muessen Evidenz-Klasse markieren:
  - `code_review_verified`
  - `logical_derivation`
  - `e2e_tested`
  - `live_measured_timepoint`

Ohne diese Markierung kippt Sprache schnell von "plausibel" zu "bewiesen".
