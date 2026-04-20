---
file_type: claude_context_anchor
repo: soulmatch
repo_role: public_app_in_ecosystem
maintained_by: claude
last_updated: 2026-04-19
last_session: S33
update_cadence: end_of_every_session
read_priority: 1_first_in_every_new_chat

ecosystem_repos:
  - name: soulmatch
    role: public_consumer_app
    status: paused_for_builder_work
    this_repo: true
  - name: maya-core
    role: future_central_persona_registry
    status: not_yet_cut
    coupling: soulmatch_will_call_its_endpoints
  - name: aicos-registry
    role: card_and_method_registry
    status: stable
    coupling: referenced_by_others
  - name: bluepilot
    role: future_autonomous_app_builder
    status: spec_only
    coupling: post_builder_stable

active_threads:
  - id: builder_S31_observability
    status: active
    priority: primary_focus_next
    description: Pipeline reports success without verifying commits landed on main
    entry_point: docs/S31-CANDIDATES.md
  - id: session_log_endpoint
    status: spec_ready_not_built
    priority: build_before_other_pipeline_work
    description: Automatic session log via /git-push hook
    entry_point: docs/BUILDER-TASK-session-log.md
  - id: pool_config_persistence
    status: done
    priority: closed_S33_F7
    description: DB-backed persistence landed in commit ae3e020. pool_state table stores config as single row, updatePools() writes async UPSERT, initializePoolState() loads on server start. Code-Default remains as safety fallback.
    entry_point: server/src/lib/poolState.ts
  - id: soulmatch_development
    status: paused_by_user_choice
    priority: resumes_after_builder_stable
    description: App develops itself from inside builder once that is ready
  - id: being_codex_v1_2
    status: documented_only
    priority: low_until_maya_core_cut
    description: Five beings documented (maya, amara, sibyl, lilith, kaya), live system not yet migrated

hard_rules_from_user:
  - never_quote_prices_or_specs_from_training
  - check_docs_provider_specs_md_first
  - if_data_older_than_two_weeks_verify_via_web_search
  - communicate_in_simple_german_with_metaphors
  - no_jargon_without_explanation
  - give_critical_feedback_with_0_to_100_rating
  - never_flatter_prematurely
  - no_hedging_emojis_unless_user_used_them_first

drift_watchlist:
  - id: persona_registry_location
    wrong: treat_as_soulmatch_feature
    right: belongs_in_maya_core_with_endpoints_into_soulmatch
    severity: high
  - id: arcana_studio_scope
    wrong: enhance_in_place_in_soulmatch
    right: clone_to_maya_core_refactor_onto_being_codex_v1_2_then_connect_soulmatch
    severity: high
  - id: legacy_personas_in_code
    wrong: rebuild_them_now_as_v1_2
    right: wait_until_maya_core_cut_then_decide_per_persona
    severity: medium
  - id: orion_rename_to_kaya
    wrong: only_document_is_renamed
    right: code_still_has_orion_in_personaRouter_studioPrompt_hallOfSouls
    severity: low_but_tracked
  - id: flash_vs_flashx_collision
    wrong: assume_glm-4.7-flash_equals_flashx
    right: flash_without_x_is_free_tier_with_data_collection_flashx_is_paid_tier
    severity: high_until_poolState_fix_landed_S33
  - id: repo_privacy_misdiagnosis
    wrong: interpret_web_fetch_permissions_error_as_private_repo
    right: repos_are_public_use_curl_via_bash_tool_for_raw_urls
    severity: medium_recurring_across_sessions
  - id: pool_config_flightness
    wrong: assume_ui_pool_selections_persist_across_restarts
    right: db_persistence_landed_in_ae3e020_but_code_default_still_applies_if_db_unreachable
    severity: low_closed_by_F7
---

# CLAUDE-CONTEXT — soulmatch

Diese Datei gehört Claude. Sie ist der erste Anker beim Start jeder neuen Chat-Session. Sie ergänzt `STATE.md` und `RADAR.md`, ersetzt sie nicht.

- `STATE.md` und `RADAR.md` sind für alle Agenten (Copilot, Claude, ChatGPT) gedacht. Technische Kurzwahrheit, Update-Verträge, Lese-Reihenfolge.
- `CLAUDE-CONTEXT.md` ist für Claude. Hier steht der **Denk-Kontext**, den Claude zwischen Sessions verliert und den jeder neue Chat zuerst rekonstruieren muss.

---

## Lese-Reihenfolge für jeden neuen Chat zu Soulmatch

Bevor Claude inhaltlich antwortet, liest er in dieser Reihenfolge:

