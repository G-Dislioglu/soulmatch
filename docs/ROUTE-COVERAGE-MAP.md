# Route Coverage Map

Last updated: 2026-05-01
Repo head: `025ee8b`
Live head at verification: `7c2bf7bab4e019a02722787230ebb7f3ab9e42a7`

## Purpose

This file is the narrow route-orientation map for Soulmatch product/runtime work.
It is not a changelog and not a truth-sync surrogate. Its job is to show:

- which public route families have recent live evidence
- which dependencies make a route probe meaningful or misleading
- which families remain weakly covered or class-shift prone

## Status Keys

- `live-verified`: recently probed against production and behavior confirmed
- `runtime-verified`: verified through a real runtime side-effect path
- `code-read`: route family read from repo, but not freshly live-probed in this map
- `historical-only`: known from older builder work, but not freshly re-probed here
- `protected/internal`: token-gated or builder-only; not part of normal product smoke coverage

## Probe Caveats

1. Render wake-up `502` can masquerade as an app bug.
   Retry against `/api/health` before classifying a one-off `502` as a route defect.

2. `/api/discuss` is not a provider-guard route in the same sense as `/api/studio` or `/api/guide`.
   A body field like `provider: "bogus"` is currently ignored by the route's multi-persona routing path.

3. `/api/studio` with `soloPersona='maya'` can enter Deep Mode and return before `saveSessionMemory()`.
   That path is not a valid probe for `session_memories` writes.

4. DB-backed create/update routes can look narrow at the HTTP layer but widen quickly into `class_2`.
   Treat `/api/profile` and similar persistence routes accordingly.

## Product Route Families

| Route family | Current status | Recent evidence | Dependency notes | Next useful probe |
| --- | --- | --- | --- | --- |
| `/api/studio` | `live-verified` + `runtime-verified` | 2026-05-01: bogus provider -> `400`; earlier Phase A live verification proved real `session_memories` write path through normal `/studio` flow | External LLM providers, persona routing, Deep Mode branch, `memoryService`, optional profile lookup, optional TTS | Probe one non-memory validation edge outside provider/whitespace class only if a fresh product need appears |
| `/api/discuss` | `live-verified` | 2026-05-01: correctly formed body with `provider: "bogus"` -> `200`, response still routed via persona mapping (`provider: "gemini"`) | Multi-persona routing; body `provider` is not the authoritative selector; probe quality depends on valid `message` + `personas[]` shape | Only revisit if product decision says body-level provider should become official input |
| `/api/guide` | `live-verified` | 2026-05-01: bogus provider -> `400`; whitespace-only `systemPrompt`/`userMessage` previously hardened | External LLM provider mapping, API keys | Low urgency; already good narrow guard coverage |
| `/api/match/narrative` | `live-verified` | 2026-05-01: empty/whitespace names -> `400`; valid names remain `200` | Local narrative payload builder + quality gate; no direct DB dependency | Closed for current empty/whitespace class |
| `/api/match/calc` | `code-read` | No fresh live probe in this map | Local scoring fusion; depends on numerology payload and optional astro-derived inputs | Probe only if a scoring regression or input-shape bug is suspected |
| `/api/match/single` | `live-verified` | 2026-05-01: whitespace-only `profileA.birthDate` -> `400`; valid numerology-only control body -> `200` | Numerology + astrology fusion, nested profile inputs, optional timezone/time-driven astrology branch | Current required-birthDate boundary is already green |
| `/api/journey/optimal-dates` | `live-verified` | 2026-05-01: whitespace-only `eventType` -> `400`; valid control body -> `200` | Swiss Ephemeris fallback path, deterministic fallback logic, date-range handling | Current required-field trim boundary is already green |
| `/api/astro/*` | `code-read` | `/api/health` reports `sweph: true` on 2026-05-01 | Swiss Ephemeris native dependency; request validity can fail on date/time/location format | Probe if astrology-specific runtime truth is needed, not as a generic filler test |
| `/api/numerology/calc` | `live-verified` | 2026-05-01: whitespace-only required fields -> `400`; valid minimal body -> `200` | Pure local deterministic calculation | Current empty/trim boundary is already green |
| `/api/scoring/calc` | `live-verified` | 2026-05-01: whitespace-only `profileId` -> `400`; valid minimal numerology payload -> `200` | Pure local scoring; no provider call | Current contract boundary is already green |
| `/api/profile/*` | `live-verified` | 2026-05-01: whitespace-only `name` or `birthDate` on `POST` -> `400`; whitespace-only `name`/`birthDate` on `PUT` -> `400`; valid control create -> `201` | Direct DB writes/reads via `profiles`; persistence boundary already tightened for trimmed required fields | Next probe only if a broader profile-contract question appears |
| `/api/geo/autocomplete` | `code-read` | No fresh live probe in this map | Static city corpus + in-process cache/throttle; no external API | Cheap functional probe available, but currently lower value than persistence routes |
| `/api/arcana/*` | `code-read` | No fresh live probe in this map | Persona-definition DB tables, TTS, voice catalogs, moderation-ish config payloads | Separate family; not a tight follow-up to recent memory/validation work |

## Internal / Protected Families

These families exist, but they are not the next product-coverage lane unless the task explicitly moves there:

- `/api/builder/*`
- `/api/builder/opus-bridge/*`
- `/api/builder/patrol/*`
- `/api/context/*`
- `/api/architect/*`
- `/api/dev/*`

Reason: token gates, builder-core semantics, multi-step side effects, or non-product workflows.

## Current Read of the Next Candidates

1. No obvious mandatory validation candidate remains in the recently probed public route families.

2. The next worthwhile route block should come from a genuinely new family or a more semantic contract question, not from repeating already-green trim/required-field cases.

3. If a new candidate is needed, prioritize one of:
   - a fresh profile-contract question beyond trimmed required fields
   - a route with external-service degradation risk that is not already covered by the current provider/memory caveats
   - a policy/operating-boundary clarification instead of another route fix

## Immediate Conclusion

There is no new mandatory bug-fix block visible in the currently probed product route families.
The practical constraint is no longer missing trim/required-field hardening on these routes, but choosing the next candidate without inventing work or smuggling in a policy decision.
