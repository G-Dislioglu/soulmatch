# M11 — Matching Engine

**Summary:** Vergleicht zwei Profile via M06 Scores und liefert MatchScoreResult (0–100) + Claims.

## Features
- MatchEngine interface (compute: MatchRequest → MatchScoreResult)
- Diff-basiertes Matching: numerology/astrology/fusion Subscores
- Claims: positive bei kleiner Differenz, caution bei großer
- matchOverall = round(0.45*num + 0.45*astro + 0.10*fusion)

## Public Exports
- `index.ts`: MatchEngine (type), computeMatch

## Dependencies
- M06 (computeScore)
- shared/types/match, scoring

## Non-Goals
- Kein ML/AI Matching im MVP

## Smoke Test
1) Zwei Profile anlegen (M03)
2) computeMatch({aProfileId, bProfileId}) → MatchScoreResult mit matchOverall + claims
3) Claims enthalten Referenzen auf beide Profile