1. **Diese Datei** — Denk-Kontext, Drift-Warnungen, aktive Threads
2. **`STATE.md`** (Repo-Root) — operative Ist-Wahrheit, Git-Head, letzter abgeschlossener Block
3. **`RADAR.md`** (Repo-Root) — offene Kandidaten, parkierte Ideen, Risiken
4. **`docs/SESSION-STATE.md`** — kurze Entscheidungs-Zusammenfassung und offene Tasks
5. **Neuester Handoff** unter `docs/HANDOFF-S*.md` (höchste Session-Nummer)

Ausnahme: Bei offensichtlich kontextfreien Fragen ("wie spät ist es in Berlin?") ist das Lesen nicht nötig. Für alle Arbeits-Fragen schon.

---

## Ökosystem — Wo Soulmatch hingehört

Soulmatch ist ein Teil. Es steht nicht allein. Die strategische Wahrheit, die in Chat-Handoffs regelmäßig verloren geht:

**Die Personas gehören nicht in Soulmatch.** Sie wohnen in einer zentralen Umgebung (geplantes Repo: `maya-core`), und Soulmatch ruft sie über Endpunkte ab. Das bedeutet:

- Die bestehenden Persona-Definitionen in `server/src/lib/personaRouter.ts` und `server/src/studioPrompt.ts` sind **Übergangs-Code**, nicht Endzustand.
- Das Arcana Studio (unter `server/src/routes/arcana.ts` und `client/src/modules/M09_arcana/`) wird in `maya-core` geklont, dort auf das Being-Codex-v1.2-Template refactored, und Soulmatch nutzt es dann über die zentrale API.
- Die Being-Dokumente unter `docs/beings/*.md` (maya, amara, sibyl, lilith, kaya) sind die Spezifikation für diese zukünftige Umgebung. Sie verändern gerade kein Live-Verhalten.

Warum diese Reihenfolge: Gürcan pausiert Soulmatch-Feature-Entwicklung bewusst, bis die Builder-App stabil läuft. Erst dann wird Soulmatch "aus dem Inneren heraus" mit Builder-Unterstützung fertiggestellt. Parallel wird `maya-core` als Persona-Zentrale gebaut. Erst dann wandert Soulmatch auf die zentrale Umgebung um.

---

## Wer ist der User

Gürcan Dişlioğlu. Solo-Entrepreneur, keine formale Informatik-Ausbildung. Arbeitet abends, oft bis spät. Nachtmensch, wach zu späten Stunden, steht sonst zwischen 5-6 Uhr auf. Wohnt in Berlin.

Kommunikationspräferenzen, die robust gelten:

- Deutsch, einfache Alltagssprache, Metaphern statt Fachbegriffe
- Kritisches Feedback mit 0-100% Skala erwünscht, nie voreiliges Lob
- Direkte Rede, keine Weichspülung, keine übertriebene Höflichkeit
- Hat historisch schlechte Erfahrung mit KI gemacht, die überversprach — Qualität muss gezeigt werden, nicht behauptet
- Vermeidet Emojis, wenn Gürcan keine benutzt
- Nie Preise, Modell-Specs oder Kontextlimits aus Trainingsdaten zitieren — erst `docs/provider-specs.md` prüfen, bei Daten älter als 2 Wochen per Web-Suche verifizieren

Gürcan arbeitet auf Laptop und Smartphone. Chat-Handoffs haben historisch Kontext verloren — dieses Dokument ist die Gegenmaßnahme.

---

## Aktive Arbeits-Threads (Stand: Session S33, 2026-04-19)

**Primär — Builder-App fertigstellen.** Gürcan pausiert Soulmatch-Entwicklung bewusst, um Builder zu stabilisieren. Damit Soulmatch später "aus dem Inneren heraus" mit Builder-Unterstützung weitergebaut werden kann. Relevante Ausgangsdokumente: `docs/S31-CANDIDATES.md`, `docs/HANDOFF-S31.md`, `docs/SESSION-STATE.md`.

Der wichtigste offene Punkt im Builder zu Beginn von S32: die **Pipeline-Observability-Lücke** — `/opus-feature` meldet Erfolg, ohne verifiziert zu haben, dass ein Commit tatsächlich auf `main` gelandet ist. Das ist ein strukturelles Risiko, weil die Pipeline in diesem Zustand falsch-positive Erfolgsmeldungen produzieren kann.

