# M08 — Studio/Roundtable Chat

**Summary:** Interaktives Chat-Panel mit vier Perspektiven (Maya, Luna, Orion, Karma) — deterministischer Stub, feature-flagged.

## Features
- StudioEngine interface (compute: StudioRequest → StudioResult)
- StubStudioEngine: deterministische Persona-Texte (seed-basiert)
- 4 Personas: Maya (strukturiert), Luna (emotional), Orion (analytisch), Karma (skeptisch)
- StudioPanel: Input + Turns + nextSteps + watchOut
- StudioPage: Layout mit Back-Button
- SeatBadge + TurnsView Primitive

## Public Exports
- `index.ts`: StudioEngine (type), StubStudioEngine, SeatBadge, TurnsView, StudioPanel, StudioPage

## Dependencies
- M02 (Card, Button)
- shared/types/studio

## Non-Goals
- Kein echter AI-Provider im MVP (→ M08.2 LLM Adapter)
- Nur profile mode in v1 (match mode später)

## Smoke Test
1) Summary → "Studio öffnen" → Chat UI sichtbar
2) Nachricht eingeben → 4 Persona-Turns + 3 nextSteps + 1 watchOut
3) Gleicher Input → gleicher Output (deterministisch)
