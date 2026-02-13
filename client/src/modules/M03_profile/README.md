# M03 — Profile & Onboarding

**Summary:** Profil erfassen, validieren und lokal persistieren; Onboarding-Skip.

## Features
- ProfileForm (Name, Geburtsdatum, Geburtszeit, Geburtsort)
- Validation (name 2..40, birthDate YYYY-MM-DD not future, time HH:MM, place max 80)
- LocalStorage persistence (key: soulmatch.profile.v1)
- ProfileSummary (read-only mit Bearbeiten/Löschen)
- Automatischer Form→Summary Wechsel nach Speichern

## Public Exports
- `index.ts`: ProfileForm, ProfileSummary, loadProfile, saveProfile, clearProfile, hasValidProfile

## Dependencies
- M02 (Button, Input, Card)

## Non-Goals
- Kein Server-Sync im MVP
- Kein Multi-Profile im MVP

## Smoke Test
1) App öffnen → Form sichtbar
2) Name + Datum setzen → Speichern → Summary sichtbar
3) Seite reload → Summary bleibt
4) Löschen → Form sichtbar
