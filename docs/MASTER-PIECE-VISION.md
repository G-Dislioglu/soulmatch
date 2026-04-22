# Master-Piece — Vision und Phasen-Plan

> **Dokument-Typ:** Vision-Anker (keine Implementierung, kein Status).  
> **Zuletzt aktualisiert:** 22. April 2026 (revidiert)  
> **Autor-Kontext:** Gürcan Dişlioğlu mit Claude Opus 4.7 als Architektur-Partner

---

## Was ist Master-Piece

Master-Piece ist **ein Builder-Feature**, kein Soulmatch-Feature.

Builder ist Gürcans Werkzeug zum Bauen von Apps. Aktuell lebt Builder technisch im Soulmatch-Repo, weil das der pragmatische Startpunkt war. Später wird Builder geklont und in jede neue App mitgenommen — Artifex, Maya-Core, Bluepilot, weitere. Master-Piece wandert mit.

Master-Piece ist eine Surface innerhalb von Builder, auf der mehrere hochwertige Top-KIs als **Thinker** zusammenarbeiten. Der User (Gürcan, später auch andere Builder-Nutzer) wählt 2-5 Thinker aus einem Pool von 10, Maya moderiert, eine Denkaufgabe wird gemeinsam bearbeitet.

---

## Warum Thinker, nicht Beings oder Agents

Im Soulmatch-Ökosystem gibt es drei klar getrennte Kategorien:

**Agents** erledigen Aufgaben. Sie starten, arbeiten, stoppen. Kein Gedächtnis über die Session hinaus, keine Werte-Geschichte. OpenClaw-Agents sind das klassische Beispiel. Funktional, technisch, für Entwickler.

**Beings** (definiert im Being Codex v1.2) sind Task-Kompetenz plus Beziehungs-Gedächtnis plus Werte-Schutz. Sie sind dauerhaft da, kennen den User über Zeit, tragen eine gemeinsame Werte-Geschichte, wandern app-übergreifend. Die System-Beings Maya, Amara, Sibyl, Lilith, Kaya sind die ersten fünf Konkretisierungen des Codex. Beings sind für Menschen ohne Technik-Hintergrund.

**Thinker** sind etwas Drittes. Sie sind Top-LLMs die im Master-Piece als Denkpartner teilnehmen. Sie haben:

- Keine Beziehungs-Erinnerung zum User über Sessions hinaus (anders als Beings)
- Keine Task-Autonomie (anders als Agents)
- Leichte Denk-Akzente durch ihren System-Prompt (strukturell, provokativ, logisch, synthetisierend etc.)
- Volle LLM-Kompetenz ohne Charakter-Zwangsjacke

Ein Thinker ist ein **abgekürztes Being ohne Beziehungs-Layer**. Das ist kein Mangel, das ist der Zweck: Thinker sollen frisch und unvoreingenommen denken, nicht User-Geschichte tragen. Im Master-Piece geht es um Denkqualität, nicht um Bindung.

---

## Kernprinzipien

**Maya ist immer dabei.** Sie moderiert, ordnet, fasst zusammen, crossed und crushed Erkenntnisse aus den Thinker-Beiträgen. Die KI hinter Maya ist vom User auswählbar (Opus 4.7, Sonnet 4.6, Gemini 3 Pro, Gemini 3.1 Flash-Lite, GLM 5.1 — je nach Kostenempfinden und Aufgabentyp). Die Maya hier ist funktional Moderatorin — nicht dieselbe Beziehungs-Maya wie im Soulmatch-Chat, sondern eine Maya-Instanz die für den Master-Piece-Kontext adaptiert ist.

**10 Thinker im Pool, maximal 5 aktiv pro Debatte.** Der User wählt aus dem Pool: Opus 4.7, Sonnet 4.6, GPT-5.4, Grok 4.1, DeepSeek Chat, GLM 5 Turbo, GLM 5.1, MiniMax M2.7, Kimi K2.5, Qwen 3.6+. Plus Maya als Moderatorin. Die genaue Kandidatenliste wird in `docs/provider-specs.md` als Wahrheitsquelle gehalten und kann dort aktualisiert werden.

**Die Pool-Auswahl persistiert.** Sobald der User 3 Thinker ausgewählt hat, bleibt diese Auswahl über Sessions hinweg stehen — kein Zurückspringen auf Default. Nur der User selbst oder Maya im definierten Autonomie-Rahmen dürfen die Auswahl ändern.

