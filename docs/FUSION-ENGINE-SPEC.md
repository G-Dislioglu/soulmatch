# FUSION ENGINE — Architektur-Spec v1.0

**Datum:** 01. April 2026
**Projekt:** Soulmatch → später Maya Core → Bluepilot
**Modul:** `server/src/lib/fusionEngine.ts`
**Status:** Spec — noch nicht implementiert

---

## Vision

Eine Persona besteht nicht aus einem Modell, sondern aus einem **Ensemble**.
Der User spricht mit einer Stimme (Gemini), aber hinter den Kulissen arbeitet
ein Team aus 2–3 KI-Providern zusammen. Gemini ist der Frontmann — er redet,
schreibt, macht TTS. Die anderen liefern Substanz.

Soulmatch dient als **Testlabor**: Hier wird die Orchestrierung erprobt,
gemessen und verfeinert, bevor das Pattern in Maya Core und Bluepilot wandert.

---

## Architektur-Übersicht

```
User-Nachricht
      │
      ▼
┌─────────────────────┐
│  Complexity Router   │ ← Gemini classifiziert: Tier 1/2/3
│  (gemini-2.5-flash)  │   Kosten: ~0.0001$ pro Klassifikation
└──────┬──────────────┘
       │
       ├── Tier 1 (einfach) ──────────► Gemini Solo
       │   80% aller Nachrichten         → direkte Antwort + TTS
       │                                 → Latenz: wie jetzt (~3-5s)
       │
       ├── Tier 2 (mittel) ──────────► Gemini + 1 Experte
       │   15% aller Nachrichten         → Single-Round parallel
       │                                 → Latenz: +2-3s
       │
       └── Tier 3 (komplex) ─────────► Gemini + 2 Experten + Debate
            5% aller Nachrichten         → Multi-Round (2-3 Runden)
                                         → Latenz: +6-10s
```

---

## Rollen-System

Angelehnt an Maya Core Provider-Registry (scout/worker/reasoner):

### Frontmann (immer Gemini)
- **Aufgabe:** Spricht mit dem User, hält den Persona-Ton, macht TTS
- **Model:** gemini-2.5-flash
- **Wann aktiv:** IMMER — jede Antwort geht durch Gemini
- **Besonderheit:** Bekommt bei Tier 2/3 die Experten-Ergebnisse
  als Kontext und formuliert sie im Persona-Stil um

### Scout (günstigste KI)
- **Aufgabe:** Complexity-Klassifikation, Voranalyse, Fakten sammeln
- **Model:** DeepSeek-chat V3.2 ($0.028/1M cached)
- **Wann aktiv:** Vor jeder Nachricht (Klassifikation), bei Tier 2/3 als Vorarbeiter
- **Prompt:** ~50 Tokens, Antwort: "TIER:1|2|3" + kurze Begründung

### Worker (mittlere KI)
- **Aufgabe:** Analyse, Recherche, Code-Review, Faktencheck
- **Model:** gpt-5-mini ($0.25/$2.00) oder DeepSeek-chat
- **Wann aktiv:** Tier 2 und 3
- **Besonderheit:** Arbeitet parallel zum Scout

### Reasoner (stärkste KI)
- **Aufgabe:** Architektur, komplexe Logik, Widersprüche auflösen, Synthese
- **Model:** Claude Sonnet 4.6 ($3.00/$15.00) oder gpt-5 ($1.25/$10.00)
- **Wann aktiv:** Nur Tier 3
- **Besonderheit:** Bekommt Scout + Worker Ergebnisse, liefert finale Analyse

---

## Ablauf im Detail

### Tier 1 — Gemini Solo (Standard)

```
User: "Hi, wie geht's?"
  → Scout: TIER:1 (Smalltalk)
  → Gemini antwortet direkt
  → TTS → Audio
Gesamtzeit: ~3-5s
Kosten: ~$0.0002
```

### Tier 2 — Duo (Gemini + Worker)

```
User: "Erkläre mir den Unterschied zwischen REST und GraphQL"
  → Scout: TIER:2 (Fachwissen, aber kein tiefes Reasoning)
  → PARALLEL:
      Worker (DeepSeek): Technische Analyse, Vor/Nachteile
      Gemini: Filler-Audio abspielen ("Lass mich kurz nachdenken...")
  → Worker-Ergebnis an Gemini
  → Gemini formuliert im Persona-Ton um + TTS
Gesamtzeit: ~5-8s
Kosten: ~$0.001
```

### Tier 3 — Triple mit Debate (Gemini + Worker + Reasoner)

