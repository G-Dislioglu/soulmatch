# AI Start Pack — Soulmatch

## Canonical entry points
- `m08-discussion-chat` → main chat reference module (audio/mic canonical)
- `discussion-chat-file` → pauseSpeechForAudio + scheduleResumeSpeechAfterAudio
- `use-speech-to-text` → central speech hook — import, never duplicate
- `arcana-api` → backend SSE/TTS seam

## Active hotspots
- `m09-arcana` — Arcana Studio creator shell (high volatility)
- `arcana-creator-chat` — 880 LOC, frequent bugs
- `arcana-api` — 780 LOC, 3 Gemini calls per message

## Reuse candidates
- Arcana audio/mic → COPY from DiscussionChat.tsx (copy_exact, conf: 0.88)
- Fusion Engine routing → ADAPT from Maya Provider Registry (adapt_pattern, conf: 0.75)

## Forbidden / do-not-rebuild
- `audio-mic-rule`: No new standalone audio/mic subsystem
- `discussion-chat-file`: do_not_rebuild=true
- `use-speech-to-text`: do_not_rebuild=true

## High-risk seams
- arcana-api → backend SSE/TTS/extraction (timeout, keepalive, multi-call)
- discussion-chat-file → audio pause/resume boundary
- use-speech-to-text → speech hook ↔ playback interaction

## Orientation advice
1. Start with `discussion-chat-file` for any audio/mic work
2. Compare against canonical M08 behavior before modifying Arcana
3. Respect `audio-mic-rule` — reuse over rebuild
4. Use VAL-K2 workflow for verification
