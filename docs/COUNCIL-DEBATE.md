# Council Debate Engine

Endpoint: POST /api/builder/opus-bridge/council-debate

Designed by GLM 5.1, corrections by Claude Opus.

## Usage
```json
{
  "topic": "Your architecture question",
  "context": "Optional context",
  "requirements": ["list of requirements"],
  "constraints": ["list of constraints"]
}
```

## Roles
- Architekt (Claude Opus) — Vision, Patterns, Gesamtbild
- Skeptiker (GPT-5.4) — Risiken, Edge Cases, Failure Modes
- Pragmatiker (DeepSeek) — Was bauen wir heute Abend?
- Maya Moderator (Claude Opus) — Synthese, Score 0-100

Results are stored in chatPool (phase=roundtable) and visible in the Council LIVE feed.
