# Council of Masters — Vision und Phasen-Plan

> **Dokument-Typ:** Vision-Anker (keine Implementierung, kein Status).  
> **Zuletzt aktualisiert:** 22. April 2026  
> **Autor-Kontext:** Gürcan Dişlioğlu mit Claude Opus 4.7 als Architektur-Partner

---

## Was ist der Council of Masters

Der Council ist **eine neue Chat-Surface** in Soulmatch, in der mehrere hochwertige Top-KIs (Claude Opus 4.7, GPT-5.4, Grok 4.1, DeepSeek, GLM-Familie, MiniMax M2.7, Kimi K2.5, Qwen 3.6+, Sonnet 4.6) als **echte Denkpartner** zusammenarbeiten.

Er ist **nicht** identisch mit dem bestehenden Builder-Worker-Swarm. Worker arbeiten parallel an Code-Aufgaben und werden per Judge ausgewählt. Der Council **denkt gemeinsam** — jede KI sieht die Beiträge der anderen, reagiert darauf, baut auf neuen Erkenntnissen aus der Runde weiter.

Der Council ist auch **nicht** identisch mit dem bestehenden "Maya und Spezialisten"-Chat. Der Spezialisten-Chat nutzt fachliche Personas (Luna, Amara, Stella, Kael, Sibyl...) mit festen spirituellen Rollen. Der Council nutzt **Top-LLMs selbst** als Denker mit unterschiedlichen Denk-Akzenten, nicht Rollen-Zwangsjacken.

## Kernprinzipien

**Maya ist immer dabei.** Sie moderiert, ordnet, fasst zusammen, crossed und crushed Erkenntnisse aus den Council-Beiträgen. Die KI hinter Maya ist vom User auswählbar (Opus 4.7, Sonnet 4.6, Gemini 3 Pro, Gemini 3.1 Flash-Lite, GLM 5.1 — je nach Kostenempfinden und Aufgabentyp).

**2-5 Council-KIs werden vom User aus einem Pool gewählt.** Dieser Pool spiegelt den bereits etablierten Builder-Pool (siehe Builder Studio UI). Kandidaten: Opus 4.7, Sonnet 4.6, GPT-5.4, Grok 4.1, DeepSeek Chat, GLM 5 Turbo, GLM 5.1, MiniMax M2.7, Kimi K2.5, Qwen 3.6+. Die genaue Kandidatenliste wird in `docs/provider-specs.md` als Wahrheitsquelle gehalten.

**Die Pool-Auswahl persistiert.** Sobald der User 3 Master ausgewählt hat, bleibt diese Auswahl über Sessions hinweg stehen — kein Zurückspringen auf Default. Nur der User selbst oder Maya im definierten Autonomie-Rahmen dürfen die Auswahl ändern.

**Maya darf die Auswahl verändern.** Wenn eine Runde eine Perspektive erfordert die fehlt, darf Maya einen Master hinzufügen. Wenn ein Master wenig beiträgt, darf Maya ihn aus dem aktuellen Thema entfernen. Jede Änderung ist **sichtbar** im Chat mit Begründung. Der User kann jederzeit rückgängig machen oder die Autonomie-Erlaubnis zurücknehmen.

**Hitzige Debatten sind erwünscht.** Kein Konsens-Zwang. Wenn DeepSeek und Opus zu gegensätzlichen Schlüssen kommen, soll der Widerspruch stehen bleiben. Maya notiert den Dissens und gibt ihn dem User in ihrer Synthese weiter. Weichspülen ist ausdrücklich unerwünscht — der Wert des Councils liegt gerade in unterschiedlichen Denkrichtungen.

**Kommunikationsrichtung ist klar definiert:**  
Der User (Beobachter) spricht mit Maya. Maya hört, ordnet, aktiviert Council, fasst zusammen, gibt zurück. Die Council-Mitglieder sprechen untereinander — sie sehen die Beiträge der anderen Masters in der gleichen Runde und reagieren darauf. Sie sprechen nicht direkt mit dem User, sondern über Maya als Moderatorin.

**LiveTalk ist vorgesehen.** Maya spricht via TTS, Council-Beiträge erscheinen als Text, bei Bedarf auch mit Stimmen pro Master. Die technische Basis liegt in der bestehenden LiveTalk-Infrastruktur.

---

## Die 70%→90%-These

Die Grundhypothese: Eine Denkaufgabe bei der eine einzelne Top-KI etwa 70% Wert liefert, kann durch Council-Arbeit auf 90% kommen.

Bedingungen unter denen die These plausibel ist:

- Die beteiligten KIs **denken tatsächlich unterschiedlich**. Opus und Sonnet allein wären zu homogen. Die Mischung aus Anthropic, OpenAI, xAI, chinesischen Providern (Zhipu, MiniMax, Moonshot, Qwen), DeepSeek liefert echte Divergenz in Trainingsverteilung, Fine-Tuning-Kultur, Denkstil.
- Sie **reagieren aufeinander**, nicht parallel. Runde 2 baut auf Runde 1 auf, jede KI sieht und verarbeitet was vorher gesagt wurde.
- Ein **Moderator** strukturiert ohne zu verengen. Mayas Rolle ist kritisch — zu viel Eingriff erstickt den Dialog, zu wenig lässt ihn driften.

Ob die These empirisch stimmt, wird durch Phase 1 messbar. Der Maßstab ist nicht "funktioniert es technisch", sondern "liefert ein 3-Master-Dialog zu einer echten Architekturfrage bessere Tiefe und Klarheit als Opus-Solo zur gleichen Frage".

---

## Technische Basis — was schon da ist

Soulmatch hat die Infrastruktur für Multi-Provider-Dialog bereits im Backend:

- `server/src/routes/studio.ts` Zeile 1030+: `/api/discuss` akzeptiert `personas[]` Array, jede Persona bekommt einen eigenen `callProvider(...)`-Call, jede sieht `accumulatedContext` der vorherigen Antworten.
- `server/src/lib/providers.ts`: universeller Dispatcher, unterstützt bereits `gemini, anthropic, openai, xai, deepseek, openrouter, zhipu`. Mit S36-F00 (cf37ccc, 22.04.2026) auch Opus 4.7 mit adaptive thinking. OpenRouter-Pfad deckt Kimi, MiniMax, Qwen ab.
- `server/src/lib/personaRouter.ts`: `PERSONA_PROVIDERS` Mapping, `getProviderForPersona(id)` Dispatcher.
- `server/src/studioPrompt.ts` Zeile 891+: `buildDiscussPrompt` konstruiert pro Persona System-Prompt inklusive Runden-Tisch-Kontext ("Folgende Personas sind heute dabei..." plus bereits erfolgte Antworten).
- `client/src/modules/M06_discuss`: Chat-UI mit Spezialisten-Liste, Persona-Karten, Maya-Moderator-Overlay.

Das heißt: Phase 1 ist **keine Neuentwicklung**, sondern **gezielte Erweiterung** des bestehenden Discuss-Systems um Master-Personas.

---

## Phasen-Plan

### Phase 1 — Master-Personas in bestehender Discuss-Infrastruktur

**Ziel:** Beweis dass Multi-Provider-Council-Dialog technisch läuft und hochwertige Ergebnisse produziert.

**Scope:**
- 5 Master-Personas in `personaRouter.ts` definieren: `master_opus`, `master_gpt54`, `master_deepseek_r`, `master_glm_turbo`, `master_grok`. Alle nutzen bereits integrierte Provider, keine neuen Integrationen.
- `PersonaTier` um `'master'` erweitert, `ProviderName` um `anthropic`, `zhipu`, `openrouter` erweitert.
- System-Prompts mit Denk-Akzenten in `studioPrompt.ts`: strukturell-ethisch (Opus), vielseitig-faktentreu (GPT), mathematisch-logisch (DeepSeek-R), synthetisierend (GLM-Turbo), provokativ-herausfordernd (Grok). Explizit mit Anti-Konsens-Klausel: "Konsens nicht erzwingen, widersprich wenn du Widersprüche siehst".
- UI: Master erscheinen in der bestehenden Spezialisten-Liste, optional mit eigener Master-Section.
- Pool-Auswahl, Persistenz, Maya-Modell-Auswahl, dedizierte Surface: **nicht** in Phase 1.

**Messung:** Live-Test mit 3 Master an einer echten Bluepilot-Architekturfrage. Vergleich mit Opus-Solo-Antwort zur selben Frage.

**Geschätzter Aufwand:** 1 Copilot-Session (2-3 Stunden).

### Phase 2 — Dedizierte Council-Surface + Persistenz

**Ziel:** Aus Feature-Test eine echte Produkt-Surface machen.

**Scope:**
- Neue Route `/council` mit eigener Seite analog `/builder`.
- Pool-Auswahl-UI mit Master-Chips wie im Builder-Pool-Screenshot.
- Neue DB-Tabelle `council_state` für persistente User-Auswahl (gewählte Master + gewähltes Maya-Modell + Autonomie-Erlaubnis).
- Maya-Modell-Dropdown: User wählt welche KI hinter Maya steht.
- Heated-Debate-Toggle: "harmonisch ↔ hitzig" beeinflusst System-Prompt-Akzent.
- `/api/council/round` Endpoint als spezialisierte Variante von `/api/discuss` (oder Erweiterung desselben mit Council-Mode-Flag).

**Messung:** Pool-Auswahl bleibt über Session-Neustart erhalten. Mehrere unterschiedliche Frage-Typen durchlaufen den Council mit konsistent hochwertigen Syntheses von Maya.