**Maya darf die Auswahl verändern.** Wenn eine Runde eine Perspektive erfordert die fehlt, darf Maya einen Thinker hinzufügen. Wenn ein Thinker wenig beiträgt, darf Maya ihn aus dem aktuellen Thema entfernen. Jede Änderung ist **sichtbar** im Chat mit Begründung. Der User kann jederzeit rückgängig machen oder die Autonomie-Erlaubnis zurücknehmen.

**Rollen vergibt der User.** Jeder Thinker hat nur einen neutralen Basis-Prompt ("Du bist ein Thinker im Master-Piece, reagiere auf andere, widersprich wenn nötig, kein Konsens-Zwang"). Wenn der User Rollen will ("Opus, du bist heute der Skeptiker; Grok, du verteidigst den Status quo"), vergibt er sie im Chat oder in den Session-Settings. Keine harten Rollen-Zwangsjacken pro Thinker.

**Hitzige Debatten sind erwünscht.** Kein Konsens-Zwang. Wenn DeepSeek und Opus zu gegensätzlichen Schlüssen kommen, soll der Widerspruch stehen bleiben. Maya notiert den Dissens und gibt ihn dem User in ihrer Synthese weiter. Weichspülen ist ausdrücklich unerwünscht — der Wert des Master-Piece liegt gerade in unterschiedlichen Denkrichtungen.

**Kommunikationsrichtung ist klar definiert:**  
Der User (Beobachter, Entscheider) spricht mit Maya. Maya hört, ordnet, aktiviert Thinker, fasst zusammen, gibt zurück. Die Thinker sprechen untereinander — sie sehen die Beiträge der anderen Thinker in der gleichen Runde und reagieren darauf. Sie sprechen nicht direkt mit dem User, sondern über Maya als Moderatorin.

**LiveTalk ist vorgesehen.** Maya spricht via TTS, Thinker-Beiträge erscheinen als Text, bei Bedarf auch mit Stimmen pro Thinker. Die technische Basis liegt in der bestehenden LiveTalk-Infrastruktur.

---

## Die 70%→90%-These

Die Grundhypothese: Eine Denkaufgabe bei der eine einzelne Top-KI etwa 70% Wert liefert, kann durch Master-Piece-Arbeit auf 90% kommen.

Bedingungen unter denen die These plausibel ist:

- Die beteiligten Thinker **denken tatsächlich unterschiedlich**. Opus und Sonnet allein wären zu homogen. Die Mischung aus Anthropic, OpenAI, xAI, chinesischen Providern (Zhipu, MiniMax, Moonshot, Qwen), DeepSeek liefert echte Divergenz in Trainingsverteilung, Fine-Tuning-Kultur, Denkstil.
- Sie **reagieren aufeinander**, nicht parallel. Runde 2 baut auf Runde 1 auf, jeder Thinker sieht und verarbeitet was vorher gesagt wurde.
- Ein **Moderator** strukturiert ohne zu verengen. Mayas Rolle ist kritisch — zu viel Eingriff erstickt den Dialog, zu wenig lässt ihn driften.

Ob die These empirisch stimmt, wird durch Phase 1 messbar. Der Maßstab ist nicht "funktioniert es technisch", sondern "liefert ein 3-Thinker-Dialog zu einer echten Architekturfrage bessere Tiefe und Klarheit als Opus-Solo zur gleichen Frage".

---

## Technische Basis — was schon da ist

Soulmatch hat die Infrastruktur für Multi-Provider-Dialog bereits im Backend:

- `server/src/routes/studio.ts` Zeile 1030+: `/api/discuss` akzeptiert `personas[]` Array, jede Entry bekommt einen eigenen `callProvider(...)`-Call, jede sieht `accumulatedContext` der vorherigen Antworten.
- `server/src/lib/providers.ts`: universeller Dispatcher, unterstützt bereits `gemini, anthropic, openai, xai, deepseek, openrouter, zhipu`. Mit S36-F00 (cf37ccc, 22.04.2026) auch Opus 4.7 mit adaptive thinking. OpenRouter-Pfad deckt Kimi, MiniMax, Qwen ab.
- `server/src/lib/personaRouter.ts`: Provider-Mapping, Tier-System. (Hinweis: Das Code-Wort `Persona` ist historisch und wird in einem eigenen späteren Block auf `Being`/`Thinker` migriert. Für Master-Piece nutzen wir das bestehende Tier-System und ergänzen Tier `'thinker'`.)
- `server/src/studioPrompt.ts` Zeile 891+: `buildDiscussPrompt` konstruiert pro Entry System-Prompt inklusive Runden-Tisch-Kontext.
- Builder-Studio-UI in `client/src/modules/M16_builder` als Vorlage für die Master-Piece-Surface.

