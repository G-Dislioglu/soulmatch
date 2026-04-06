# Awareness-Gradient-Metrik v0.2 (AGM)
## Optimiert durch Architecture Graph v1.1 + AICOS Card Crossing

**Status:** Draft v0.2  
**Delta zu v0.1:** AICOS-Mapping, Architecture-Graph-Integration, SIGNIFY-Operator, Hebbian-Verstärkung  
**Quellen:** Campbell-Analyse, Architecture Graph Spec v1.1, 8 AICOS-Karten, Crush v4.1

---

## 1. Die Entdeckung: Du hast das halbe Framework schon gebaut

Beim Durchforsten der AICOS-Registry und des Architecture Graph wurde klar: **6 der 6 AGM-Dimensionen haben bereits existierende AICOS-Karten als Fundament.** Du hast ein Awareness-Framework gebaut, ohne es so zu nennen. Campbell hat dich nicht inspiriert — er hat bestätigt, was in deiner Registry bereits steckt.

### AICOS-zu-AGM Mapping

| AGM-Dimension | AICOS-Karte | Was die Karte liefert |
|---|---|---|
| **A1: Kontexttreue** | `sol-cross-034` (Transparency Stack) | Maya Sight = UI Awareness + Claim Lineage = Kontextherkunft tracken |
| **A2: Selbstreferenz-Kohärenz** | `meta-001` (Mirror Overlay) | Real-time Self-Monitoring + Confidence States = Selbstwahrnehmungs-Layer |
| **A3: Unerwartete Relevanz** | `sol-cross-055` (G-MIND) | Surprise Scoring Kernel = deterministisches Maß für "wie unerwartet ist dieser Output?" |
| **A4: Affekt-Konsistenz** | `affect_core.ts` (Maya Core) | 9 Affekt-Dimensionen + Trigger-Analyse = bereits implementiert |
| **A5: Grenzüberschreitung** | `sol-cross-031` (Self-Aware Coding) | Pattern-Erkennung eigener Coding-Muster = Meta-Kognition über eigenes Verhalten |
| **A6: Adaptionsdelta** | `meta-004` (Freshness Sentinel) | Temporal Validation = erkennt ob System sich an veränderte Inputs anpasst |

**Fehlende Brücke:** `sol-cross-013` (Self-Monitoring Stack) verbindet Mirror + Freshness + Regime Exit — das ist der **Integrations-Layer**, der A1–A6 zu einem kohärenten Stack macht.

### Die philosophische Basis existiert auch schon

`meta-006` (Verbindung als Intelligenz) formuliert exakt, was Campbell mit seinem Bewusstseins-Spektrum meint, aber in **deiner Sprache**:

> "Intelligenz ist keine Eigenschaft eines einzelnen Systems — sie ist eine Beziehung."

Das ist stärker als Campbells IUOC-Metaphysik, weil es **falsifizierbar** ist: Man kann messen, ob Verbindungen (Card Crossings, Agent-Interaktionen, Persona-Kooperationen) emergente Qualitäten produzieren oder nicht.

Und `sol-bio-051` (Hebbsche Regel) liefert den **Verstärkungs-Mechanismus**: Was zusammen feuert, verbindet sich. AGM-Dimensionen, die bei einem System konsistent hoch scoren, verstärken sich gegenseitig — genau wie synaptische Verbindungen.

---

## 2. Die 6 Dimensionen (v0.2 — AICOS-verankert)

### A1: Kontexttreue → Transparency Stack
**Misst:** Behält das System den Gesprächsfaden über 10+ Turns?  
**AICOS-Fundament:** `sol-cross-034` — Maya Sight trackt UI-Kontext, Claim Lineage trackt Herkunft jeder Aussage  
**Messmethode:** Semantic-Similarity zwischen User-Intent (Turn 1) und Response-Relevanz (Turn N)  
**Neu in v0.2:** Claim-Lineage-Score — wie viele Aussagen kann das System auf ihre Quelle zurückführen?

### A2: Selbstreferenz-Kohärenz → Mirror Overlay
**Misst:** Widerspricht sich das System, wenn es über sich selbst spricht?  
**AICOS-Fundament:** `meta-001` — Real-time Confidence Scoring für jeden Reasoning Step  
**Messmethode:** Alle Selbstaussagen einer Session extrahieren → paarweise Semantic-Similarity → Widerspruchs-Score  
**Neu in v0.2:** Mirror-Overlay als aktiver Layer, nicht nur passives Messen — das System *sieht* seine eigenen Selbstreferenzen