**Geschätzter Aufwand:** 2-3 Copilot-Sessions.

### Phase 3 — Maya-Autonomie und Scout-Integration

**Ziel:** Council wird dynamisch und kann recherchieren.

**Scope:**
- Maya darf innerhalb einer Antwort `[COUNCIL_ADD: id]` / `[COUNCIL_REMOVE: id]` / `[SCOUT_REQUEST: query]` ausgeben. UI parst diese Direktiven und reagiert.
- Scout-Integration: Gemini 3 Flash (großer Kontext) oder Grok 4.1 fast als Scout-Provider. Scout-Ergebnis fließt in nächste Runde als Context.
- Cross-Reference zwischen Masters: "DeepSeek sagt X, das widerspricht was Opus vorhin sagte" — Maya erkennt und hebt hervor.
- Destillierer als separater Pass am Runden-Ende: komprimiert Council-Output in 3-5 Kernpunkte plus Dissens-Liste.

**Geschätzter Aufwand:** 3-4 Copilot-Sessions.

### Phase 4 — LiveTalk und Voice pro Master

**Ziel:** Council als Audio-Erlebnis verfügbar machen.

**Scope:**
- LiveTalk-Modus für Council: Maya spricht ihre Moderation und Synthese via TTS.
- Optional: eigene Stimmen pro Master (Opus = ruhig/strukturiert, Grok = provokativ/schnell).
- Audio-Mix vs sequentielles Abspielen der Master-Beiträge.
- Voice-Model-Auswahl pro Master in Settings.

**Geschätzter Aufwand:** 2 Copilot-Sessions plus Voice-Tuning.

### Phase 5 — Worker-Anbindung (bei Bedarf)

**Ziel:** Council kann Entscheidung in Code umsetzen lassen.

**Scope:**
- Wenn Council zu einem "baue X" kommt, darf Maya den Builder-Worker-Swarm triggern.
- Council-Session wird zum Input für ein Builder-Feature.
- Brücke zwischen Denk-Ebene (Council) und Bau-Ebene (Worker).

**Nicht jetzt relevant.** Erst wenn Phasen 1-3 stabil laufen.

---

## Kostenbewusstsein

Ein Council-Lauf mit 3 Masters und 2 Runden plus Maya-Moderation bewegt sich bei etwa 30.000-60.000 Token pro Session. Bei sinnvoller Mischung (nicht nur Opus) landet das meist unter 0,20 USD pro Lauf. Opus sollte gezielt eingesetzt werden, nicht als Default in jeder Runde.

**Kostenzähler ist explizit Kosmetik** und kommt erst in Phase 2 oder 3. Die Funktion hat Vorrang vor dem Monitoring.

## Grenzen und Risiken

**Kollektive Blindspots.** Mehrere KIs können gemeinsam denselben Fehler machen — Multi-Agent-Debate-Forschung zeigt dass Hallucination-Feedback-Loops existieren. Der Council löst nicht alle Probleme von LLMs, er verschiebt nur einige.

**Moderator-Qualität entscheidet.** Wenn Maya als Moderatorin zu schwach ist (falsches Modell, schlechter Prompt), bringt der ganze Council wenig. Die Auswahl der Maya-KI ist kritisch — daher die User-Auswahl-Möglichkeit in Phase 2.

**Latenz.** Drei sequentielle API-Calls plus Maya-Synthese können leicht 20-40 Sekunden dauern. Für echte Entscheidungen akzeptabel, für Kleinigkeiten zu lang. Der Council ist nicht der richtige Ort für "welche Farbe für den Button".

**Persistenz-Komplexität.** Pool-Auswahl über Sessions stabil zu halten braucht sauberes State-Management. Der aktuelle Builder-Pool hat das via `pool_state`-Tabelle gelöst (S33-F7 fix), das Muster lässt sich übertragen.

---

## Anker-Dokumente

- Aktuelle Model-Wahrheit: `docs/provider-specs.md` (zuletzt geprüft 22.04.2026 mit Opus 4.7 Addition)
- Drift-Watchlist: `docs/CLAUDE-CONTEXT.md`
- Aktueller Bau-Status: `STATE.md`
- Pipeline-Struktur: Builder Studio UI auf `/builder`
- Bestehender Multi-Persona-Chat: `/studio` (Arcana) und Chat-Tab (`/api/discuss`)

## Status

- **F00 (Opus 4.7 Kompatibilität in providers.ts):** live auf main und Render deployed als cf37ccc am 22.04.2026
- **F01 (Phase 1 Master-Personas):** pending, geplant für heute Abend mit Gürcans Anwesenheit
- **F02+:** geplant, Reihenfolge gemäß Phasen-Plan oben, jeder Block einzeln mit eigenem Scope
