/**
 * Scout Patrol v0.2 — Continuous Code Health Scanner
 *
 * Routine Patrol: 2 cheap scouts scan same files for cross-reference.
 *   If both find same issue → high confidence, auto-triaged.
 *   If only one → low confidence, stays signal.
 *
 * Deep Patrol: Premium models, manually triggerable, configurable count.
 *   For critical areas, complex files, or targeted investigation.
 *
 * Finding states: signal → triaged → verified → dismissed → fixed
 * Writes continuity notes so Maya knows about findings.
 */
import { Router, type Request, type Response } from 'express';
import { getDb } from '../db.js';
import { builderErrorCards, builderMemory } from '../schema/builder.js';
import { callProvider } from './providers.js';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { getRepoRoot } from './builderExecutor.js';
import { requireDevToken } from './requireDevToken.js';

// ── Types ──
export interface PatrolModel {
	id: string;
	provider: string;
	model: string;
	label: string;
	tier: 'routine' | 'deep';
	priceIn: number;
	priceOut: number;
}

export interface PatrolFinding {
	title: string;
	category: string;
	severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
	file: string;
	lineHint?: string;
	problem: string;
	suggestedFix?: string;
}

export type FindingState = 'signal' | 'triaged' | 'verified' | 'dismissed' | 'fixed' | 'stale';
export type FindingConfidence = 'heuristic' | 'cross-confirmed' | 'evidence-backed';

export interface PatrolEvent {
	timestamp: string;
	scout: string;
	file: string;
	status: 'clean' | 'signal' | 'triaged' | 'verified';
	findingCount: number;
}

// ── Model Registry ──
// Patrol keeps its own roster on purpose. It may move faster than the Builder-core
// pool registry, but only within already supported provider/model families.
export const ROUTINE_MODELS: PatrolModel[] = [
	{ id: 'glm-flash', provider: 'zhipu', model: 'glm-4.7-flashx', label: 'GLM 4.7 FlashX', tier: 'routine', priceIn: 0.07, priceOut: 0.40 },
	{ id: 'deepseek', provider: 'deepseek', model: 'deepseek-chat', label: 'DeepSeek Chat', tier: 'routine', priceIn: 0.28, priceOut: 0.42 },
];

