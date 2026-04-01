# ARCANA STUDIO v5 — Phase 2: Maya Chat

## REFERENZ
`docs/arcana-studio-v5.html` — Mittelspalte "CHAT WITH MAYA" Bereich.

## AUFGABE
Baue die Chat-Komponente für die Mittelspalte:

1. **Neue Komponente:** `ArcanaCreatorChat.tsx`
2. **Layout:**
   - Header: Maya-Avatar (violet gradient) + "MAYA · CASTING-DIREKTORIN" (Cinzel) + Subtitle "Persona-Erstellung durch Dialog"
   - Messages-Bereich: Scrollbar, Maya-Bubbles links (bg `#16161F`), User-Bubbles rechts (bg `rgba(124,106,247,0.15)` mit violet border)
   - Input-Bereich: Attachment-Chips oben, Textarea mit 📎-Button links und ↑-Senden-Button rechts, Box-Border wird violet bei Focus
3. **Attachment-Support:**
   - 📎-Button öffnet File-Input (accept: `.pdf,.png,.jpg,.jpeg,.txt`)
   - Ausgewählte Dateien als Chips über der Textarea anzeigen (mit ×-Entfernen)
   - Files werden NICHT hochgeladen in Phase 2 — nur UI. Upload kommt in Phase 3.
4. **Maya Intro-Message:** Hardcoded erste Nachricht mit 3 Suggestion-Chips (Historische Figur, Fiktiver Charakter, Eigene Erfindung). Klick auf Chip setzt ihn als User-Nachricht.
5. **Nachrichten-State:** Einfacher `useState<Message[]>` mit `{role: 'maya'|'user', content: string, attachments?: File[]}`. In Phase 2 antwortet Maya noch NICHT — nur User kann tippen und Messages erscheinen.

## STYLING — Exakt wie Prototyp
- Maya-Avatar: `linear-gradient(135deg, #7c6af7, #9b8aff)`, 28px im Chat, 36px im Header
- User-Avatar: `#242433`, Initiale "G"
- Suggestion-Chips: `#242433` bg, `#2E2E40` border, hover: violet border + violet-dim bg
- Extraction-Cards: NICHT in Phase 2, kommt mit LLM-Anbindung
- Fonts: DM Sans body, Cinzel für Header

## INTEGRATION
- In `ArcanaStudioPage.tsx`: Mittelspalte-Platzhalter ersetzen durch `<ArcanaCreatorChat />`

## REGELN
- Git Bash, `pnpm typecheck` + `pnpm build` vor Commit
- Commit: `feat(arcana): v5 creator chat — Maya casting director UI`
- Keine npm-Pakete, keine API-Calls