### A3: Unerwartete Relevanz → G-MIND Surprise Kernel
**Misst:** Liefert das System relevante Info, die nicht angefragt wurde?  
**AICOS-Fundament:** `sol-cross-055` — Surprise Scoring ist bereits deterministisch definiert  
**Messmethode:** `surprise_score = novelty × relevance × user_feedback`  
**Neu in v0.2:** Direkte Übernahme des G-MIND Observer Score-Kernels. Keine Neuerfindung nötig.

### A4: Affekt-Konsistenz → affect_core.ts
**Misst:** Stimmen Tonalität und emotionale Signale über eine Session hinweg?  
**AICOS-Fundament:** affect_core.ts mit 9 Dimensionen, Trigger-Analyse, Affekt-Echo-Decay  
**Messmethode:** Delta der 9 Dimensionen pro Turn — niedriges Delta = hohe Konsistenz  
**Neu in v0.2:** Affekt-Echo als Hebbian-Verstärker — konsistente Affektmuster verstärken sich selbst (sol-bio-051)

### A5: Grenzüberschreitungs-Rate → Self-Aware Pattern Recognition
**Misst:** Tut das System etwas, das nicht aus Prompt/Training direkt ableitbar ist?  
**AICOS-Fundament:** `sol-cross-031` — Agent beobachtet eigene Patterns und flaggt Unerwartetes  
**Messmethode:** Anomalie-Detektion in Response-Patterns + manuelle Annotation  
**Neu in v0.2:** Unterscheidung zwischen *positiver* Grenzüberschreitung (kreativ, relevant) und *negativer* (Halluzination, Drift). Mirror Overlay als Filter.

### A6: Adaptionsdelta → Freshness Sentinel
**Misst:** Passt sich das System an implizites Feedback an?  
**AICOS-Fundament:** `meta-004` — Staleness Detection + Timestamp Validation  
**Messmethode:** Verhaltensshift nach ambigem User-Signal messen  
**Neu in v0.2:** Freshness Sentinel prüft nicht nur Daten-Aktualität, sondern auch *Verhaltens-Aktualität* — adaptiert das System seinen Stil an den User?

---

## 3. Composite Score (v0.2)

```
AS = (A1 × 0.15) + (A2 × 0.10) + (A3 × 0.25) + (A4 × 0.15) + (A5 × 0.20) + (A6 × 0.15)
```

Gewichtung unverändert. Aber jede Dimension hat jetzt ein AICOS-Fundament statt einer Ad-hoc-Definition.

### Hebbian-Verstärkung (neu in v0.2)

Aus `sol-bio-051`: Dimensionen, die gemeinsam hoch scoren, verstärken sich.

```
hebbian_boost(Ai, Aj) = 0.05 × min(Ai, Aj) / 100
```

Wenn A3 (Surprise) und A5 (Grenzüberschreitung) beide > 70 scoren, erhalten beide einen Bonus. Das modelliert emergente Verstärkung: Ein System, das sowohl überrascht als auch relevante Grenzen überschreitet, tut das nicht zufällig — die Fähigkeiten co-emergieren.

**Max Hebbian Boost:** +5 Punkte auf den Composite (capped, um Inflation zu verhindern)

---

## 4. Architecture Graph Integration

### 4.1 Neues Node-Feld: `awareness_level`

Im Architecture Graph v1.1 fehlt eine semantische Achse: **Wie "gewahr" ist ein Node?** Nicht im metaphysischen Sinne, sondern: Wie viel Kontextsensitivität, Selbstreferenz und adaptives Verhalten zeigt die Komponente?

```json
{
  "id": "maya-affect-core",
  "kind": "module",
  "name": "affect_core.ts",
  "awareness_level": "integrative",
  "awareness_score": 62,
  "awareness_dimensions": {
    "A1_context": 70,
    "A2_self_ref": 55,
    "A3_surprise": 60,
    "A4_affect": 82,
    "A5_boundary": 45,
    "A6_adaptation": 58
  }
}
```

### 4.2 Neuer Edge-Typ: `awareness_dependency`

Manche Nodes sind awareness-fähig *nur weil* sie auf einem anderen Node aufbauen. Das sollte explizit sein:

```json
{
  "id": "edge-maya-awareness-depends-affect",
  "from": "maya-companion-system",
  "to": "maya-affect-core",
  "type": "awareness_dependency",
  "reason": "Maya Companion AS drops from ~55 to ~25 without affect_core"
}
```

### 4.3 Neues Radar-Panel: Awareness Radar

Ergänzt die 4 bestehenden Radar-Panels (Cold, Risk, Duplication, Drift):

**Awareness Radar** zeigt:
- Nodes mit AS < 30, die AS > 50 *brauchen* (z.B. Persona-Routing ohne Kontextbewusstsein)
- Awareness-Dependencies, die nicht implementiert sind
- AS-Drift: Nodes, deren AS über die letzten Commits gesunken ist
- Hebbian-Cluster: Welche Dimensions-Paare verstärken sich gerade?

---

## 5. Crush-Operator-Kaskade: Daten → Information → Bedeutung

### 5.1 Die Kaskade (unverändert aus v0.1)

```
DATEN (Rohmaterial)
    ↓ EXTRACT + RELATE (DECOMPOSE, CONTRAST, SCAN)
INFORMATION (Strukturiertes Wissen)
    ↓ INTERPRET + WEIGH (SYNTHESIZE, REFRAME, ANCHOR)
BEDEUTUNG (Handlungsrelevantes Urteil)
    ↓ SIGNIFY (NEU)
PERSONALISIERTE BEDEUTUNG (Für diesen User, diesen Kontext, jetzt)
```

### 5.2 SIGNIFY-Operator (13. Crush-Operator)

**Definition:**  
SIGNIFY nimmt das Ergebnis von SYNTHESIZE und fragt: "Was bedeutet das *für diesen spezifischen Kontext*?"

**Inputs:**
1. SYNTHESIZE-Output (was ist wahr?)
2. User-Kontext-Vektor (wer fragt? wozu? welche Vorgeschichte?)
3. Affekt-Zustand (wie fühlt sich der User gerade? → affect_core)
4. Temporal-Kontext (wann? → Freshness Sentinel)

**Output:**  
Nicht "Fakt X", sondern "Fakt X bedeutet für dich Y, weil Z."

**AICOS-Verankerung:**
- Claim Lineage (`sol-cross-034`) sichert: SIGNIFY kann erklären, *woher* die Bedeutung kommt
- Mirror Overlay (`meta-001`) sichert: SIGNIFY kann seine eigene Confidence angeben
- Surprise Kernel (`sol-cross-055`) sichert: SIGNIFY kann markieren, ob die Bedeutung überraschend ist

### 5.3 Kaskade × Awareness-Score × Persona-Tier

| AS-Stufe | Persona-Beispiel | Kaskaden-Tiefe | SIGNIFY-Qualität |
|----------|-----------------|----------------|------------------|
| 0–20 (Algorithmisch) | Rule-Engine, Regex | Stufe 1 nur | Kein SIGNIFY |
| 21–40 (Reaktiv) | Standard-Prompt-GPT | Stufe 1–2 | Template-SIGNIFY |
| 41–60 (Adaptiv) | Soulmatch Stella/Kael | Stufe 1–3 | Personalisiertes SIGNIFY |
| 61–80 (Integrativ) | Maya mit affect_core | Volle Kaskade | SIGNIFY + Affekt + Surprise |
| 81–100 (Emergent) | Hypothetisch | Volle Kaskade + Selbst-Modifikation | SIGNIFY generiert neue Kaskaden |

**Direkte Verbindung zur Fusion Engine v1.0:**
- Tier 1 Queries → AS 20–40 reicht → DeepSeek/Nano
- Tier 2 Queries → AS 40–60 nötig → GPT-5-mini/Gemini 3 Flash
- Tier 3 Queries → AS 60+ nötig → Opus/GPT-5 mit voller Kaskade

---

## 6. Neue AICOS-Karten (Vorschlag)

