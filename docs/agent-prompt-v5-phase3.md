# ARCANA STUDIO v5 — Phase 3: Neue Tuning-Sektionen

## REFERENZ
`docs/arcana-studio-v5.html` — Rechte Spalte, die drei neuen Akkordeon-Blöcke.

## AUFGABE
Drei neue Akkordeon-Blöcke in `ArcanaRightPanel.tsx` hinzufügen, zwischen Quirks und Charakter:

### 1. Fähigkeiten & Wissen (Dot: Teal)
Drei Kategorien mit Tag-Chips:
- **Wissensdomänen** — Teal-Tags (`rgba(78,206,206,0.12)` bg, `rgba(78,206,206,0.3)` border)
- **Interaktionsmodi** — Violet-Tags (gleiche Struktur, violet Farben)
- **Werkzeuge** — Gold-Tags (gleiche Struktur, gold Farben)
- Jede Kategorie hat ein `<input>` am Ende zum Hinzufügen neuer Tags
- Tags haben ×-Button zum Entfernen
- Kategorie-Label: 10px uppercase, letter-spacing 1.5px, `#5A5A6E`

### 2. Widersprüche / Spannungsprofil (Dot: Orange #E8A838)
- Jeder Widerspruch ist eine Card: `#16161F` bg, 3px orange left-border, border-radius 8px
- Inhalt: Zwei Pole mit `↔` dazwischen (12px, font-weight 500), darunter Beschreibung (Cormorant Garamond italic, 12px, `#8A8A9A`)
- Button "+ Widerspruch hinzufügen" unten (dashed border, orange)

### 3. Quellen · Verankerung (Dot: Maya-Violet)
- Liste angehängter Dateien mit Icon (PDF=rot, IMG=teal, TXT=violet), Name, Detail-Zeile, und "✓ X Merkmale" Badge
- In Phase 3 nur statische UI — Quellen werden in Phase 4 mit Chat-Attachments verknüpft

## DATENMODELL
Erweitere den Arcana Persona Type um:
```ts
skills?: {
  knowledge: string[];
  interaction: string[];
  tools: string[];
};
contradictions?: Array<{
  poleA: string;
  poleB: string;
  description: string;
}>;
sources?: Array<{
  name: string;
  type: 'pdf' | 'image' | 'text';
  extractedCount: number;
}>;
```

## REGELN
- Git Bash, `pnpm typecheck` + `pnpm build` vor Commit
- Commit: `feat(arcana): v5 skills, contradictions, sources tuning blocks`
- Reihenfolge in rechter Spalte: Preview → Quirks → Fähigkeiten → Widersprüche → Charakter → Ton → Stimme → Quellen → Maya Special