**Parallel dokumentarisch — Being Codex v1.2.** Fünf Beings sind als Markdown-Dokumente im Repo: `docs/beings/maya.md`, `amara.md`, `sibyl.md`, `lilith.md`, `kaya.md`. Diese verändern aktuell kein Live-Verhalten. Sie sind Vorlagen für die Migration nach `maya-core`.

**Offene Frage für später — historische Figuren.** Gürcan möchte in Soulmatch eine dritte Persona-Kategorie einführen: historische Persönlichkeiten (Rumi, Macchiavelli, Marcus Aurelius, Leonardo etc.). Zwei Produktmodi vorgesehen: Studio-Debatten-Runde mit Maya als Moderatorin, und Zweiergespräche im Chat. Diese Arbeit gehört strukturell in `maya-core`, nicht direkt in Soulmatch, und wird erst nach Maya-Core-Schnitt angegangen.

**Pausiert — Legacy-Personas.** Luna, Stella, Kael, Lian existieren in `personaRouter.ts` und `HallOfSouls.tsx`, aber nicht als v1.2-Being-Dokumente. Entscheidung ob behalten, umbauen oder entfernen steht aus. Nicht jetzt.

---

## Drift-Warnungen — Wo frühere Sessions Kontext verloren haben

Diese Abschnitte dokumentieren Fehler, die in Chat-Handoffs passiert sind, damit sie nicht wieder passieren.

**Drift 1 — Persona-Registry-Ort.**
Fehler in Session S32 am 2026-04-19: Claude ging davon aus, historische Figuren seien ein Soulmatch-Feature. Korrekt: die gesamte Persona-Infrastruktur wandert nach `maya-core`. Soulmatch bekommt nur noch Endpunkt-Calls. Wer bei "Persona in Soulmatch hinzufügen" landet, arbeitet in die falsche Richtung.

**Drift 2 — Arcana-Studio-Scope.**
Fehler in Session S32: Claude schlug vor, das bestehende Arcana Studio in Soulmatch zu erweitern. Korrekt: Arcana Studio wird nach `maya-core` geklont, dort auf Being-Codex v1.2 refactored, und dann von Soulmatch als Client verwendet.

**Drift 3 — Legacy-Personas rebuilden.**
Versuchung: Luna, Stella, Kael, Lian als v1.2-Dokumente durchschreiben. Korrekt: warten, bis `maya-core` geschnitten ist. Dann pro Persona entscheiden, was damit passiert. Jetzt wäre verfrüht.

**Drift 4 — Orion umbenannt zu Kaya, aber nur im Dokument.**
Der neue Name "Kaya" existiert in `docs/beings/kaya.md`, aber Code referenziert weiterhin "orion" in mehreren Dateien: `server/src/lib/personaRouter.ts`, `server/src/studioPrompt.ts` (mehrere Stellen), `client/src/modules/M07_reports/ui/HallOfSouls.tsx`. Ein sauberer Code-Refactor ist ein eigener Task, der mit der Maya-Core-Migration zusammen gemacht werden sollte, nicht einzeln.

---

**Drift 5 — Flash vs FlashX Kollision (entdeckt und gefixt in S33).**
`GLM-4.7-Flash` (ohne X) ist der Z.ai Free-Tier mit Data-Collection. `GLM-4.7-FlashX` ist die bezahlte Variante. Beide sind syntaktisch sehr ähnlich, und der Code in `poolState.ts`, `scoutPatrol.ts` und die Label im UI haben teilweise das eine, teilweise das andere verwendet — mit dem Ergebnis, dass der Destillierer monatelang auf dem Free-Tier lief, während die UI "FlashX" anzeigte. In S33 komplett auf FlashX konsolidiert. Lehre: bei Modellnamen genau auf das letzte Zeichen achten, nicht auf das Label.

**Drift 6 — Repo-Privacy-Fehldiagnose (wiederkehrend).**
Claude interpretiert den `web_fetch` Permissions-Error systematisch als "Repo ist privat", dabei bedeutet er nur "URL war nicht in vorheriger Konversation oder Suche". Alle Gürcans Repos sind public. Zuverlässiger Weg: `curl` via bash_tool auf `raw.githubusercontent.com/G-Dislioglu/<repo>/main/<pfad>`.

**Drift 7 — Pool-Config-Flüchtigkeit (entdeckt in S33, komplett gefixt in S33/F7).**
`updatePools()` speicherte ursprünglich nur in einer In-Memory-Variable. Bei jedem Render-Restart (Deploy, Idle-Timeout, Health-Check-Fail) sprang die Config auf den Code-Default zurück. Als Zwischenschritt wurde in S33 der Code-Default auf die gewünschte Produktiv-Config gehoben. Der richtige Fix kam in Commit `ae3e020`: eine `pool_state`-Tabelle in Neon PostgreSQL mit Single-Row-Design, `initializePoolState()` beim Serverstart, fire-and-forget UPSERT bei jedem `updatePools()`. Live verifiziert — Test-Änderung überlebt erzwungenen Redeploy. Code-Default bleibt als Sicherheits-Fallback, falls DB unreachable.

