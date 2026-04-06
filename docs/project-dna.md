# Soulmatch Project DNA

## Produkt
Soulmatch ist eine spirituelle Multi-Persona Chat-App. Nutzer chatten mit
KI-Personas die verschiedene esoterische Methoden beherrschen (BaZi, Vedisch,
Tarot, Chakren, Human Design). Die App soll warm, einladend und mystisch
wirken — nicht klinisch oder technisch.

## Tech-Stack & Konventionen
- TypeScript strict, React, Vite, Express, PostgreSQL (Drizzle ORM)
- Deployed auf Render (soulmatch-1.onrender.com)
- Express-Middleware Pattern für alle API-Routen
- Keine externen Pakete wenn eine native Lösung < 50 Zeilen möglich ist
- pnpm als Package Manager

## Code-Stil
- Deutsch für Commit-Messages und Logs
- Englisch für Code, Variablennamen, Kommentare
- Funktionale Komponenten mit Hooks (kein Class-based React)
- Utility-Funktionen in eigene Dateien unter lib/

## Architektur-Regeln
- CHAT_VISIBLE_BLACKLIST für geschützte Dateien respektieren
- Bestehende Patterns prüfen bevor neue erstellt werden (reuse-first)
- Audio/Mic: IMMER von DiscussionChat.tsx ableiten (do_not_rebuild)
- Server-Routen: Express Router mit Token-Auth
- DB: Drizzle ORM, Schema in server/src/schema/

## Qualitäts-Anspruch
- Jede Datei muss durch pnpm typecheck + pnpm build
- Kein toter Code, keine auskommentierten Blöcke
- Fehler-Handling: try/catch mit spezifischen Fehlermeldungen