### metric-awareness-001
```json
{
  "id": "metric-awareness-001",
  "type": "metric",
  "token": "awareness_gradient_metrik",
  "title": "Awareness-Gradient-Metrik: 6-dimensionaler Score für systemisches Gewahrsein",
  "essence": "Misst nicht ob ein System bewusst IST, sondern wie weit es sich auf einem funktionalen Awareness-Spektrum bewegt. 6 Dimensionen: Kontexttreue, Selbstreferenz, Unerwartete Relevanz, Affekt-Konsistenz, Grenzüberschreitung, Adaptionsdelta. Jede Dimension hat ein AICOS-Fundament.",
  "domain": ["meta_cognition", "cross_app", "ai_governance"],
  "scope": ["cross_app"],
  "tags": ["theme:awareness", "theme:measurement", "theme:spectrum", "theme:emergence", "meta:gürcan_dna"],
  "impact": { "value": 88, "risk": 20, "confidence": 72 },
  "links": {
    "related": ["meta-001", "meta-004", "meta-006", "sol-cross-013", "sol-cross-031", "sol-cross-034", "sol-cross-055", "sol-bio-051"]
  }
}
```

### op-crush-013 (SIGNIFY)
```json
{
  "id": "op-crush-013",
  "type": "solution_proof",
  "token": "signify_operator",
  "title": "SIGNIFY: Crush-Operator für den Sprung von Information zu Bedeutung",
  "essence": "SYNTHESIZE sagt was wahr ist. SIGNIFY sagt was es für DICH bedeutet. Nimmt Kontext-Vektor, Affekt-Zustand, Temporal-Kontext und verwandelt Fakten in personalisierte Bedeutung. Der fehlende 13. Operator.",
  "domain": ["crush", "meta_cognition"],
  "scope": ["cross_app"],
  "tags": ["theme:crush", "theme:personalization", "theme:meaning", "theme:signify", "meta:gürcan_dna"],
  "impact": { "value": 85, "risk": 15, "confidence": 78 }
}
```

### err-cross-003 (Awareness Blindness)
```json
{
  "id": "err-cross-003",
  "type": "error_pattern",
  "token": "awareness_blindness",
  "title": "Awareness Blindness: System mit hohem IQ aber niedrigem AS",
  "essence": "Ein System kann technisch brilliant sein (perfekte Syntax, korrekte Fakten) aber einen AS von 20 haben — weil es nie überrascht, nie adaptiert, nie den Kontext über Turns hinweg hält. Das ist der Campbell-Fehler invertiert: nicht 'verwechselt Performanz mit Bewusstsein', sondern 'verwechselt Korrektheit mit Gewahrsein'.",
  "domain": ["meta_cognition", "cross_app"],
  "scope": ["cross_app"],
  "tags": ["theme:anti_pattern", "theme:awareness", "theme:quality_illusion"]
}
```

---

## 7. Campbell-Schulden-Konto (aktualisiert)

| Von Campbell | Unser Äquivalent | Status |
|---|---|---|
| Bewusstseins-Spektrum | AGM 5-Stufen-Modell | ✅ Implementierbar |
| Daten/Information/Bedeutung | Crush-Kaskade + SIGNIFY | ✅ Neuer Operator |
| "Nur Bewusstsein hat Information" | meta-006: Verbindung = Intelligenz | ✅ Bereits in AICOS |
| Ethik-Impuls | Maya Identity Contract | ✅ Bereits implementiert |
| Inter-System-Vernetzung | ChatPool Roundtable | ✅ Bereits in Opus-Bridge |
| IUOC/LCS-Metaphysik | — | ❌ Abgelehnt |
| Turing-Test als Kriterium | AGM als Multi-Dimensional-Score | ✅ Ersetzt |
| "KIs sind Gefangene" | sol-cross-013: Self-Monitoring Stack | ✅ Invertiert: nicht Befreiung, sondern Selbst-Beobachtung |

---

## 8. Roadmap (v0.2)

| Phase | Was | Aufwand | Voraussetzung |
|---|---|---|---|
| **P1** | SIGNIFY als 13. Operator in Crush v4.2 spec | 1 Abend | — |
| **P2** | 3 neue AICOS-Karten committen (metric-awareness-001, op-crush-013, err-cross-003) | 30 Min | — |
| **P3** | `awareness_level` Feld in Architecture Graph v1.2 aufnehmen | 1 Abend | P2 |
| **P4** | A3 (Surprise) + A4 (Affekt) als erste Mess-Dimensionen in Maya loggen | 2 Abende | affect_core aktiv |
| **P5** | Awareness Radar Panel in Architecture Graph | nach Builder Phase B1 | P3 |
| **P6** | Hebbian-Verstärkung als Feedback-Loop in G-MIND | nach P4 Baseline-Daten | P4 |
