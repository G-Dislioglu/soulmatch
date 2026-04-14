# SESSION-STATE

**Letzte Session:** S24 (2026-04-14)
**Handoff:** docs/HANDOFF-S24.md

## Aktive Entscheidungen

- Token-Limits: 100000 (Worker + Meister)
- Anchor-Patch: integriert in opusWorkerSwarm.ts (5 Modi: insert-after, insert-before, replace-block, patch, overwrite)
- Client-Dateien: im Scout-Index (439 Dateien nach regen-index)
- Pipeline-Executor: /opus-feature (kanonisch), /opus-task (aktiv), /build (legacy)
- Patrol: 6 Deep-Modelle (GLM-5.1, GLM-5-Turbo, GPT-5.4, Sonnet 4.6, DeepSeek-R, Kimi), 3 Routine-Scouts (GLM-5-Turbo, DeepSeek Chat, Minimax)
- Maya Chat: Task-Erkennung via looksLikeTaskRequest() → direkt an Builder-Task-Engine
- Git DNS: global http.curloptResolve gesetzt für github.com

## Offene Tasks

1. **Async Job-Pattern** — Pipeline-Tasks als Background-Jobs (löst Render 60s Timeout)
2. **Visual Patrol** — GLM-5V-Turbo Screenshots analysieren (CSS/Layout-Bugs)
3. **Patrol Config Backend** — Modell-Auswahl persistent speichern
4. **Deep Patrol Backend** — Deep-Analyse-Button mit echtem Multi-Model-Call verbinden
5. **Patrol Finding Auto-Fix** — Pipeline automatisch Fixes für Patrol-Findings generieren

## Reuse-First Regel

- R1: Search Before Build
- R2: Copy Over Abstract
- R3: Proof Obligation
