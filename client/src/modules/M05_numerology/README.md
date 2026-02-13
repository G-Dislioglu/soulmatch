# M05 — Numerology Engine

**Summary:** Numerologie-Kernberechnungen (Pythagorean) mit stabilen Ergebnisobjekten.

## Features
- NumerologyEngine interface (compute: Request → Result)
- buildNumerologyRequestFromProfile (default: pythagorean)
- Pythagorean system: Life Path, Expression, Soul Urge, Personality, Birthday
- Master Numbers (11, 22, 33) werden nicht weiter reduziert
- Breakdown traces für jede Berechnung

## Public Exports
- `index.ts`: NumerologyEngine (type), buildNumerologyRequestFromProfile, computeNumerology

## Dependencies
- shared/types/numerology (Contracts)
- shared/types/profile (UserProfile für Request Builder)

## Non-Goals
- Keine UI in diesem Modul
- Keine alternativen Systeme (Kabbala etc.) im MVP

## Smoke Test
1) buildNumerologyRequestFromProfile(profile) → valider NumerologyRequest
2) computeNumerology(request) → NumerologyResult mit numbers + breakdown
3) Gleicher Input → gleicher Output (deterministisch)
