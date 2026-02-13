# M06 — Scoring & Correlation Layer

**Summary:** Kombiniert Astrologie+Numerologie zu Score (0–100) + Begründungs-Claims.

## Features
- ScoringEngine interface (compute: ScoreRequest → ScoreResult)
- scoreNumerology: Subscore 0–100 aus NumerologyCoreNumbers (Master Numbers bonus)
- scoreAstrology: Subscore 0–100 aus AstrologyResult (Aspekte, Winkel, Planeten)
- scoreFusion: Interaktions-Subscore (Alignment-Bonus, Divergenz-Malus, Master+Harmonie)
- scoreOverall = round(0.55*num + 0.35*astro + 0.10*fusion), clamped 0–100
- ExplainClaims mit id, level, title, detail, weight, evidence

## Public Exports
- `index.ts`: ScoringEngine (type), computeScore, buildScoreRequestFromProfile, scoreNumerology, scoreAstrology, scoreFusion

## Dependencies
- M03 (loadProfile)
- M04 (computeAstrology, buildAstrologyRequestFromProfile)
- M05 (computeNumerology, buildNumerologyRequestFromProfile)
- shared/types/scoring, numerology, astrology

## Non-Goals
- Keine UI in diesem Modul (→ M07)
- Kein ML/AI Scoring im MVP

## Smoke Test
1) Profil anlegen (M03)
2) computeScore({profileId}) → ScoreResult mit scoreOverall 0–100
3) claims[] ist nicht leer, jeder Claim hat id + level + evidence
