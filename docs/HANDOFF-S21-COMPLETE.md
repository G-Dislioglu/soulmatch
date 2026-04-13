# HANDOFF S21 COMPLETE — 13.04.2026

## Zusammenfassung
Massive Session: Builder-Konsolidierung, Audio-Verifizierung, Maya Chat live,
Scout Patrol v0.2 deployed und liefert erste Findings.

## Deployed Changes (16 total)

### Builder Consolidation
1. ✅ Zwei Builder-Seiten (/maya + /builder) zu EINER Seite zusammengefuehrt
2. ✅ Pool-Stats-Bar (Maya 68%, Council 71%, Distiller 64%, Worker 65%, Scout 73%)
3. ✅ Worker-Pool Dropdown (5 Modelle auswaehlbar)
4. ✅ Session-Banner, Continuity Notes, Memory, System Status
5. ✅ Token-Fix: BUILDER_SECRET + OPUS_BRIDGE_SECRET + opus_token Query-Param

### Maya Chat
6. ✅ Chat-Hoehe 240→420px
7. ✅ Auto-Scroll nur innerhalb Chat-Container (kein Seiten-Springen)
8. ✅ JSON-Display-Bug: truncated JSON wird jetzt sauber als Text extrahiert
9. ✅ maxTokens 500→800 fuer weniger Abschneidungen

### Scout Patrol v0.2 (NEU)
10. ✅ scoutPatrol.ts deployed (~420 Zeilen)
11. ✅ Patrol-Router in index.ts gemountet
12. ✅ Routine Patrol: GLM-4.7-Flash + DeepSeek Chat (cross-reference)
13. ✅ Deep Patrol Pool: GLM-5.1, GLM-5-Turbo, GPT-5.4, Sonnet 4.6, DeepSeek Reasoner, Kimi K2.5
14. ✅ Finding-States: signal → triaged → verified → dismissed → fixed
15. ✅ Cross-Referenz: beide Scouts finden gleiches → confidence: cross-confirmed, auto triaged
16. ✅ Continuity Notes nach jeder Runde (Maya weiss ueber Findings Bescheid)

### Sonstiges
- ✅ DNS-Problem geloest (hosts-Eintrag bereinigt)
- ✅ Render Deploy-Webhook-Problem geloest (Trigger-Push)
- ✅ Audio-System verifiziert (Non-Stream + SSE-Stream)
- ✅ Provider-Routing-Erkenntnis dokumentiert

## Erste Patrol-Ergebnisse (LIVE)

### Runde 1 — Cross-Confirmed Findings
| Severity | Finding | Datei |
|----------|---------|-------|
| high | Fehlende Fehlerbehandlung DB Connection | db.ts |
| medium | Fehlende Typisierung (any) bei JSON | agentHabitat.ts |
| low | Hardcoded Values in Health Check | devLogger.ts |

### Runde 2 — Weitere Findings
Patrol #2: 7 Findings (2 cross-confirmed, 5 high/critical)
builderBrowserLane.ts, builderCanary.ts, builderContextAssembler.ts,
builderEvidencePack.ts, builderExecutor.ts

## Patrol Endpoints (LIVE)
```
GET  /api/builder/patrol/status          — Status, Events, Modell-Pool
POST /api/builder/patrol/run             — Routine manuell triggern
POST /api/builder/patrol/deep            — Deep Patrol: {models: [...], files: [...]}
GET  /api/builder/patrol/findings        — Alle Findings
POST /api/builder/patrol/findings/:id/verify  — Finding bestaetigen
POST /api/builder/patrol/findings/:id/dismiss — Finding verwerfen
POST /api/builder/patrol/exclude         — Excludes verwalten
```

## Deep Patrol Model Pool
| Modell | Provider | Preis In/Out | Staerke |
|--------|----------|-------------|---------|
| GLM-5.1 | zhipu | $1.00/$3.20 | SWE-Bench Pro #1 (58.4) |
| GLM-5-Turbo | zhipu | $1.20/$4.00 | Bewaehrt im Stack |
| GPT-5.4 | openai | $2.50/$15.00 | Premium Reasoning |
| Claude Sonnet 4.6 | anthropic | $3.00/$15.00 | Starke Code-Analyse |
| DeepSeek Reasoner | deepseek | $0.28/$0.42 | Chain-of-Thought, guenstig |
| Kimi K2.5 | openrouter | $0.60/$3.00 | 256K Kontext |

## PENDING — Naechste Session

### P1: Patrol UI (DRINGEND)
- [ ] **PATROL-Karte** in Pool-Stats-Bar (neben Scout) mit Modell-Dropdown
- [ ] **Scout Console Block** in Builder-Seite:
  - Live-Status (idle/scanning/signal)
  - Aktuelle Datei + Fortschritt
  - Letzte Events (clean/signal/triaged)
  - Findings-Liste mit Verify/Dismiss Buttons
  - Deep Patrol Trigger: Model-Checkboxen + Datei-Auswahl + "Patrol starten"
- [ ] **Exclude-Editor**: Pfade hinzufuegen/entfernen

### P2: Patrol Index-Path pruefen
- [ ] Routine scannt aktuell 5 Server-Dateien pro Runde
- [ ] Client-Dateien nicht verfuegbar auf Render (nur dist/)
- [ ] Pruefen ob alle Server-Dateien korrekt gelesen werden

### P3: SESSION-STATE.md updaten
- [ ] S21 Stand mit Patrol, Consolidation, Audio

### P4: Provider-Specs updaten
- [ ] GLM-5.1 hinzufuegen ($1.00/$3.20, SWE-Bench Pro 58.4)

### P5: Governed Builder Shell Spec
- [ ] ChatGPT-Analyse als Grundlage
- [ ] Command-Registry + Audit-Ledger Design
- [ ] Phase 2 nach Builder-Finish

## Geaenderte Dateien (S21)
- server/src/lib/scoutPatrol.ts — NEU (~420 Zeilen)
- server/src/index.ts — Patrol mount + start
- server/src/lib/builderFusionChat.ts — JSON-Parse-Fix, maxTokens 800
- server/src/lib/requireDevToken.ts — Token-Fix
- client/src/modules/M16_builder/ui/BuilderStudioPage.tsx — Konsolidierung + Chat-Fixes
- client/src/modules/M16_builder/ui/BuilderConfigPanel.tsx — NEU (Pool-Panel)
- client/src/app/App.tsx — /maya Route entfernt
- docs/SESSION-STATE.md — Deploy-Trigger

## Architektur-Entscheidungen
- [DECISION] Patrol = Verdachtsorgane, nicht Bug-Richter (ChatGPT v0.2 Analyse)
- [DECISION] Cross-Referenz: 2 guenstige Scouts auf gleiche Dateien → Confidence-Boost
- [DECISION] Deep Patrol manuell triggerbar mit Premium-Modellen
- [DECISION] GLM-5.1 in Pool aufgenommen (SWE-Bench #1, $1.00/$3.20)
- [DECISION] Governed Builder Shell = Phase 2 nach Builder-Finish
- [DECISION] Provider-Routing erst umstellen wenn Builder fertig

## Kosten-Schaetzung Patrol
- Routine: ~$0.30-0.50/Tag (2 guenstige Scouts, stuendlich)
- Deep: ~$0.30/Tag (1x am Tag auf kritische Dateien)
- Gesamt: unter $1/Tag, unter $25/Monat
