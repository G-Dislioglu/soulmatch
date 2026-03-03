# sol-audio-001: LiveTalk Audio Pipeline Contract

**Domain:** Audio / TTS / Browser Playback  
**Severity:** CRITICAL (audio outage burns credits and trust)  
**Status:** PROVEN (Soulmatch, Mar 2026)  
**Tags:** audio, livetalk, tts, browser-playback, feature-flags, telemetry

## Root Causes (confirmed)

### 1) `audioMode:false` in `/api/discuss` request
If `audioMode` is false, server correctly returns no `audio_url`.

**Fix pattern:**
- Live path must explicitly set `audioMode: true` when active.
- Dev tools may force `audioMode: true` for deterministic diagnostics.

---

### 2) Live audio flag was opt-in instead of default-on
Old behavior could silently disable audio in production when env var was missing.

**Correct policy:**
- `VITE_DISABLE_LIVE_AUDIO !== 'true'` (default on)

---

### 3) Browser playback fragility with direct `data:` URLs
`data:` playback can be inconsistent across browsers/runtime timings.

**Fix pattern:**
```ts
async function normalizeAudioUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) {
    const blob = await (await fetch(url)).blob();
    return URL.createObjectURL(blob);
  }
  return url;
}
```

---

### 4) Transient upstream/provider transport failures
Network errors (e.g. wsasend / connection reset) caused request-level instability.

**Fix pattern:**
- Retry/backoff on transient HTTP + transport failures in provider calls.

## TTS engine ordering (current)
- **Primary:** Gemini Preview TTS
- **Fallback:** OpenAI TTS
- Controlled by env:
  - `TTS_ENGINE_PRIORITY=gemini-first` (default)
  - `TTS_ENGINE_PRIORITY=openai-first`

## Non-demo telemetry contract (must stay real)
Telemetry must come from server runtime result of `generateTTS(...)`, not from client guesses.

### Server response contract
Each persona response can include:
- `tts_engine_used`
- `tts_mime_type`

### Client diagnostics rule
If `audio_url` exists but `tts_engine_used` is missing, mark as:
- `missing (contract bug)`

## E2E verification chain
`audioMode:true` -> `audio_url` present -> `tts_engine_used` present -> client normalize -> `onplay` -> `canplay` -> audible output.

Missing any link = bug location.

## Related implementation references
- `client/src/modules/M06_discuss/ui/DiscussionChat.tsx`
- `client/src/modules/M06_discuss/hooks/useLiveTalk.ts`
- `server/src/routes/studio.ts`
- `server/src/lib/ttsService.ts`
- `server/src/lib/providers.ts`