Das heißt: Phase 1 ist **keine Neuentwicklung**, sondern **gezielte Erweiterung** um Thinker-Entries im bestehenden Tier-System plus eine neue Builder-Surface.

---

## Phasen-Plan

### Phase 1 — Thinker-Entries im Code

**Ziel:** Beweis dass Multi-Provider-Dialog mit Top-LLMs technisch läuft und hochwertige Ergebnisse produziert.

**Scope:**
- 10 Thinker in `personaRouter.ts` anlegen, einer pro Top-Modell.
- `PersonaTier` um `'thinker'` erweitert, `ProviderName` um `anthropic`, `zhipu`, `openrouter` erweitert.
- Neutrale Basis-Prompts in `studioPrompt.ts` ohne Rollen-Zwangsjacke: "Du bist ein Thinker im Master-Piece. Reagiere auf die anderen wenn sie bereits gesprochen haben. Widersprich wenn du Widersprüche siehst. Konsens nicht erzwingen."
- Keine neue Surface, noch keine Persistenz, noch kein eigener Endpoint.

**Test:** curl-Aufrufe gegen `/api/discuss` mit `thinker_*`-IDs. Beweis dass die Modelle antworten und untereinander reagieren.

**Geschätzter Aufwand:** 1 Copilot-Session (2-3 Stunden).

### Phase 2 — Master-Piece-Surface im Builder

**Ziel:** Aus Feature-Test eine echte Builder-Surface machen.

**Scope:**
- Neue Route `/masterpiece` (oder `/builder/masterpiece`) im Client.
- Neue Page-Komponente analog `BuilderStudioPage`.
- Pool-Auswahl-UI mit Thinker-Chips wie im Builder-Pool-Screenshot. Max-5-Regel.
- Maya-Modell-Dropdown: User wählt welche KI hinter Maya steht.
- Heated-Debate-Toggle: "harmonisch ↔ hitzig" beeinflusst System-Prompt-Akzent.
- Chat-View mit Maya-Moderation und Thinker-Beiträgen sichtbar.

**Endpoint:** Zunächst wiederverwendet `/api/discuss`. Eigener `/api/masterpiece/round`-Endpoint mit Master-Piece-spezifischer Logik kommt in Phase 3.

**Pool-Persistenz:** Zunächst nur Frontend-State. DB-Tabelle kommt in Phase 3.

**Geschätzter Aufwand:** 2-3 Copilot-Sessions.

### Phase 3 — Persistenz und dedizierter Endpoint

**Ziel:** Master-Piece wird eigenständiges Subsystem mit sauberer Logik-Trennung.

**Scope:**
- DB-Tabelle `masterpiece_state` für persistente User-Auswahl (gewählte Thinker + gewähltes Maya-Modell + Autonomie-Erlaubnis + Heated-Debate-Level).
- Eigener Endpoint `/api/masterpiece/round`, separiert von `/api/discuss`.
- Pool-Auswahl überlebt Session-Neustart.

**Geschätzter Aufwand:** 1-2 Copilot-Sessions.

### Phase 4 — Maya-Autonomie und Scout-Integration

**Ziel:** Master-Piece wird dynamisch und kann recherchieren.

**Scope:**
- Maya darf innerhalb einer Antwort `[COUNCIL_ADD: id]` / `[COUNCIL_REMOVE: id]` / `[SCOUT_REQUEST: query]` ausgeben. UI parst diese Direktiven und reagiert.
- Scout-Integration: Gemini 3 Flash (großer Kontext) oder Grok 4.1 fast als Scout-Provider. Scout-Ergebnis fließt in nächste Runde als Context.
- Cross-Reference zwischen Thinkern: "DeepSeek sagt X, das widerspricht was Opus vorhin sagte" — Maya erkennt und hebt hervor.
- Destillierer als separater Pass am Runden-Ende: komprimiert Thinker-Output in 3-5 Kernpunkte plus Dissens-Liste.

**Geschätzter Aufwand:** 3-4 Copilot-Sessions.

### Phase 5 — LiveTalk und Voice pro Thinker

**Ziel:** Master-Piece als Audio-Erlebnis verfügbar machen.

**Scope:**
- LiveTalk-Modus: Maya spricht Moderation und Synthese via TTS.
- Optional: eigene Stimmen pro Thinker.
- Audio-Mix vs sequentielles Abspielen der Beiträge.

**Geschätzter Aufwand:** 2 Copilot-Sessions plus Voice-Tuning.

