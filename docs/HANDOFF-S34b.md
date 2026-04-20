# HANDOFF S34b — Docs-Audit, workerProfiles-Fix, Session erweitert

**Datum:** 2026-04-20 (mittags, ~08:00 MEZ, Gürcan auf der Arbeit, Claude arbeitet eigenständig unter Beobachtung)
**Vorgänger:** S34 (`docs/HANDOFF-S34.md`, Commit `315f968`)
**Code-Commits dieser Erweiterung:** `01e35e2` (workerProfiles), Backfill `9cf39f8`, Docs-Audit `aecf53d` + `6ca04e9` + `92bcb61`, dieser Session-Close-Commit
**Live-Stand:** `9cf39f8`

---

## 1. Was in S34b passiert ist

### 1a. Docs-Audit (8 Markdown-Dokumente)

Nach dem S34-Session-Close entstand der Auftrag "Ziehe alle Docs nach und nach". Ich habe die 44 Markdown-Dateien in `docs/` kategorisiert:

- **Kategorie A (aktuell/gepflegt):** CLAUDE-CONTEXT, SESSION-STATE, HANDOFFs S33/S33b/S34, SESSION-LOG (auto), provider-specs, SESSION-CLOSE-TEMPLATE
- **Kategorie B (historische Handoffs):** S17-S21-COMPLETE, S24, S25, S30, S31, S32, PIPELINE-COMPLETE — unantastbar
- **Kategorie C (Probe-Artefakte S31):** MULTIFILE-PROBE-a/b/c, OBSERVABILITY-LIVE-CHECK, OBSERVABILITY-VERIFIED, PROBE-20260418 — unantastbar
- **Kategorie D (Spec/Roadmap):** 11 Dokumente, systematisch auf Drift geprüft
- **Kategorie E (Being-Codex/Template):** v1, v1.1 (Vorgänger), v1.2 (aktuell), CHARACTER-TEMPLATE (bereits Moved)
- **Kategorie F (Agent-Prompts):** agent-prompt-v5-phase1/2/3 — historische Prompts

**Ergebnis: 8 Dokumente angepasst, 3 atomare Commits:**

- `aecf53d` — BUILDER-TASK-session-log.md mit CLOSED-Status-Header (Endpoint ist seit S34 live); S31-CANDIDATES.md mit Session-Tracking-Block S31-S34 (markiert Schritte A/C/D als weiterhin offen); MAYA-BUILDER-AUSBAU-BLUEPRINT-v2.md mit Fortschritts-Hinweis seit 11.04 (meiste "blinde Stellen" inzwischen adressiert); project-dna.md mit Orion-Kaya-Drift-Hinweis
- `6ca04e9` — BUILDER-STUDIO-SPEC-v3.3.md mit Umsetzungs-Stand-Hinweis (was produktiv ist, was offen); **opus-bridge-v4-spec.md mit dem peinlichsten Drift-Fix des Audits**: die Liste "Was noch fehlt (nächste Schritte)" enthielt fünf Punkte (Maya-Routing, Council-Rollen, Agent Profiles, Auto-Retry, Nachdenker), die **alle längst implementiert waren** — das Dokument hat aktiv Falschinformation transportiert. Die Terminologie-Tabelle hatte zusätzlich die Nachdenker-Zeile mit "— (noch nicht implementiert)" markiert, obwohl `reflectOnTask()` in `agentHabitat.ts:184` seit S16 läuft
- `92bcb61` — BEING-CODEX-v1.md und v1.1.md bekamen Superseded-by-v1.2-Header, damit niemand versehentlich im veralteten Codex arbeitet

**Bewusst unberührt gelassen:** MAYA-BUILDER-CONTRACT (ehrlich als Entwurf markiert), FUSION-ENGINE-SPEC (ehrlich als "Spec, nicht implementiert" markiert), ARCHITECTURE-GRAPH-SPEC-v1.1-SUMMARY (Konzept-Summary), COUNCIL-DEBATE (klein/aktuell), rar-protocol-v1 (zeitlos). Kategorien B, C, F komplett unantastbar.

### 1b. workerProfiles.ts Model-ID-Drift-Fix

