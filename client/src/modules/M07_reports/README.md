# M07 — Reports & Rendering

**Summary:** UI-Rendering für Profile Report und Score Report mit Section-basiertem Layout.

## Features
- Section: wiederverwendbarer Card-basierter Abschnitt
- ReportLayout: zentrierter Container mit Titel
- ScoreBar: Progressbar 0–100 mit Label
- ClaimsList: sortierte Claims mit Level-Badges (positive/caution/info)
- ProfileReport: Read-only Profildaten
- ScoreReport: Overall Score + Breakdown Bars + Claims
- ReportPage: kombiniert Profile + Score Report mit Back-Button

## Public Exports
- `index.ts`: Section, ReportLayout, ScoreBar, ClaimsList, ProfileReport, ScoreReport, ReportPage

## Dependencies
- M02 (Card, Button)
- shared/types (UserProfile, ScoreResult, ExplainClaim)

## Non-Goals
- Kein PDF-Export im MVP
- Kein Match-Report im MVP (erst M07.1)

## Smoke Test
1) Profil speichern → Summary → "Score berechnen" → Report mit Overall Score + 3 Bars + Claims
2) "Zurück" → Summary
3) Claims sortiert nach |weight|, Badges sichtbar
