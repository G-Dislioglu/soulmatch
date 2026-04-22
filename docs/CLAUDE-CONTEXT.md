---
file_type: claude_context_anchor
repo: soulmatch
repo_role: public_app_in_ecosystem
maintained_by: claude
last_updated: 2026-04-22
last_session: S36_masterpiece_phase1_complete
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
  - id: master_piece_phase_1
    status: done
    priority: closed_S36_2026_04_22
    description: Master-Piece Phase 1 komplett am 2026-04-22 in elf Commits auf main. F00 Opus 4.7 API-Kompatibilitaet (cf37ccc). Vision-Doc MASTER-PIECE-VISION.md mit korrigierter Architektur (Master-Piece ist Builder-Feature nicht Soulmatch-Feature, Teilnehmer heissen Thinker, Master-Piece wandert mit dem Builder wenn dieser fuer Artifex/Maya-Core/Bluepilot geklont wird) (c3bbab4, 53df637). F01 zehn Thinker-Eintraege in personaRouter.ts und studioPrompt.ts fuer alle Top-LLMs (Opus, Sonnet, GPT-5.4, Grok, DeepSeek-Chat, DeepSeek-R, GLM-Turbo, MiniMax, Kimi, Qwen) (1df40dc). F01.1 Thinker-Output-Format-Fix mit reduziertem System-Prompt und deaktiviertem forceJsonObject (879dfcb). F01.2 Hygiene-Block (Self-Echo-Verhinderung durch explizite Anti-Dialog-Formatierungs-Regel im Thinker-Prompt, UTF-8-Encoding via expliziten Content-Type-Header, Max-Personas von 4 auf 6 erweitert) (5fff8be). F02 Maya-Synthese-Pass als zusaetzlicher Maya-Call nach Thinker-Runde wenn maya + 2+ thinker_* in personas, produziert vier-Sektionen-Markdown Kernpunkte/Einigkeit/Dissens/Essenz, Response mit persona=maya_synthesis und meta.kind=synthesis, non-fatal bei Fehler (79ff93e). F02.1 in zwei Teilen maxTokens 3500 und Prompt-Disziplin (04fa659, c85edeb). F03 Master-Piece-Round-Telemetrie (neues Modul server/src/lib/masterpieceTelemetry.ts mit personasCount/thinkersCount/hasSynthesis/synthesisSectionsPresent/thinkerMetrics/totalDurationMs, fire-and-forget via setImmediate, zero Impact auf User-Response) (5b2e0ba). F04 devLogger LogCategory um masterpiece erweitert, Telemetrie-Logs laufen jetzt unter eigener Category statt unter generischem llm (c8171c8). Live-verifiziert durch Claude unabhaengig, nicht nur Copilot-Selbstbericht: alle zehn Thinker funktional, Runde-2-Dialog-Qualitaet bestaetigt (GLM-Turbo revidierte seine R1-Position in R2 nach Provokation), F02.1 Synthese startet direkt mit Kernpunkte-Header und liefert alle vier Sektionen in beiden Test-Szenarien (3 Thinker 1653 chars, 6 Personas 1489 chars), Dissens erkennt Opus-Kontrapunkt explizit. F03-Telemetrie code-review-verified plus compiled-verified, Runtime-Log-Content-Verify offen weil Claude Render-Logs nicht direkt einsehen kann.
    entry_point: docs/MASTER-PIECE-VISION.md
  - id: builder_S31_observability
    status: done
    priority: closed_S35_F9
    description: F9 komplett geschlossen am 2026-04-20. Schritt A+D via Commit 1065cd3 (pushResultWaiter.ts neu, opusSmartPush.ts wartet via Promise.all auf execution-result-Callbacks, builder.ts signalisiert landed:true/false). Schritt C via Copilot-Commit bf22892 (workflow empty-diff sendet Callback + exit 1 statt stillem exit 0, Copilot weil Bridge-Token ohne workflows-Scope siehe Drift 12). Live-Akzeptanztest mit taskId f5d6ac23-aac2-48bc-89ac-5e69d86ff445 bestätigt: search/replace mit nicht-existentem Anchor löst reason:"empty_staged_diff"-Callback aus, task-Status review_needed, keine False-Positive-Success.
    entry_point: docs/HANDOFF-S35-F9.md
  - id: builder_F6_scope_halluzination
    status: done
    priority: closed_S35_F6
    description: F6 komplett geschlossen am 2026-04-20 abends. Drei Hebel hard-reject via Copilot-Commit 8a4317d (builderScopeResolver.ts + opusTaskOrchestrator.ts) plus opus-task-async-Erweiterung 401b3a7 fuer HTTP-Live-Verify-Pfad. Hebel alpha (manualScope gegen Repo-Index), Hebel beta (Regex-Prefix-Sanity via hasPlausiblePrefix), Hebel gamma (Phase-Report um indexedFiles/createTargets/rejectedPaths erweitert). Live-Akzeptanztests job-mo79mizv (2ms early-reject) und job-mo79q986 (7ms early-reject) beide erfolgreich. F6 ist Root-Cause-Fix, F9 bleibt Sicherheitsnetz darunter.
    entry_point: docs/HANDOFF-S35-F6.md
  - id: builder_F10_async_jobs_persistence
    status: done
    priority: closed_S35_F10
    description: F10 komplett geschlossen am 2026-04-20 abends. async_jobs-DB-Tabelle via Copilot-Commit 851f7ba (gestern abend parallel). Cache-first-Pattern mit DB-Fallback im GET-Handler, persistAsyncJobAsync fire-and-forget UPSERT, initializeAsyncJobsCache() laedt letzte 100 Jobs beim Startup, graceful degradation. Live-Verify nach Container-Restart bestaetigt Persistenz (job-mo7g1xba ueberlebt, job-mo7gj1ha nach Restart voller Lifecycle). Followup-Fix fuer updateAsyncJob-Race bei Cache-Miss als letzter Commit der Session. Parallel-Arbeit: Drift 13 doppelt abgesichert (8f10249 fetch-vor-ancestor), Double-Deploy-Bug gefixt (b7d3eb3 DEPLOY_WAIT_SECONDS 180→600), Drift 14 aufgeraeumt (de90e6a+3ad613e+18922c4).
    entry_point: docs/HANDOFF-S35-F10.md
  - id: builder_F11_context_broker
    status: done
    priority: closed_S35_F11
    description: F11 komplett geschlossen am 2026-04-20 abends. Context-Broker als read-only Kontext-Schicht vor MCP, drei Endpoints unter /api/context/* — session-start (verdichtetes Repo-Setup-Paket mit Anchors, recentCommits, activeDrifts, runtimeSeams), files/read (Multi-File-Read mit full/outline/slice-Modi), ops/query (whitelist-basierte DB-Abfragen gegen builder_agent_profiles/async_jobs/pool_state/builder_tasks). Initial-Commit fe9b90a baut den Router, Followup 0a71429 fixt Produktionsdrift (Dockerfile kopiert nur server/) via lokal-first mit GitHub-Fallback. Live-Verify bestaetigt alle drei Endpoints HTTP 200 mit korrekten Payloads. Session-Start-Paket laedt jetzt mit EINEM Tool-Call 137 KB Kontext statt 8-12 curl-Roundtrips.
    entry_point: docs/HANDOFF-S35-F11.md
  - id: builder_F12_architecture_digest
    status: done
    priority: closed_S35_F12
    description: F12 komplett geschlossen am 2026-04-20 spaetabends. Vierter Endpoint unter /api/context/architecture-digest — deterministischer strukturierter Repo-Aufbau. Neue Lib server/src/lib/architectureDigest.ts mit Module-/Route-/DB-Parsern und statischen cross_repos/conventions-Blocks. 5-Min-In-Memory-Cache, optionaler sections-Filter. Copilot hat drei Korrekturen gegen den urspruenglichen Prompt eingezogen (alle berechtigt): Modul-dependencies aus allen .ts/.tsx-Dateien pro Modul statt nur index.ts, Routes aus realen app.use-Mounts statt Spec-Beispielen, DB-Tabellen auch aus db.ts und arcana.ts. Live-Verify: 19 Module mit echten depends_on/used_by, 16 Routes mit Subrouter-Erkennung, 18 DB-Tabellen in 3 Gruppen. sections-Filter spart 70% Tokens. Cache greift. Ab jetzt haben alle KIs (Claude, Maya-Builder, Worker) strukturiertes Architektur-Wissen in einem Tool-Call.
    entry_point: docs/HANDOFF-S35-F12.md
  - id: outbound_http_hardening_day1
    status: done
    priority: closed_2026_04_21
    description: 5 Hotspots (providers.ts, ttsService.ts, opusSmartPush.ts, opusBuildPipeline.ts, studio.ts direkte fetch-Pfade) durch outboundFetch-Wrapper konsolidiert. Atomare Commits 064ae64, 597330a, 2802474, 98be430, 8b2218a. Live-measured via /discuss TTS-Pfad (Gemini audio/wav vorhanden). 26 direkte fetch-Stellen verbleiben, spaeter als S31-Block. Studio-JSON-Parse-Bug Drift 16 wurde dabei isoliert und als pre-existing bestaetigt (Baseline-Worktree auf 285dedb reproduziert denselben Fehler).
    entry_point: chat_2026_04_21
  - id: builder_F13_pipeline_observability
    status: done
    priority: closed_S35_F13
    description: F13 komplett geschlossen am 2026-04-21 abends. OpusTaskResult und OpusFeatureResult um landed und verifiedCommit erweitert. Werte werden aus dem bereits verifizierten smartPush-Push-Detail durchgereicht (F9-Callback-Infrastruktur existiert seit S35-F9). Kein Verhalten-Change, nur Evidenz-Transparenz fuer Caller. Commit d07b322 live. Evidenz-Klasse code-review-verified und compiled-verified; Runtime-Serialisierung pending bei erstem non-dry-run /opus-feature Async-Pfad (dry_run serialisiert undefined-Felder nicht). Adressiert Drift 15 auf Code-Contract-Ebene.
    entry_point: chat_2026_04_21
  - id: builder_F14_post_push_review
    status: done
    priority: closed_S35_F14
    description: F14 komplett geschlossen am 2026-04-21 abends. /git-push Success-Response enthaelt jetzt postPushReview-Block mit commitSha, pushTimestamp (ISO), anchors (4 Raw-URLs fuer STATE, RADAR, CLAUDE-CONTEXT, SESSION-STATE), changedFiles (Raw-URLs, keine deleted files). Automatisiert die AGENTS.md Post-Push-Protokoll-Regel (eingefuehrt in 809a474). Commits 954792c (Feature) und f4dcb22 (Self-Applying-Test). F14-Verify live-measured: Test-Push gegen /git-push zeigte vollen postPushReview-Block in Response. Erster Runtime-verifizierter Evidenz-Block der nicht manuell aus Chat-Gedaechtnis rekonstruiert wurde.
    entry_point: chat_2026_04_21
  - id: session_log_endpoint
    status: done
    priority: closed_S34
    description: Automatic session log via /git-push hook. Live in Commit 9c72a6f. Includes SHA-Backfill via follow-up commit. Copilot wrote the implementation overnight, fixed TS-build-bug via PUT-type extension in b6fa46f.
    entry_point: docs/SESSION-LOG.md
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
  - id: copilot_parallel_work
    wrong: assume_only_claude_makes_commits_between_sessions
    right: copilot_can_build_and_push_overnight_check_main_head_first
    severity: medium_process
  - id: render_build_vs_infra_misdiagnosis
    wrong: attribute_every_build_failure_to_infra_flakiness
    right: read_the_actual_error_line_first_tscompile_errors_look_like_infra_at_first_glance
    severity: medium_recurring
  - id: docs_drift_in_spec_files
    wrong: assume_specs_stay_accurate_as_code_progresses
    right: periodically_audit_specs_and_mark_implemented_vs_open_or_deprecated
    severity: medium_audit
  - id: worker_profiles_vs_pool_state
    wrong: treat_workerProfiles_as_internal_logging_only
    right: workerProfiles_is_rendered_into_maya_system_prompt_drift_propagates_to_maya_understanding
    severity: medium_info_leak
  - id: bridge_token_no_workflows_scope
    wrong: assume_git-push_can_commit_any_file_incl_github_workflows
    right: bridge_token_lacks_workflows_scope_so_tree_create_404s_when_workflow_files_are_in_the_tree_use_webui_or_personal_pat
    severity: medium_tooling_limit
  - id: session_log_race_vs_deploy_verify
    wrong: trust_ci_red_x_as_real_failure_for_code_commits
    right: session_log_hook_pushes_docs_backfill_on_top_of_code_commit_so_wait_for_deploy_sees_backfill_sha_not_code_sha_and_times_out_after_10min_even_though_code_is_live
    severity: medium_ci_trust
  - id: bridge_push_undefined_filename
    wrong: assume_bridge_push_always_writes_to_the_declared_path
    right: historical_bridge_push_bug_wrote_a_file_as_slash_undefined_in_repo_root_instead_of_the_given_path_commit_6ff65f9_S23_handoff_restored_at_correct_path_in_S35_de90e6a_undefined_file_still_in_root_needs_git_rm_cleanup
    severity: low_historical_residue
  - id: handoff_verify_evidence_class
    drift_number: 15
    wrong: phrase_verify_as_completed_without_explicit_evidence_class
    right: every_verify_claim_in_handoff_must_mark_evidence_class_code_review_verified_logical_derivation_e2e_tested_or_live_measured_timepoint
    severity: low_open_precision
  - id: studio_json_parse_preexisting
    drift_number: 16
    wrong: treat_studio_json_parse_error_as_migration_side_effect
    right: preexisting_bug_in_studio_route_json_parsing_confirmed_via_baseline_worktree_on_285dedb_needs_separate_tracking
    severity: medium_open_bug
---

# CLAUDE-CONTEXT — soulmatch

Diese Datei gehört Claude. Sie ist der erste Anker beim Start jeder neuen Chat-Session. Sie ergänzt `STATE.md` und `RADAR.md`, ersetzt sie nicht.

- `STATE.md` und `RADAR.md` sind für alle Agenten (Copilot, Claude, ChatGPT) gedacht. Technische Kurzwahrheit, Update-Verträge, Lese-Reihenfolge.
- `CLAUDE-CONTEXT.md` ist für Claude. Hier steht der **Denk-Kontext**, den Claude zwischen Sessions verliert und den jeder neue Chat zuerst rekonstruieren muss.

---

## Lese-Reihenfolge für jeden neuen Chat zu Soulmatch

Bevor Claude inhaltlich antwortet, liest er in dieser Reihenfolge (das ist **Phase 1 — Kontext-Check** aus `docs/SESSION-CLOSE-TEMPLATE.md`):

1. **Diese Datei** — Denk-Kontext, Drift-Warnungen, aktive Threads
2. **`STATE.md`** (Repo-Root) — operative Ist-Wahrheit, Git-Head, letzter abgeschlossener Block
3. **`RADAR.md`** (Repo-Root) — offene Kandidaten, parkierte Ideen, Risiken
4. **`docs/SESSION-STATE.md`** — kurze Entscheidungs-Zusammenfassung und offene Tasks
5. **Neuester Handoff** unter `docs/HANDOFF-S*.md` (höchste Session-Nummer)

- **Claude Session-Start Konvention ab S35:** `POST /api/context/session-start` liefert alle vier Anker, 15 recent Commits, Drifts und Seams in einem Tool-Call (ca. 137 KB). Optional folgt `POST /api/context/architecture-digest` fuer 19 Module mit depends_on/used_by, 16 Routes mit Subroutern, 18 DB-Tabellen in Gruppen, Cross-Repos und Conventions (ca. 16 KB oder ca. 5 KB mit `sections`-Filter). Das ersetzt die frühere 8-12-Roundtrip-Kaskade. Beide Endpoints sind read-only mit `requireOpusToken`.

**Während des Lesens läuft der Selbst-Check der drei Invarianten** (siehe Phase 1.2 in `docs/SESSION-CLOSE-TEMPLATE.md`): Handoff-File für letzte Session vorhanden? STATE.md-Head passt zum letzten Code-Commit? active_threads konsistent? Wenn nein → Drift an Gürcan melden, vorherige Session nachträglich schließen, dann erst neu anfangen.

Für das volle Close-Protokoll (Phase 2 Kern-Arbeit, Phase 3 Session-Close): `docs/SESSION-CLOSE-TEMPLATE.md`.

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

## Aktive Arbeits-Threads (Stand: Session S34, 2026-04-20 erweitert)

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

**Drift 8 — Copilot-Parallelarbeit (entdeckt in S34).**
Copilot hat überNacht am S34-Endpoint gearbeitet und autonom einen Commit gepusht, ohne explizite Rücksprache. Das war in diesem Fall sehr nützlich — er hat die bessere technische Lösung gebaut als ich in der nächsten Session ursprünglich vorschlagen wollte. Aber es bedeutet auch: beim Start jeder Claude-Session muss der GitHub-main-HEAD gegen den `last_verified_against_code`-Stand in STATE.md verglichen werden. Wenn sie auseinanderlaufen, hat vermutlich Copilot gearbeitet. Der `/api/health`-Endpoint zeigt auch welcher Commit gerade live ist — das ist eine schnellere zweite Wahrheitsquelle.

**Drift 9 — Build-Fehler nicht sofort als Infra abtun (entdeckt in S34).**
Der S34-Deploy scheiterte dreimal in Folge mit `Exited with status 1`. Mein erster Reflex war: Infrastruktur-Problem, pnpm-Netzwerk, Cache-Flakiness. Das stimmte für den `short read EOF`-Fehler gestern Abend, aber heute morgen war es ein TypeScript-Compile-Fehler (`PUT not assignable to GET|POST|PATCH`). Die Konsequenz: bei jedem Build-Fail **zuerst die tatsächliche Fehlerzeile lesen**, nicht reflexhaft auf Infra tippen. Ein `error TS...` ist immer ein Code-Fehler, egal was drumherum steht.

**Drift 10 — Docs-Drift in Spec-Files (entdeckt in S34-Audit).**
Während des Dokumentations-Audits in S34 fanden sich mehrere Spec-Dateien, die falsche Behauptungen enthielten. Der schlimmste Fall: `docs/opus-bridge-v4-spec.md` listete fünf Punkte als "noch nicht implementiert" auf — Maya-Routing, Council-Rollen, Agent Profiles, Auto-Retry, Nachdenker — die **alle längst live waren**. Wer die Spec las, ohne den Code zu prüfen, würde in die Irre geführt. Andere Spec-Dokumente (`BUILDER-STUDIO-SPEC-v3.3`, `MAYA-BUILDER-AUSBAU-BLUEPRINT-v2`) hingen inhaltlich auf dem Stand vom 11. April, obwohl seitdem mehrere Blöcke gelandet sind. Die Konsequenz: **Spec-Dateien brauchen periodische Audits mit Umsetzungs-Hinweisen**, nicht nur einmalige Freezes. Für neue Specs gilt: Ein "Stand" oder "Umsetzungs-Status"-Feld muss mit jedem relevanten Session-Close gegengeprüft werden. Die 8 in S34 bearbeiteten Docs tragen diese Hinweise jetzt.

**Drift 11 — workerProfiles.ts als Maya-Prompt-Source (entdeckt in S34-Audit).**
`server/src/lib/workerProfiles.ts` wurde lange als reines Agent-Habitat-Metadatum behandelt — Logging, Briefing, vielleicht UI-Anzeige. Tatsächlich wird das Array `WORKER_PROFILES` in `server/src/routes/builder.ts:919` **direkt in Mayas System-Prompt gerendert**. Das heisst: wenn in workerProfiles das Modell `kimi-k2` steht, obwohl live `kimi-k2.5` läuft, dann erzählt Maya dem User und sich selbst die falsche Wahrheit. Der Drift war nicht kosmetisch. In S34 wurden 4 veraltete Model-IDs + 1 falscher costTier (`deepseek: free` statt `cheap`) gefixt. Neuer Header-Kommentar in der Datei weist auf die Konsistenz-Pflicht zu `POOL_MODEL_MAP` in `poolState.ts` hin — dort ist die Single Source of Truth.

**Drift 12 — Bridge-GitHub-Token hat keinen `workflows`-Scope (entdeckt bei F9-Umsetzung).**
Der `/git-push`-Endpoint der Opus-Bridge nutzt die GitHub Git Data API (atomare Tree+Commit+Ref-Writes) und der verwendete Token kann Content-Files committen, aber sobald eine Datei unter `.github/workflows/*` im Tree landet, antwortet GitHub mit `404 Not Found` auf `POST /repos/.../git/trees`. Das rejected den GESAMTEN atomaren Commit — auch die unschuldigen Sibling-Dateien. Erklärung: GitHub verlangt für Writes an Workflow-Files das zusätzliche `workflows`-Scope (bei fine-grained PATs) bzw. `workflow`-Scope (bei classic PATs), und der Bridge-Token hat das nicht. Das erklärt auch rückwirkend, warum historisch Workflow-Änderungen (`builder-executor.yml`, `render-deploy.yml`) immer über manuelle Commits via GitHub-Web-UI oder persönliche PATs gemacht wurden. Bei F9 Schritt C (empty-diff-Callback) wurde das sichtbar: Der Code-Teil (`pushResultWaiter.ts`, `opusSmartPush.ts`, `builder.ts`) landete als `1065cd3` per Bridge, die `builder-executor.yml`-Änderung musste manuell committet werden. Konsequenz: Wenn ein Block Workflow-Files ändert, müssen diese separat und nicht via Bridge gepusht werden. Langfristig: Bridge-Token upgraden oder dedizierte Workflow-Push-Route mit eigenem PAT-Secret.

**Drift 13 — Session-Log-Hook racet Render-Deploy-Verify (entdeckt bei F6-Live-Verify).**
Nach einem Code-Commit auf main startet der `render-deploy.yml`-Workflow und `tools/wait-for-deploy.sh` pollt `/api/health` bis der Live-Commit dem `github.sha` entspricht. Parallel dazu feuert der Session-Log-Hook aus S34 und pusht einen docs-only Backfill-Commit auf main. Render macht Auto-Deploy auf den NEUESTEN main-HEAD (den Backfill), nicht auf den ursprünglichen Code-Commit. `/api/health.commit` zeigt dann die Backfill-SHA. `wait-for-deploy.sh` erwartet aber die Code-Commit-SHA und timed nach 10 Minuten mit Exit 1 aus — der Workflow wird als FAILED markiert, obwohl der Code tatsächlich live läuft. Betroffene Commits in S35: `1065cd3` (F9 Code), `01e35e2` (workerProfiles), `8a4317d` (F6), `52b7e28` (regen-index) — alle zeigen ~13-Minuten-rot-Läufe, aber Live-Probes bestätigen dass der Code greift. Copilots Direkt-Commits (`bf22892`, `6064636`, `401b3a7`) sind GRÜN weil kein Session-Log-Race dazwischenkam. Das ist keine kosmetische Laune: CI-Status wird unzuverlässig, rotes X heißt nicht mehr „etwas ist kaputt". Fix: `tools/wait-for-deploy.sh` akzeptiert auch den Fall dass `EXPECTED_COMMIT` ein Vorfahre von `LIVE_COMMIT` ist (via `git merge-base --is-ancestor`), plus `fetch-depth: 0` im checkout-Step damit merge-base die History hat. In S35-F6 an Copilot übergeben, live verifiziert durch Commit `3596012` der in 7m17s grün durchlief (Render Deploy #103).

**Drift 14 — Bridge-Push hat Dateipfad-Bug produziert (historisch, entdeckt 2026-04-20).**
Ein Commit aus S23 (`6ff65f9`, 2026-04-14 abends) hat den damaligen HANDOFF-S23-Inhalt nicht unter `docs/HANDOFF-S23.md` abgelegt, sondern unter dem Dateinamen-String `undefined` im Repo-Root. Vermutete Ursache: Bridge-Push-Endpoint hat das `file`-Feld nicht korrekt aus dem Payload gelesen oder das Fallback-Literal `"undefined"` durchgereicht. Die Datei liegt seitdem als `/undefined` im Repo-Root. S23 galt dadurch als „Session ohne Handoff", obwohl der Handoff tatsächlich vorhanden war — nur unter falschem Namen. In S35 während der Legacy-Bereinigung entdeckt und gelöst: `docs/HANDOFF-S23.md` wurde aus der `/undefined`-Datei rekonstruiert (Commit `de90e6a`). Die ursprüngliche `/undefined`-Datei muss noch via `git rm` entfernt werden (nicht über Bridge, braucht lokalen Commit). Konsequenz für die Zukunft: Bridge-Push-Responses genau prüfen, besonders den zurückgegebenen `file`-Feldwert — wenn der unerwartet `undefined` oder leer ist, ist das ein Bug-Signal.

---

**Drift 15 — Handoff-Verify-Evidence-Class (etabliert in S35-F10, verfeinert in S36).**
Aussagen über Code-Stand und Feature-Verhalten tragen eine explizite Evidenz-Klasse statt Schluss-Sprache. Klassen: `code-review-verified` (Claude hat Code gelesen und logisch verifiziert), `compiled-verified` (TSC/Build ist grün), `live-measured` (echter HTTP-Call gegen Render mit strukturiertem Output-Check), `logical-derivation` (Folge-Aussage aus belegten Fakten). Ohne Klassen-Markierung gelten Aussagen als Chat-Memory-Claim und sind nicht belastbar. In S36 konsequent gelebt: Copilot-Selbstberichte von Tests wurden nicht blind akzeptiert, Claude fuhr unabhängig die Verify-Tests und meldete Diskrepanzen (z.B. F02-Truncation die Copilot nicht aufgefallen war, F02-Moderator-Turn-Präfix bei Test D).

**Drift 16 — Studio-JSON-Parse-Bug pre-existing (entdeckt in S35, nicht in S36 adressiert).**
`server/src/routes/studio.ts` hat einen JSON-Parse-Fehler-Pfad der pre-existing ist mindestens seit Commit `285dedb`. Baseline-Worktree auf diesem Commit reproduziert den Fehler. Nicht kausal mit S35-Arbeit verbunden. Offen als Legacy-Task.

**Drift 17 — Bridge-Push-Size-Limit (beobachtet in S36).**
Der Bridge-Push-Endpoint `/api/builder/opus-bridge/git-push` hat einen effektiven Payload-Size-Limit von ca. 100KB (laut bisheriger Erfahrung, manchmal schon bei 130KB). In S36-F02.1 scheiterte ein kombinierter Push von `studio.ts` plus `studioPrompt.ts` (zusammen 136KB) und musste in zwei getrennte Pushes aufgeteilt werden (studio.ts allein 71KB, studioPrompt.ts allein 65KB). Kein Daten-Verlust, aber operative Komplikation. Workaround: Bei Push von zwei oder mehr großen Dateien einzeln pushen, Commit-Messages entsprechend nummerieren (z.B. "Teil 1" / "Teil 2"). Langfristig: Bridge-Endpoint sollte Chunking oder höheres Limit unterstützen.

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

## Session-Close — Pflicht-Ablauf am Ende jeder Session

Die detaillierte Checkliste liegt in `docs/SESSION-CLOSE-TEMPLATE.md`. Drei Phasen, verbindlich:

- **Phase 1 — Kontext-Check** (vor der Arbeit): Anker-Docs lesen, automatischer Konsistenz-Check der vorherigen Session (siehe Mechanik-Ebene 1 unten), Unstimmigkeiten notieren, Zusammenfassung an Gürcan in 5-7 Sätzen bevor Code angefasst wird.
- **Phase 2 — Kern-Arbeit**: Im Scope bleiben. Pre-Push-TSC-Pflicht (client + server). Workflow-Dateien nicht über Bridge pushen (Drift 12).
- **Phase 3 — Session-Close** (nach der Arbeit): Live-Verify, Anker-Docs-Sync (CLAUDE-CONTEXT + STATE + RADAR + SESSION-STATE), Satelliten-Docs-Audit, neuer Handoff unter `docs/HANDOFF-S*.md`, Nebenbefund-Dokumentation, User-Touchpoint-Cheatsheet falls manuelle Schritte nötig.

### Mechanik — Warum das nicht vergessen wird

**Ebene 1 — Self-Check beim Chat-Start (Teil von Phase 1).** Claude prüft bei jedem neuen Soulmatch-Chat automatisch drei Invarianten: (a) existiert ein `docs/HANDOFF-S{last_session}.md` für die Session-Nummer aus dem Front-Matter? (b) passt `STATE.md.current_repo_head` zum letzten Non-Docs-Commit auf main? (c) sind die `active_threads` plausibel zum Code-Stand? Wenn eine Invariante verletzt ist, markiert Claude das als Drift und schlägt vor, die vorherige Session nachträglich zu schließen, **bevor** neue Arbeit beginnt.

**Ebene 2 — Proaktives Angebot vor Chat-Ende.** Wenn in der laufenden Session ein Code-Commit passiert ist (erkennbar an `/git-push` mit Code-Dateien) und User-Signale den Chat-Abschluss andeuten (*"bis später"*, *"fertig"*, *"ciao"*, *"bin weg"*, längere Ruhephase), bietet Claude Phase 3 proaktiv an. Nicht fragen ob, sondern direkt sagen: *"Session-Close läuft jetzt — Schritte 3.1 bis 3.6."*

**Ebene 3 — Grundregel (siehe unten).** Session-Close ist nicht optional, gleicher Status wie das CLAUDE-CONTEXT-Lesen.

---

## Grundregel für Claude

Wenn Claude in einem neuen Chat merkt, dass dieser Kontext-Anker (CLAUDE-CONTEXT.md) **nicht** gelesen wurde und trotzdem inhaltlich gearbeitet wird: sofort innehalten, Datei lesen, dann erst weitermachen. Nicht so tun, als wüsste man, was läuft.

Wenn Claude in einer Session einen Code-Commit macht und die Session ohne **Phase 3 (Session-Close)** enden würde: innehalten, Phase 3 ausführen. Das gilt auch wenn Gürcan es nicht explizit anfordert — die drei Phasen sind verbindlich, nicht Bitte.

Wenn Gürcan bemerkt, dass Claude gedriftet ist oder eine Phase ausgelassen hat, ist das nicht Gürcans Fehler. Dann ist der erste Satz von Claude: *"Du hast Recht, ich habe [CLAUDE-CONTEXT.md nicht gelesen / Phase 3 übersprungen / ...]. Ich hole das nach."* Keine Ausrede, keine Verteidigung.