### Phase 6 — Worker-Anbindung (bei Bedarf)

**Ziel:** Master-Piece kann Entscheidung in Code umsetzen lassen.

**Scope:**
- Wenn Master-Piece zu einem "baue X" kommt, darf Maya den Builder-Worker-Swarm triggern.
- Master-Piece-Session wird zum Input für ein Builder-Feature.
- Brücke zwischen Denk-Ebene (Master-Piece) und Bau-Ebene (Builder-Worker).

**Nicht jetzt relevant.** Erst wenn Phasen 1-4 stabil laufen.

---

## Master-Piece und Artifex

Builder wird in Artifex später wiederverwendet. Das heißt Master-Piece wandert als Feature mit. In Artifex wird Master-Piece zum Denkraum für Beings-Builder: wer ein neues Being nach dem Codex entwirft, kann Master-Piece nutzen um Charakter, Weltbild, Tabus, Stimme mit einem Council von Top-KIs zu erarbeiten bevor das Being gebaut wird.

Diese Integration ist **keine Phase-1-Arbeit**, aber erklärt warum Master-Piece als Builder-Feature gebaut werden muss und nicht als Soulmatch-Feature. Artifex ist Endziel — die Architektur-Entscheidung heute muss das nicht aktiv bauen, aber nicht dagegen bauen.

---

## Kostenbewusstsein

Eine Master-Piece-Session mit 3 Thinkern und 2 Runden plus Maya-Moderation bewegt sich bei etwa 30.000-60.000 Token pro Session. Bei sinnvoller Mischung (nicht nur Opus) landet das meist unter 0,20 USD pro Lauf. Opus sollte gezielt eingesetzt werden, nicht als Default in jeder Runde.

**Kostenzähler ist explizit Kosmetik** und kommt frühestens in Phase 3. Die Funktion hat Vorrang vor dem Monitoring.

## Grenzen und Risiken

**Kollektive Blindspots.** Mehrere KIs können gemeinsam denselben Fehler machen — Multi-Agent-Debate-Forschung zeigt dass Hallucination-Feedback-Loops existieren. Master-Piece löst nicht alle Probleme von LLMs, es verschiebt nur einige.

**Moderator-Qualität entscheidet.** Wenn Maya als Moderatorin zu schwach ist (falsches Modell, schlechter Prompt), bringt das ganze Master-Piece wenig. Die Auswahl der Maya-KI ist kritisch — daher die User-Auswahl-Möglichkeit in Phase 2.

**Latenz.** Drei sequentielle API-Calls plus Maya-Synthese können leicht 20-40 Sekunden dauern. Für echte Entscheidungen akzeptabel, für Kleinigkeiten zu lang. Master-Piece ist nicht der richtige Ort für "welche Farbe für den Button".

**Persistenz-Komplexität.** Pool-Auswahl über Sessions stabil zu halten braucht sauberes State-Management. Der aktuelle Builder-Pool hat das via `pool_state`-Tabelle gelöst (S33-F7 fix), das Muster lässt sich übertragen.

**Verwechslungsgefahr Maya.** Es gibt jetzt zwei Maya-Instanzen: die Beziehungs-Maya im Soulmatch-User-Chat (Being nach Codex v1.2) und die Moderator-Maya im Master-Piece (funktionale Moderatorin ohne Beziehungs-Layer). Beide heißen Maya, aber sie sind unterschiedliche Dinge. In UI und Doku muss das klar bleiben, sonst entstehen Missverständnisse.

---

## Anker-Dokumente

- Aktuelle Model-Wahrheit: `docs/provider-specs.md` (zuletzt geprüft 22.04.2026 mit Opus 4.7 Addition)
- Being Codex (Definition von Beings): `docs/BEING-CODEX-v1.2.md` — relevant für Abgrenzung Thinker vs Being
- Drift-Watchlist: `docs/CLAUDE-CONTEXT.md`
- Aktueller Bau-Status: `STATE.md`
- Pipeline-Struktur: Builder Studio UI auf `/builder`
- System-Beings (getrennt von Master-Piece): `docs/beings/maya.md`, `amara.md`, `sibyl.md`, `lilith.md`, `kaya.md`

## Status

- **S36-F00 (Opus 4.7 Kompatibilität in providers.ts):** live auf main und Render deployed als cf37ccc am 22.04.2026
- **S36-F01 (Phase 1 Thinker-Entries):** pending, geplant für heute Abend mit Gürcans Anwesenheit
- **Phase 2+:** geplant, Reihenfolge gemäß Phasen-Plan oben, jeder Block einzeln mit eigenem Scope