Beim Durcharbeiten der Aufräumer-Liste wurde der nächste Befund sichtbar: `server/src/lib/workerProfiles.ts` enthielt 4 veraltete oder falsche Einträge:

1. `minimax`: `provider: 'minimax', model: 'MiniMax-M1-80k'` → korrekt: `openrouter/minimax/minimax-m2.7`
2. `kimi`: `provider: 'moonshot', model: 'kimi-k2'` → korrekt: `openrouter/moonshotai/kimi-k2.5`
3. `qwen`: `model: 'qwen/qwen3-coder'` → korrekt: `qwen/qwen3.6-plus`
4. `deepseek`: `costTier: 'free'` → korrekt: `'cheap'` (DeepSeek kostet $0.27/$1.10, nicht kostenlos)

**Wichtiger Befund während der Untersuchung:** `WORKER_PROFILES` wird nicht nur als Logging-Metadatum benutzt, sondern in `server/src/routes/builder.ts:919` direkt in Mayas System-Prompt gerendert. Der Drift war also **nicht kosmetisch** — Maya sprach dem User gegenüber über den Worker-Pool mit falschen Modellnamen. Der Drift-Warnung-Header in workerProfiles.ts weist jetzt explizit auf die Konsistenz-Pflicht zu `POOL_MODEL_MAP` in `poolState.ts` hin, wo die Single Source of Truth liegt.

Commit `01e35e2` wurde am Morgen gegen ~08:00 MEZ gepusht, Deploy lief durch, Live seit `9cf39f8` (der Auto-Backfill-Commit). Der Deploy triggerte ordentlich (Kombination aus `01e35e2` + `9cf39f8` enthält Code-Änderung, also kein paths-ignore-Treffer).

### 1c. RADAR.md Nachzug (F6, F7, F8, F9)

RADAR.md hatte F-Kandidaten nur bis F5e. Vier neue Einträge wurden ergänzt:

- **F6 — File-Scout gegen Scope-Halluzination** (`status: active`, `next_gate: proposal`): Deterministische Verifikation jedes angefragten Dateipfads gegen den Repo-Index vor dem Worker-Lauf. Wird erst nach F9 sauber umsetzbar.
- **F7 — Pool-Config-Persistenz über DB** (`status: adopted`): Komplett absorbed in `poolState.ts`, `schema/builder.ts`, `STATE.md`. S33b-Live-Verifikation war erfolgreich.
- **F8 — Session-Log-Endpoint mit SHA-Backfill** (`status: adopted`): Live seit S34, absorbed in `opusBridge.ts`, `builderGithubBridge.ts`, `docs/SESSION-LOG.md`, `docs/CLAUDE-CONTEXT.md`.
- **F9 — S31 False-Positive Pipeline Path** (`status: active`, `next_gate: implementation`): Explizit als Haupt-Thread der nächsten Session empfohlen. Spec in `docs/S31-CANDIDATES.md`.

Kandidat H (Credits Reality Audit) und I (Chatterbox TTS) bleiben wie vorher parked.

---

## 2. Prozess-Lehren dieser Erweiterung

### 2a. Drift 10 — Docs-Drift in Spec-Files

Der größte Einzelbefund des Audits: `opus-bridge-v4-spec.md` listete fünf implementierte Features als "noch nicht implementiert". Das ist das gefährlichste Docs-Drift-Muster, weil die Spec nach wie vor wie eine gültige Roadmap aussieht, aber falsche Planungsprämissen suggeriert. Konsequenz: **Spec-Dateien brauchen periodische Audits**, nicht nur einmalige Freezes. Neue Specs sollten ein "Umsetzungs-Stand"-Feld tragen, das mit jedem Session-Close gegengeprüft wird. Die 8 in diesem Audit bearbeiteten Docs tragen diese Hinweise jetzt als Template für künftige Arbeit.

### 2b. Drift 11 — workerProfiles als versteckte Prompt-Source

`workerProfiles.ts` sah nach Logging-/Briefing-Metadatum aus. Tatsächlich landet das Array wörtlich in Mayas System-Prompt. Das heißt: **jede Drift in diesen Metadaten propagiert direkt zu Mayas Verstehen der Realität**. Ein kosmetisch aussehender Model-ID-Name wie `kimi-k2` vs `kimi-k2.5` ist nicht kosmetisch, wenn Maya dem User erzählt "der Kimi-Worker läuft auf k2" und der User eine Entscheidung auf dieser Info basiert. Die Konsequenz ist formalisiert als Drift-Warnung-Header in der Datei selbst, und als Drift-Eintrag 11 in CLAUDE-CONTEXT.md.

