# M04 — Astrology Engine Adapter

**Summary:** Schnittstelle + Adapter-Layer für echte Astrologie-Berechnung (Swiss Ephemeris später).

## Features
- AstrologyEngine interface (compute: Request → Result)
- buildAstrologyRequestFromProfile (defaults: tropical, placidus, all include true)
- StubAstrologyEngine (deterministisch, seed = profileId+birthDate+birthTime)
- computeAstrology convenience function (default stub)

## Public Exports
- `index.ts`: AstrologyEngine (type), buildAstrologyRequestFromProfile, StubAstrologyEngine, computeAstrology

## Dependencies
- shared/types/astrology (Contracts)
- shared/types/profile (UserProfile für Request Builder)

## Non-Goals
- Keine echte Swiss Ephemeris Integration im MVP (nur Stub)
- Keine UI in diesem Modul

## Smoke Test
1) buildAstrologyRequestFromProfile(profile) → valider AstrologyRequest mit defaults
2) computeAstrology(request) → AstrologyResult mit planets/angles/houses/aspects Arrays
3) Gleicher Input → gleicher Output (deterministisch)