```
User: "Soll ich mein Backend von Express auf Fastify migrieren?
       Hier ist mein aktuelles Setup: [Code]"
  → Scout: TIER:3 (Architekturentscheidung, braucht tiefe Analyse)
  → Gemini: Filler-Audio ("Das ist eine spannende Frage, lass mich
     das von verschiedenen Seiten betrachten...")
  → RUNDE 1 — PARALLEL:
      Worker (DeepSeek): Performance-Vergleich, Migration-Aufwand
      Reasoner (Claude): Architektur-Bewertung, Risiken, Empfehlung
  → RUNDE 2 — DEBATE (optional):
      Worker sieht Reasoner-Antwort → Gegenargumente/Ergänzungen
      Reasoner sieht Worker-Antwort → Finale Synthese
  → DESTILLATION:
      Scout fasst Debate-Ergebnis in 3-5 Kernpunkte zusammen
  → Gemini bekommt destilliertes Ergebnis + formuliert als Persona
  → TTS
Gesamtzeit: ~8-15s
Kosten: ~$0.01-0.02
```

---

## Filler-Integration (Wartezeitüberbrückung)

Bei Tier 2/3 merkt der User die Wartezeit. Lösung: Gemini
antwortet SOFORT mit einem kontextbezogenen Filler, während die
Experten arbeiten.

### SSE Event-Flow:

```
1. data: {"type":"filler_text","content":"Gute Frage! Lass mich kurz..."}
2. data: {"type":"filler_audio","base64":"..."}
   ↑ User hört Persona sprechen, Experten arbeiten im Hintergrund
3. data: {"type":"text_delta","content":"Also, ..."} ← echte Antwort
4. data: {"type":"text_done","content":"..."}
5. data: {"type":"audio","base64":"..."}
```

### Filler-Generierung:
- Tier 2: Gemini generiert 1 Satz Filler basierend auf der Frage
- Tier 3: Nutze bestehenden fillerCatalog.ts (160 Phrasen, 67 Audio)
  + dynamischen Gemini-Filler für Kontext

---

## Scout-Destiller Pattern

Übertragen aus Maya Core Spec (CE-1 bis CE-6):

### Complexity Classifier Prompt (Scout):

```
Klassifiziere diese Nachricht für eine KI-Persona.
Kontext: [letzte 3 Nachrichten]
Nachricht: [aktuelle Nachricht]

Antworte NUR mit:
TIER:1 — Smalltalk, Begrüßung, einfache Fakten, Bestätigungen
TIER:2 — Erklärungen, Vergleiche, Fachwissen, Listen
TIER:3 — Architektur, Code-Analyse, Entscheidungen, Strategie,
          Widersprüche auflösen, mehrstufige Probleme

Format: TIER:[1|2|3]|[Begründung in 5 Worten]
```

### Destiller Prompt (nach Debate):

```
Du bist der Destiller. Fasse die Experten-Diskussion zusammen.

Experte A (Worker): [Worker-Antwort]
Experte B (Reasoner): [Reasoner-Antwort]
Debate-Runde: [falls vorhanden]

Destilliere in:
1. KERN-ERKENNTNIS: [1 Satz]
2. ARGUMENTE: [3-5 Bullets]
3. EMPFEHLUNG: [1 Satz]
4. CONFIDENCE: [0.0-1.0]
5. DISSENS: [wo die Experten uneins waren, falls relevant]

Format: JSON
```

---

## Fusion-Config pro Persona

In der Persona-Definition (Arcana Studio / DB):

```typescript
interface FusionConfig {
  enabled: boolean;           // false = Gemini Solo wie bisher
  frontman: 'gemini';         // immer Gemini (TTS + Ton)
  scout: ProviderKey;         // z.B. 'deepseek'
  worker: ProviderKey;        // z.B. 'deepseek' oder 'openai-mini'
  reasoner: ProviderKey;      // z.B. 'claude-sonnet' oder 'openai'
  debateRounds: 1 | 2 | 3;   // Max Runden bei Tier 3
  fillerStrategy: 'catalog' | 'dynamic' | 'both';
  maxLatencyMs: number;       // Timeout — nach X ms liefert Gemini Solo
  costCapPerMessage: number;  // Max Kosten pro Nachricht in $
}

// Default-Config für neue Personas:
const DEFAULT_FUSION: FusionConfig = {
  enabled: false,
  frontman: 'gemini',
  scout: 'deepseek',
  worker: 'deepseek',
  reasoner: 'openai-mini',
  debateRounds: 1,
  fillerStrategy: 'catalog',
  maxLatencyMs: 12000,
  costCapPerMessage: 0.02
};
```

---

## Implementierungs-Phasen

### Phase F1: Complexity Router (Grundlage)
- `fusionEngine.ts` mit `classifyComplexity()` Funktion
- Scout-Call vor jeder Nachricht
- Logging: Tier-Verteilung messen (erwartung: 80/15/5)
- Kein Verhaltensunterschied — alle Tiers gehen noch an Gemini Solo
- **Ziel:** Daten sammeln, Classifier tunen

### Phase F2: Duo-Modus (Tier 2)
- Worker-Call parallel zu Gemini-Filler
- Gemini-Synthese mit Worker-Ergebnis
- Filler-Audio während Wartezeit
- A/B-Test: Fusion vs. Solo Antwortqualität messen