export const DEEP_MODELS: PatrolModel[] = [
	{ id: 'glm-5.1', provider: 'zhipu', model: 'glm-5.1', label: 'GLM 5.1', tier: 'deep', priceIn: 1.40, priceOut: 4.40 },
	{ id: 'glm-5-turbo', provider: 'zhipu', model: 'glm-5-turbo', label: 'GLM 5 Turbo', tier: 'deep', priceIn: 1.20, priceOut: 4.00 },
	{ id: 'gpt-5.4', provider: 'openai', model: 'gpt-5.4', label: 'GPT 5.4', tier: 'deep', priceIn: 2.50, priceOut: 15.00 },
	{ id: 'sonnet-4.6', provider: 'anthropic', model: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', tier: 'deep', priceIn: 3.00, priceOut: 15.00 },
	{ id: 'deepseek-r', provider: 'deepseek', model: 'deepseek-reasoner', label: 'DeepSeek Reasoner', tier: 'deep', priceIn: 0.28, priceOut: 0.42 },
	{ id: 'kimi', provider: 'openrouter', model: 'moonshotai/kimi-k2.5', label: 'Kimi K2.5', tier: 'deep', priceIn: 0.60, priceOut: 3.00 },
];

// ── Config ──
const PATROL_INTERVAL_MS = 60 * 60 * 1000;
const FILES_PER_ROUND = 5;
const MAX_FILE_CHARS = 12000;
const DEFAULT_EXCLUDES = [
	'dist/', 'node_modules/', '.git/', 'pnpm-lock.yaml',
	'assets/filler/', 'scripts/', 'test-tts.mjs',
	'drizzle.config.ts', 'vite-env.d.ts',
];

// ── State ──
let patrolTimer: ReturnType<typeof setInterval> | null = null;
let filePointer = 0;
let isRunning = false;
let lastRunAt: Date | null = null;
let totalRounds = 0;
let totalFindings = 0;
const recentEvents: PatrolEvent[] = [];
let customExcludes: string[] = [];

// ── Helpers ──
function getScanTargets(): string[] {
	try {
		const candidates = [
			resolve(process.cwd(), 'data/builder-repo-index.json'),
			resolve(process.cwd(), 'server/data/builder-repo-index.json'),
			resolve(process.cwd(), 'docs/builder-repo-index.json'),
			resolve(process.cwd(), '../docs/builder-repo-index.json'),
			resolve(process.cwd(), '../server/data/builder-repo-index.json'),
		];
		let raw = '';
		for (const p of candidates) {
			try { raw = readFileSync(p, 'utf-8'); break; } catch { /* try next */ }
		}
		if (!raw) return [];
		const index = JSON.parse(raw) as { f: Array<{ p: string; l: number }> };
		const allExcludes = [...DEFAULT_EXCLUDES, ...customExcludes];
		return index.f
			.filter(f =>
				f.p.startsWith('server/') &&
				(f.p.endsWith('.ts') || f.p.endsWith('.tsx')) &&
				!f.p.includes('__tests__') &&
				!f.p.includes('.d.ts') &&
				!allExcludes.some(ex => f.p.includes(ex)) &&
				f.l > 20 && f.l < 800
			)
			.map(f => f.p.replace(/^server\//, ''));
	} catch {
		return [];
	}
}

async function readFileContent(filePath: string): Promise<string | null> {
	try {
		const root = getRepoRoot();
		const fullPath = resolve(root, filePath);
		const content = readFileSync(fullPath, 'utf-8');
		return content.slice(0, MAX_FILE_CHARS);
	} catch {
		return null;
	}
}

function generateCardId(): string {
	return `ptr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`.slice(0, 30);
}

function addEvent(scout: string, file: string, status: PatrolEvent['status'], findingCount: number): void {
	recentEvents.unshift({ timestamp: new Date().toISOString(), scout, file, status, findingCount });
	if (recentEvents.length > 50) recentEvents.length = 50;
}

// ── Scout Prompt ──
function buildScoutPrompt(files: Array<{ path: string; content: string }>): string {
	const fileBlocks = files.map(f => `--- FILE: ${f.path} ---\n${f.content}\n--- END ---`).join('\n\n');
	return `Du bist ein Code-Auditor. Analysiere diese Dateien auf:
- Fehlende Fehlerbehandlung (try/catch, null-checks)
- Ungenutzte Imports oder Variablen
- Inkonsistente API-Patterns
- Hardcodierte Werte die konfigurierbar sein sollten
- Sicherheitsprobleme (unvalidierte Eingaben)
- Veraltete/falsche Kommentare
- Tote Code-Pfade
- Fehlende Typisierung (any ohne Narrowing)
- Performance-Probleme

Maximal 5 Findings. Wenn KEINE Probleme: leeres Array.
Antworte NUR mit JSON-Array:
[{"title":"Kurz","category":"missing-error-handling|unused-import|type-inconsistency|security-concern|stale-comment|dead-code|hardcoded-value|performance-concern|missing-validation","severity":"critical|high|medium|low|info","file":"pfad.ts","lineHint":"~42","problem":"Was genau","suggestedFix":"Loesung"}]

${fileBlocks}`;
}

// ── Parse findings ──
function parseFindings(response: string): PatrolFinding[] {
	try {
		const match = response.match(/\[[\s\S]*\]/);
		if (!match) return [];
		const parsed = JSON.parse(match[0]) as unknown[];
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((f): f is PatrolFinding =>
				typeof f === 'object' && f !== null &&
				typeof (f as PatrolFinding).title === 'string' &&
				typeof (f as PatrolFinding).file === 'string' &&
				typeof (f as PatrolFinding).problem === 'string'
			)
			.slice(0, 5);
	} catch {
		return [];
	}
}

// ── Cross-reference: both scouts found same issue? ──
function crossMatch(a: PatrolFinding, b: PatrolFinding): boolean {
	if (a.file !== b.file) return false;
	const wordsA = a.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
	return a.category === b.category || wordsA.some(w => b.title.toLowerCase().includes(w));
}

// ── Dedup ──
async function isDuplicate(finding: PatrolFinding): Promise<boolean> {
	try {
		const db = getDb();
		const rows = await db
			.select({ id: builderErrorCards.id })
			.from(builderErrorCards)
			.where(sql`${builderErrorCards.title} ILIKE ${'%' + finding.title.slice(0, 30) + '%'}
				AND ${builderErrorCards.affectedFiles}::text ILIKE ${'%' + finding.file + '%'}`)
			.limit(1);
		return rows.length > 0;
	} catch { return false; }
}

// ── Insert finding ──
async function insertFinding(finding: PatrolFinding, scout: string, confidence: FindingConfidence, state: FindingState = 'signal'): Promise<boolean> {
	try {
		if (await isDuplicate(finding)) return false;
		const db = getDb();
		await db.insert(builderErrorCards).values({
			id: generateCardId(),
			title: finding.title.slice(0, 200),
			category: finding.category.slice(0, 20) || 'general',
			tags: ['patrol', finding.category, confidence, state],
			problem: finding.problem,
			rootCause: finding.lineHint ? `~Zeile ${finding.lineHint}` : 'Statische Analyse',
			solution: finding.suggestedFix ?? '',
			prevention: '',
			affectedFiles: [finding.file],
			affectedNodes: [],
			foundBy: scout,
			severity: finding.severity || 'medium',
		});
		return true;
	} catch (err) {
		console.error('[patrol] Insert failed:', err instanceof Error ? err.message : err);
		return false;
	}
}

// ── Continuity note ──
async function writePatrolNote(summary: string): Promise<void> {
	try {
		const db = getDb();
		await db.insert(builderMemory).values({ layer: 'continuity', key: `patrol-${Date.now()}`, summary });
	} catch (err) {
		console.error('[patrol] Note failed:', err instanceof Error ? err.message : err);
	}
}

// ══════════════════════════════════════════════════════
// ── ROUTINE PATROL ──
// ══════════════════════════════════════════════════════
export async function runRoutinePatrol(): Promise<{ scanned: number; found: number; inserted: number; crossConfirmed: number }> {
	if (isRunning) return { scanned: 0, found: 0, inserted: 0, crossConfirmed: 0 };
	isRunning = true;
	const start = Date.now();
	try {
		const targets = getScanTargets();
		if (targets.length === 0) { isRunning = false; return { scanned: 0, found: 0, inserted: 0, crossConfirmed: 0 }; }

		if (filePointer >= targets.length) filePointer = 0;
		const batch = targets.slice(filePointer, filePointer + FILES_PER_ROUND);
		filePointer += FILES_PER_ROUND;

		const files: Array<{ path: string; content: string }> = [];
		for (const p of batch) {
			const content = await readFileContent(p);
			if (content && content.length > 50) files.push({ path: p, content });
		}
		if (files.length === 0) { isRunning = false; return { scanned: 0, found: 0, inserted: 0, crossConfirmed: 0 }; }

		const prompt = buildScoutPrompt(files);
		const [rA, rB] = await Promise.allSettled([
			callProvider(ROUTINE_MODELS[0].provider, ROUTINE_MODELS[0].model, {
				system: 'Du bist ein praeziser Code-Auditor. Antworte NUR mit JSON.',
				messages: [{ role: 'user', content: prompt }], maxTokens: 1500, temperature: 0.2,
			}),
			callProvider(ROUTINE_MODELS[1].provider, ROUTINE_MODELS[1].model, {
				system: 'Du bist ein praeziser Code-Auditor. Antworte NUR mit JSON.',
				messages: [{ role: 'user', content: prompt }], maxTokens: 1500, temperature: 0.2,
			}),
		]);

		const fA = rA.status === 'fulfilled' ? parseFindings(rA.value) : [];
		const fB = rB.status === 'fulfilled' ? parseFindings(rB.value) : [];
		let inserted = 0;
		let crossConfirmed = 0;

		for (const a of fA) {
			const matched = fB.some(b => crossMatch(a, b));
			if (matched) crossConfirmed++;
			if (await insertFinding(a, 'routine-patrol', matched ? 'cross-confirmed' : 'heuristic', matched ? 'triaged' : 'signal'))
				inserted++;
			addEvent('routine', a.file, matched ? 'triaged' : 'signal', 1);
		}
		for (const b of fB) {
			if (!fA.some(a => crossMatch(a, b))) {
				if (await insertFinding(b, 'routine-patrol', 'heuristic', 'signal')) inserted++;
				addEvent('routine', b.file, 'signal', 1);
			}
		}
		for (const f of files) {
			if (![...fA, ...fB].some(x => x.file === f.path)) addEvent('routine', f.path, 'clean', 0);
		}

		totalRounds++; totalFindings += inserted; lastRunAt = new Date();
		console.log(`[patrol] Routine #${totalRounds}: ${files.length} files, ${fA.length + fB.length} raw, ${inserted} new, ${crossConfirmed} cross (${Date.now() - start}ms)`);
		if (inserted > 0) {
			const highCount = [...fA, ...fB].filter(f => f.severity === 'critical' || f.severity === 'high').length;
			await writePatrolNote(`Patrol #${totalRounds}: ${inserted} Findings (${crossConfirmed} cross-confirmed, ${highCount} high/critical). ${files.map(f => f.path.split('/').pop()).join(', ')}`);
		}
		return { scanned: files.length, found: fA.length + fB.length, inserted, crossConfirmed };
	} catch (err) {
		console.error('[patrol] Routine failed:', err instanceof Error ? err.message : err);
		return { scanned: 0, found: 0, inserted: 0, crossConfirmed: 0 };
	} finally { isRunning = false; }
}

// ══════════════════════════════════════════════════════
// ── DEEP PATROL ──
// ══════════════════════════════════════════════════════
export async function runDeepPatrol(modelIds: string[], targetFiles: string[]): Promise<{ model: string; scanned: number; found: number; inserted: number }[]> {
	const results: { model: string; scanned: number; found: number; inserted: number }[] = [];
	const files: Array<{ path: string; content: string }> = [];
	for (const p of targetFiles) {
		const content = await readFileContent(p);
		if (content && content.length > 50) files.push({ path: p, content });
	}
	if (files.length === 0) return results;
	const prompt = buildScoutPrompt(files);

	for (const modelId of modelIds) {
		const model = DEEP_MODELS.find(m => m.id === modelId);
		if (!model) { results.push({ model: modelId, scanned: 0, found: 0, inserted: 0 }); continue; }
		try {
			const response = await callProvider(model.provider, model.model, {
				system: 'Du bist ein erfahrener Senior-Code-Auditor. Analysiere gruendlich. Antworte NUR mit JSON.',
				messages: [{ role: 'user', content: prompt }], maxTokens: 2000, temperature: 0.15,
			});
			const findings = parseFindings(response);
			let inserted = 0;
			for (const f of findings) {
				if (await insertFinding(f, `deep-${model.id}`, 'evidence-backed', 'triaged')) inserted++;
				addEvent(`deep:${model.label}`, f.file, 'triaged', 1);
			}
			for (const f of files) {
				if (!findings.some(x => x.file === f.path)) addEvent(`deep:${model.label}`, f.path, 'clean', 0);
			}
			results.push({ model: model.label, scanned: files.length, found: findings.length, inserted });
			if (inserted > 0) await writePatrolNote(`Deep Patrol (${model.label}): ${inserted} Findings in ${files.map(f => f.path.split('/').pop()).join(', ')}`);
		} catch (err) {
			console.error(`[patrol] Deep ${model.label} failed:`, err instanceof Error ? err.message : err);
			results.push({ model: model.label, scanned: files.length, found: 0, inserted: 0 });
		}
	}
	return results;
}

// ── Status ──
export function getPatrolStatus() {
	return {
		running: isRunning, lastRunAt: lastRunAt?.toISOString() ?? null,
		totalRounds, totalFindings, filePointer,
		intervalMinutes: PATROL_INTERVAL_MS / 60000,
		recentEvents: recentEvents.slice(0, 20),
		excludes: [...DEFAULT_EXCLUDES, ...customExcludes],
		routineModels: ROUTINE_MODELS.map(m => ({ id: m.id, label: m.label, price: `$${m.priceIn}/$${m.priceOut}` })),
		deepModels: DEEP_MODELS.map(m => ({ id: m.id, label: m.label, price: `$${m.priceIn}/$${m.priceOut}` })),
	};
}

// ── Start/Stop ──
export function startPatrol(): void {
	if (patrolTimer) return;
	console.log('[patrol] Starting routine patrol (60min interval, first run in 5min)');
	setTimeout(() => { void runRoutinePatrol(); }, 5 * 60 * 1000);
	patrolTimer = setInterval(() => { void runRoutinePatrol(); }, PATROL_INTERVAL_MS);
}

export function stopPatrol(): void {
	if (patrolTimer) { clearInterval(patrolTimer); patrolTimer = null; console.log('[patrol] Stopped'); }
}

// ══════════════════════════════════════════════════════
// ── ROUTER ──
// ══════════════════════════════════════════════════════
export const patrolRouter = Router();
patrolRouter.use(requireDevToken);

patrolRouter.get('/status', (_req: Request, res: Response) => { res.json(getPatrolStatus()); });

patrolRouter.post('/run', async (_req: Request, res: Response) => {
	try { res.json({ ok: true, ...(await runRoutinePatrol()) }); }
	catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' }); }
});

patrolRouter.post('/deep', async (req: Request, res: Response) => {
	try {
		const { models, files } = req.body as { models?: string[]; files?: string[] };
		if (!models?.length || !files?.length) { res.status(400).json({ error: 'models[] and files[] required' }); return; }
		res.json({ ok: true, results: await runDeepPatrol(models, files) });
	} catch (err) { res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' }); }
});

patrolRouter.post('/exclude', (req: Request, res: Response) => {
	const { patterns } = req.body as { patterns?: string[] };
	if (patterns?.length) customExcludes = [...new Set([...customExcludes, ...patterns])];
	res.json({ ok: true, excludes: [...DEFAULT_EXCLUDES, ...customExcludes] });
});

patrolRouter.delete('/exclude', (req: Request, res: Response) => {
	const { patterns } = req.body as { patterns?: string[] };
	if (!patterns?.length) customExcludes = [];
	else customExcludes = customExcludes.filter(e => !patterns.includes(e));
	res.json({ ok: true, excludes: [...DEFAULT_EXCLUDES, ...customExcludes] });
});

patrolRouter.get('/findings', async (_req: Request, res: Response) => {
	try {
		const db = getDb();
		const findings = await db.select().from(builderErrorCards)
			.where(sql`${builderErrorCards.foundBy} LIKE 'routine-%' OR ${builderErrorCards.foundBy} LIKE 'deep-%'`)
			.orderBy(sql`${builderErrorCards.createdAt} DESC`).limit(50);
		res.json(findings);
	} catch { res.status(500).json({ error: 'Failed' }); }
});

patrolRouter.post('/findings/:id/verify', async (req: Request, res: Response) => {
	try {
		const db = getDb();
		await db.execute(sql`UPDATE builder_error_cards SET tags = array_append(array_remove(array_remove(tags, 'signal'), 'triaged'), 'verified') WHERE id = ${req.params.id}`);
		res.json({ ok: true });
	} catch { res.status(500).json({ error: 'Failed' }); }
});

patrolRouter.post('/findings/:id/dismiss', async (req: Request, res: Response) => {
	try {
		const db = getDb();
		await db.execute(sql`UPDATE builder_error_cards SET tags = array_append(array_remove(array_remove(tags, 'signal'), 'triaged'), 'dismissed'), resolved_at = NOW() WHERE id = ${req.params.id}`);
		res.json({ ok: true });
	} catch { res.status(500).json({ error: 'Failed' }); }
});