### 2c. Session war kein Knackpunkt-Schnitt mehr

S34 war eine Teardown-Session: Copilot hatte vorgearbeitet, ich fixte den TS-Build-Bug. S34b war eine reine Aufräum-Session: Docs konsistent machen, versteckte Drifts fixen, Anker-Dokumente nachziehen. Solche Sessions gibt es selten wegen der Kosten (Tool-Calls), aber die 30 Minuten waren eine gute Investition — ohne diesen Audit hätten künftige Claude-Sessions weiter auf falschen Spec-Prämissen gearbeitet.

---

## 3. Was live ist nach S34b

- **Live-Container-Commit:** `9cf39f8`
- **F7 (Pool-Persistenz):** Überlebt alle Deploys (seit `ae3e020`)
- **Session-Log (Kern):** Schreibt automatisch bei jedem `/git-push` (seit `fdd1097`/`a30dbdf`)
- **Session-Log (SHA-Backfill):** Fire-and-forget Follow-up (seit `b6fa46f`, live verifiziert mit `9c72a6f`)
- **workerProfiles:** 4 Model-IDs + Drift-Warnung-Header (seit `01e35e2`/`9cf39f8`)
- **Docs:** 8 Specs/Beings konsistent (seit `aecf53d`/`6ca04e9`/`92bcb61`)
- **Anti-Drift-System:** Schicht 1 (CLAUDE-CONTEXT mit 11 Drift-Einträgen), Schicht 2 (SESSION-CLOSE-TEMPLATE ungeändert ab S32), Schicht 3 (Runtime SESSION-LOG.md mit SHA-Backfill) — alle drei Schichten scharf.

---

## 4. Offen für die nächste Session

In Prioritäts-Reihenfolge:

1. **S31-False-Positive-Pipeline-Path-Fix** (Haupt-Thread, Spec: `docs/S31-CANDIDATES.md`, Kandidat F9 in RADAR). Drei enge Hebel: Schritt A (SHA-Verify in `opusSmartPush.ts`), Schritt C (Workflow-Härtung), Schritt D (Orchestrator-Status-Treue). Geschätzter Aufwand: 1-2 Stunden fokussierter Arbeit.

2. **F6 File-Scout gegen Scope-Halluzination** (Kandidat F6, depends on F9-Fix). Deterministische Verifikation jedes Dateipfads im Worker-Scope gegen den Repo-Index vor dem Lauf.

3. **Kaya-Rename im Code** (16 Orion-Stellen in `personaRouter.ts` und `studioPrompt.ts`, 0 in `HallOfSouls.tsx`). Zurückgestellt bis Maya-Core-Migration. Nicht dringlich.

4. **Restposten aus alten Sessions:**
   - S30: TSC-Retry Roundtable-Pfad, Block 5d PR #2 Context-Split
   - S24: Async Job-Pattern für `/opus-task`, Patrol Finding Auto-Fix

5. **Strategische Entscheidungen:**
   - Maya-Core-Cut (blockiert seit 2026-04-05)
   - FUSION-ENGINE-SPEC umsetzen (Multi-Provider-Ensemble pro Persona)
   - ARCHITECTURE-GRAPH-SPEC v1.1 bauen (Graph-basierte Repo-Wahrheit)

---

## 5. Für neue Chats

Einstiegs-Reihenfolge unverändert:

1. `docs/CLAUDE-CONTEXT.md` — Anker (jetzt mit 11 Drift-Einträgen)
2. `STATE.md`
3. `RADAR.md` — jetzt mit F6/F7/F8/F9
4. `docs/SESSION-STATE.md`
5. **Dieser Handoff** (`docs/HANDOFF-S34b.md`)
6. Bei Bedarf: `HANDOFF-S34.md`, `HANDOFF-S33b.md`, `HANDOFF-S33.md`, ...

Session-Historie-Lücke unverändert: S22, S23, S26, S27, S28, S29.