### Phase F3: Triple mit Debate (Tier 3)
- Reasoner-Integration
- Multi-Round Debate (1-2 Runden)
- Destiller-Zusammenfassung
- Timeout-Fallback: Wenn Debate zu lang → Gemini Solo

### Phase F4: UI + Credits
- Fusion-Toggle im Arcana Studio (Tuning-Akkordeon)
- Credit-Kosten für Fusion-Nachrichten (Tier 2: 3T, Tier 3: 8T)
- "Deep Thinking" Indikator im Chat-UI
- Latenz-Anzeige: "Kai konsultiert seine Experten..."

### Phase F5: Metriken + Transfer
- Dashboard: Tier-Verteilung, Kosten, Latenz, Qualität
- Pattern dokumentieren für Maya Core Transfer
- fusionEngine.ts als standalone Modul extrahieren
- AICOS-Card: Erfahrungen, Best Practices, Fallstricke

---

## Kosten-Projektion (1000 Nachrichten/Tag)

| Szenario | Berechnung | Kosten/Tag |
|----------|-----------|------------|
| Ohne Fusion | 1000 × Gemini Solo | ~$0.20 |
| Mit Fusion | 800×T1 + 150×T2 + 50×T3 | ~$1.50 |
| Worst Case | 500×T1 + 300×T2 + 200×T3 | ~$5.00 |

Budget Gate: $20/Tag Hard Limit (aus Bluepilot-Spec übernommen)

---

## Risiken + Mitigationen

| Risiko | Wahrscheinlichkeit | Mitigation |
|--------|-------------------|------------|
| Ton-Inkonsistenz zwischen Tiers | MITTEL | Gemini als einziger Output-Former, starker Persona-Prompt |
| Latenz bei Tier 3 zu hoch | HOCH | maxLatencyMs Timeout + Filler-Audio |
| Scout klassifiziert falsch | MITTEL | Fallback: Gemini Solo ist immer safe |
| Kosten explodieren | NIEDRIG | costCapPerMessage + Budget Gate |
| Debate-Ergebnis schlechter als Solo | NIEDRIG | A/B-Test in Phase F2, Rollback möglich |
| Provider-Ausfall (einer offline) | MITTEL | Graceful Degradation → Gemini Solo |

---

## Context-Bridging

Das zentrale technische Problem: Wenn der Reasoner nur bei Tier 3
einspringt, kennt er die vorherigen 15 Turns nicht.

### Lösung: Compressed Context Window

```typescript
interface FusionContext {
  // Immer mitgeschickt an Worker/Reasoner:
  personaPrompt: string;        // Wer ist die Persona?
  conversationSummary: string;  // Scout destilliert alle N Turns
  lastNMessages: Message[];     // Letzte 3-5 Turns vollständig
  currentQuery: string;         // Aktuelle User-Nachricht

  // Nur bei Tier 3:
  workerAnalysis?: string;      // Worker-Ergebnis aus Runde 1
  reasonerAnalysis?: string;    // Reasoner-Ergebnis aus Runde 1
}
```

### Conversation-Summary (alle 5 Turns):
Scout erstellt eine komprimierte Zusammenfassung des bisherigen
Gesprächs (~100 Tokens). Das ist billig und gibt dem Reasoner
genug Kontext, ohne die volle History zu schicken.

---

## Verbindung zu bestehender Architektur

| Bestehendes Modul | Fusion-Engine Nutzung |
|---|---|
| `providers.ts` → `callLlm()` | Alle Provider-Calls laufen hierüber |
| `personaRouter.ts` | Erweitert um FusionConfig pro Persona |
| `fillerCatalog.ts` | Filler-Audio für Tier 2/3 Wartezeit |
| `ttsService.ts` | Gemini TTS bleibt unverändert — nur Frontmann |
| `studio.ts` (Soulmatch-Chat) | Erster Integrationspunkt für Fusion |
| Maya Core Provider-Registry | Scout/Worker/Reasoner Rollen übernommen |
| Bluepilot Council of AIs | Debate-Pattern (3 Runden) übernommen |
| AICOS Registry | Erfahrungen als Cards dokumentieren |

---

## Erfolgskriterien

1. **Qualität:** Tier 3 Antworten sind messbar besser als Gemini Solo
   (blind test mit 20 komplexen Fragen, Gürcan bewertet)
2. **Latenz:** Tier 2 ≤ 8s, Tier 3 ≤ 15s (mit Filler gefühlt kürzer)
3. **Kosten:** ≤ $5/Tag bei 1000 Nachrichten
4. **Ton:** User bemerkt keinen Stilbruch zwischen Tiers
5. **Transfer:** fusionEngine.ts funktioniert standalone in Maya Core

---

*Spec erstellt: 01. April 2026, 22:30 Uhr*
*Nächster Schritt: Phase F1 nach Abschluss von Arcana Studio Phase 5*
