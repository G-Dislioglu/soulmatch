# LiveTalk Audio Deploy Checkliste

## Request/Contract
- [ ] In `/api/discuss` request is `audioMode:true` for Live path?
- [ ] Response has `audio_url` when `audioMode:true`?
- [ ] Response has `tts_engine_used` + `tts_mime_type` (authoritative server telemetry)?
- [ ] If `audio_url` exists but `tts_engine_used` missing: treat as contract bug.

## Flags / Runtime
- [ ] `VITE_DISABLE_LIVE_AUDIO` is **not** set to `true` in production.
- [ ] `TTS_ENGINE_PRIORITY=gemini-first` set on Render (or explicit override decision documented).
- [ ] `DISABLE_GEMINI_TTS` is not accidentally `true`.

## Playback path
- [ ] `normalizeAudioUrl()` is applied before `audio.play()` for `data:` URLs.
- [ ] Browser console shows `onplay` and `canplay` for the new audio.
- [ ] Audible output confirmed on target device.

## Resilience
- [ ] Provider retry/backoff active for transient transport/HTTP failures.
- [ ] Failures are logged with enough context (provider/model/persona/request timing).

## Manual E2E chain
- [ ] `audioMode:true` -> `audio_url` -> `tts_engine_used` -> normalize -> `onplay` -> `canplay` -> audible output.