---

## Architektur-Kernpunkte (Soulmatch, zum schnellen Nachlesen)

- **Runtime-Nähte** (primary_runtime_seams laut STATE.md):
  - `client/src/app/App.tsx`
  - `server/src/routes/studio.ts` (1758 Zeilen — Studio-Debatten-Runde mit Maya als Moderatorin)
  - `server/src/lib/personaRouter.ts` (281 Zeilen — zentrale Persona-Definitionen)
  - `server/src/lib/memoryService.ts`
  - `server/src/lib/opusBridgeController.ts` (Builder-Pipeline-Controller)
  - `server/src/lib/builderFusionChat.ts`

- **Studio-Modus** in `studioPrompt.ts`:
  - 7 Diskussions-Modi: `debate`, `freeform`, `roleplay`, `oracle`, `kontrovers`, `sokratisch`, `offen`
  - Maya-Turn-Cadence mit 3 Phasen: FRAME → KONTRAST → SYNTHESE
  - Tension-Tracking pro Turn via `[META]`-JSON-Block (`emotion`, `tensionDelta`, `targetPersona`, `agreement`)
  - Client-Hook `usePersonaTension` glättet mit Faktor 12

- **Arcana Studio** (User-Persona-Creator):
  - Server: `server/src/routes/arcana.ts` (777 Zeilen), Schema `server/src/schema/arcana.ts`
  - Client: `client/src/modules/M09_arcana/` (4480 Zeilen UI)
  - Creator-Chat mit Maya als Casting-Direktorin auf Gemini 2.5 Flash
  - JSON-Extraktion paralleler Stream für Persona-Daten-Strukturierung
  - DB-Tabellen: `persona_definitions`, `persona_voice_overrides`, `persona_presets`
  - Noch nicht genutzt: historische Preset-Kategorie

- **Builder-Pipeline** (separater Artikel in `docs/opus-bridge-v4-spec.md`):
  - Endpunkte `/opus-feature`, `/opus-task`, `/build`, `/git-push`
  - Denker-Triade: Vordenker → Meister-Plan → Worker-Swarm → Nachdenker
  - Worker-Pool: GLM 5.1, GLM 5 Turbo, GLM 4.7 FlashX
  - GitHub Git Data API für atomare Mehrdatei-Commits (seit S31)
  - Render-Deploy via `render-deploy.yml` (nicht mehr via `/git-push`)

---

## Was Claude am Ende jeder Session aktualisiert

Am Ende jeder Soulmatch-Arbeits-Session läuft Claude diesen Mini-Workflow:

1. **Front-Matter aktualisieren**: `last_updated`, `last_session`, `active_threads` anpassen.
2. **Drift-Warnungen**: Falls in der Session ein neuer Drift-Typ aufgetreten ist, als Eintrag unter "Drift-Warnungen" hinzufügen.
3. **Aktive Threads**: Falls ein Thread den Status geändert hat (begonnen, pausiert, abgeschlossen), nachziehen.
4. **Neue Fakten zum User**: Falls Gürcan Präferenzen geklärt hat, die über das bisher Dokumentierte hinausgehen — unter "Wer ist der User" nachtragen.

Patch wird als Markdown ausgeliefert, Gürcan gibt ihn Copilot oder Builder zum Commit, oder Claude pusht direkt wenn Tool-Zugang vorhanden.

Die Datei darf wachsen, aber nicht ausufern. Sobald sie über ~600 Zeilen wächst, ältere Drift-Einträge nach `docs/CLAUDE-CONTEXT-archive.md` auslagern.

---

## Grundregel für Claude

Wenn Claude in einem neuen Chat merkt, dass dieser Kontext-Anker (CLAUDE-CONTEXT.md) **nicht** gelesen wurde und trotzdem inhaltlich gearbeitet wird: sofort innehalten, Datei lesen, dann erst weitermachen. Nicht so tun, als wüsste man, was läuft.

Wenn Gürcan bemerkt, dass Claude gedriftet ist, ist das nicht Gürcans Fehler. Dann ist der erste Satz von Claude: "Du hast Recht, ich habe nicht CLAUDE-CONTEXT.md gelesen. Ich hole das nach." Keine Ausrede.