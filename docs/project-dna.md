# Soulmatch Project DNA

## Produkt
Soulmatch ist eine spirituelle Multi-Persona Chat-App. Nutzer chatten mit
KI-Personas die verschiedene esoterische Methoden beherrschen. Die App soll
warm, einladend und mystisch wirken — nicht klinisch oder technisch.
Deployed auf: soulmatch-1.onrender.com

## Personas
SPEZIALISTEN (Berechnungen + Interpretation):
- Stella — Astrologie (Vedisch), provider: gpt-5-mini
- Kael — Numerologie, modern/faktisch, KEIN Fantasy. Provider: grok-4-1-fast
- Lian — BaZi (Chinesisch), provider: DeepSeek
- Sibyl — Tarot, provider: gpt-5-mini
- Amara — Chakren/Energiearbeit, provider: DeepSeek
- Luna — Mondzyklen, provider: DeepSeek

BEGLEITER (Companion-Funktion):
- Maya — Haupt-Begleiterin, "Casting-Direktorin" im Arcana Studio, provider: gpt-5-nano
- Orion — männlicher Begleiter, provider: gpt-5-nano (Being-Umbenennung zu 'Kaya' in `docs/beings/kaya.md` dokumentiert, Code-Rename steht noch aus — erfolgt zusammen mit Maya-Core-Migration)
- Lilith — provokant aber nie beleidigend, provider: grok-4-1-fast

## Berechnungs-Engines
Alle esoterischen Berechnungen laufen LOKAL (kosten $0):
- BaZi-Engine, Vedische Engine, Tarot-Engine, Chakra-Engine, Human-Design-Engine
- LLM wird NUR für Interpretation der Ergebnisse genutzt, nicht für Berechnungen
- Methoden-Priorität: BaZi/Lian (HIGH), Vedic/Stella (HIGH), Tarot/Sibyl (MEDIUM),
	Chakra/Amara (MEDIUM), Human Design (LOW)

## Credit-System
- Free: 100 Tokens (100 Zeichen = 1 Token, 50 Zeichen = 1 Audio-Token)
- Starter: $3.99/Monat
- Premium: $8.99/Monat
- Credits Dashboard als eigener Tab

## UI-Architektur
- Chat inline (KEIN Modal)
- PersonaBar: 1-3 selektierbar, farbcodiert
- Persistenter minimierbarer Audio-Player
- Arcana Studio: Standalone /studio Route, 3-Spalten Layout
	(Persona-Liste | Maya Chat | Tuning-Panel mit 8 Accordion-Blöcken)
- 9 Sprachen geplant

## Tech-Stack & Konventionen
- TypeScript strict, React 18, Vite, Express, PostgreSQL (Drizzle ORM)
- pnpm als Package Manager
- Audio: Gemini 2.5 Flash Preview TTS (PCM WAV, Mono, 24kHz, 16bit)
- Images: fal.ai
- Voice Input: useSpeechToText.ts

## Code-Stil
- Deutsch für Commit-Messages und Logs
- Englisch für Code, Variablennamen, Kommentare
- Funktionale Komponenten mit Hooks (kein Class-based React)
- Utility-Funktionen in eigene Dateien unter lib/

## Architektur-Regeln (KRITISCH)
- CHAT_VISIBLE_BLACKLIST für geschützte Dateien respektieren
- Bestehende Patterns prüfen bevor neue erstellt werden (REUSE FIRST)
- Audio/Mic: IMMER von DiscussionChat.tsx ableiten (DO NOT REBUILD)
- Server-Routen: Express Router mit Token-Auth
- DB: Drizzle ORM, Schema in server/src/schema/
- KEIN git add -A, KEIN auto-push — Gürcan released Pushes manuell
- Maya-Farbe: Violet #7c6af7 (NICHT Jade #1D9E75, gehört zu Bluepilot)

## Schlüssel-Dateien
CLIENT:
- DiscussionChat.tsx — Haupt-Chat-Komponente
- PersonaGrid.tsx, PersonaBar.tsx, PersonaPicker.tsx — Persona-Auswahl
- useSpeechToText.ts — Voice Input

SERVER:
- providers.ts — Multi-Provider LLM-Routing (OpenAI, Anthropic, Google, DeepSeek, xAI, Zhipu)
- personaRouter.ts — Persona-spezifisches LLM-Routing
- studio.ts — Arcana Studio Backend
- studioPrompt.ts — Maya Casting-Direktorin Prompts

BUILDER (Opus-Bridge):
- opusBridge.ts — 7 API-Endpoints
- opusBridgeController.ts — Execute-Logik
- opusRoundtable.ts — Roundtable + Patch-Validator
- opusChainController.ts — Task-Ketten
- opusPulseCrush.ts — Pulse-Crush (Ambient/Case/Heavy)
- opusScoutRunner.ts — 4 parallele Scouts
- opusBudgetGate.ts — Session Budget

## Qualitäts-Anspruch
- Jede Datei muss durch: cd client && pnpm typecheck UND cd server && pnpm build
- Kein toter Code, keine auskommentierten Blöcke
- Fehler-Handling: try/catch mit spezifischen Fehlermeldungen
- Tests: LIVE-PROBE Methodik (curl + Puppeteer + Audio-Analyse)

## Übergeordnete Vision
Soulmatch ist Teil eines Ökosystems:
- Maya Core — KI-Begleiterin App (eigenes Repo)
- AICOS — Wissensregister mit 101+ Karten (GitHub: G-Dislioglu/aicos-registry)
- Bluepilot — Autonomes App-Building System (geplant)
- TreeGraphOS v0.3.2 — Föderierte Architekturspec (in AICOS Registry)
- Crush v4.1 — Denk- und Suchsystem mit 12 Operatoren (Legacy, integriert in TreeGraphOS)

Gürcan Dişlioğlu ist Solo-Unternehmer und Produkt-Architekt. Er arbeitet abends.
Er bevorzugt direkte, ehrliche Bewertungen — Schwächen klar benennen, Lob nur bei echtem Wert.