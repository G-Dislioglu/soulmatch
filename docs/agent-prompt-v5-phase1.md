# ARCANA STUDIO v5 — Phase 1: Layout-Umbau

## REFERENZ
Lies zuerst `docs/arcana-studio-v5.html` komplett. Das ist der Design-Prototyp. Baue das Arcana Studio exakt nach diesem Prototyp um.

## WAS SICH ÄNDERT (Überblick)
Das bisherige 3-Spalten-Layout (Liste | Tuning-Formular | Preview) wird zu:
- **Links (220px):** Persona-Liste — bleibt wie jetzt, keine Änderung
- **Mitte (1fr):** NEUER Chat mit Maya als "Casting-Direktorin" — ersetzt das Tuning-Formular
- **Rechts (380px):** Live-Vorschau OBEN (sticky) + darunter alle Tuning-Blöcke als aufklappbare Akkordeons

## PHASE 1 AUFGABE — NUR LAYOUT + RECHTE SPALTE
Noch KEINEN Chat bauen. Nur:

1. **ArcanaStudioPage.tsx** — Grid ändern: `220px 1fr 380px`. Mittelspalte bekommt einen Platzhalter `<div>Chat kommt in Phase 2</div>`
2. **Rechte Spalte** — Neue Komponente `ArcanaRightPanel.tsx` die enthält:
   - **Oben (sticky):** Live-Vorschau (verschiebe `ArcanaLivePreview` hierher), OHNE Director Prompt und Beispiel-Antwort — nur Snapshot-Card + Mini-Bars
   - **Darunter (scrollbar):** Alle Tuning-Blöcke aus `ArcanaPersonaTuning.tsx` als aufklappbare Akkordeon-Sektionen. Exakt die Blöcke die schon existieren: Quirks, Charakter, Ton, Stimme, Maya Special
3. **Akkordeon-Stil** — Jeder Block hat:
   - Header: `#16161F` Hintergrund, farbiger 7px-Dot, Cinzel-Titel, Badge rechts, Chevron `▸` (rotiert bei offen)
   - Body: `#111118` Hintergrund, Inhalt wie bisher
   - Klick auf Header togglet open/closed

## DATEIEN DIE BETROFFEN SIND
- `client/src/modules/M09_arcana/ui/ArcanaStudioPage.tsx` — Grid-Layout
- `client/src/modules/M09_arcana/ui/ArcanaRightPanel.tsx` — NEU
- `client/src/modules/M09_arcana/ui/ArcanaLivePreview.tsx` — verschlanken (nur Card + Bars)
- `client/src/modules/M09_arcana/ui/ArcanaPersonaTuning.tsx` — wird in Akkordeon-Blöcke innerhalb RightPanel integriert

## REGELN
- Git Bash, NIEMALS PowerShell
- `pnpm typecheck` + `pnpm build` vor Commit
- Commit-Message: `refactor(arcana): v5 layout — right panel with preview + tuning accordion`
- Farben/Fonts/Abstände: Exakt wie in `docs/arcana-studio-v5.html`
- Keine neuen npm-Pakete
