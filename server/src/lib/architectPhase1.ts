import { createHash } from 'node:crypto';
import { desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '../db.js';
import { builderAssumptions } from '../schema/builder.js';
import { getBuilderControlState } from './builderControlPlane.js';
import { outboundFetch } from './outboundHttp.js';
import { hardenInstruction, type SpecHardeningReport } from './specHardening.js';

export type ArchitectSourceKind = 'instruction' | 'http_meta' | 'assumption' | 'system';
export type ArchitectHardeningStatus = 'accepted' | 'truncated' | 'blocked';

export interface ArchitectFinding {
  code: string;
  severity: 'warning' | 'blocked';
  message: string;
  sourceKind: ArchitectSourceKind;
}

export interface ArchitectProvenance {
  sourceKind: ArchitectSourceKind;
  sourceId: string;
  title: string;
  creator: string;
  createdAt: string;
  sourceUri?: string;
}

export interface ArchitectTruncation {
  originalLength: number;
  finalLength: number;
  truncated: boolean;
  limit: number;
}

export interface ArchitectSourceFragment {
  id: string;
  text: string;
  hardeningStatus: ArchitectHardeningStatus;
  reuseAllowed: boolean;
  findings: ArchitectFinding[];
  provenance: ArchitectProvenance;
  truncation: ArchitectTruncation;
  createdAt: string;
}

export interface ArchitectTaskAugmentations {
  metaSourceIds?: string[];
  assumptions?: string[];
  assumptionIds?: string[];
}

export interface ArchitectAssemblyResult {
  ok: boolean;
  finalInstruction: string;
  dispatchHardening: SpecHardeningReport;
  metaFragments: ArchitectSourceFragment[];
  selectedAssumptions: ArchitectSourceFragment[];
  omittedMetaFragments: ArchitectSourceFragment[];
  findings: ArchitectFinding[];
  warnings: string[];
  blockReason?: string;
}

interface ArchitectObservationFindingAggregateBySeverity {
  severity: ArchitectFinding['severity'];
  count: number;
}

interface ArchitectObservationFindingAggregateByCode {
  code: string;
  count: number;
}

interface ArchitectObservationFindingAggregateBySourceKind {
  sourceKind: ArchitectSourceKind;
  count: number;
}

interface ArchitectObservationSignal {
  code: string;
  sourceKind: ArchitectSourceKind;
  count: number;
}

interface ArchitectObservationTruncationSummary {
  totalFragments: number;
  truncatedFragments: number;
  totalOriginalLength: number;
  totalFinalLength: number;
  totalTrimmedChars: number;
}

interface ArchitectObservationFindingSummary {
  total: number;
  bySeverity: ArchitectObservationFindingAggregateBySeverity[];
  byCode: ArchitectObservationFindingAggregateByCode[];
  bySourceKind: ArchitectObservationFindingAggregateBySourceKind[];
}

type PersistedAssumptionRow = typeof builderAssumptions.$inferSelect;

type AicosIndexEntry = {
  id?: string;
  title?: string;
  token?: string;
  type?: string;
  domain?: string[];
  tags?: string[];
  status?: string;
  essence?: string;
  applies_to?: string[];
  steps?: string[];
  fixes?: string[];
  copy_ready?: boolean;
};

type AicosIndexCache = {
  entries: AicosIndexEntry[];
  fetchedAt: number;
  sourceUrl: string;
};

type ArchitectObservation = {
  updatedAt: string | null;
  observedAssemblies: number;
  finalInstructionLength: number;
  metaFragments: Array<ReturnType<typeof compactFragment>>;
  selectedAssumptions: Array<ReturnType<typeof compactFragment>>;
  omittedMetaFragments: Array<ReturnType<typeof compactFragment>>;
  warnings: string[];
  findingSummary: ArchitectObservationFindingSummary;
  truncationSummary: ArchitectObservationTruncationSummary;
  lastBlockedSignals: ArchitectObservationSignal[];
  lastWarningSignals: ArchitectObservationSignal[];
  dispatchHardening: {
    ok: boolean;
    warningCount: number;
    blockCount: number;
  } | null;
};

const USER_INSTRUCTION_SOFT_LIMIT = 12_000;
const HTTP_META_FETCH_LIMIT = 12_000;
const HTTP_META_REUSE_LIMIT = 4_000;
const ASSUMPTION_LIMIT = 1_000;
const FINAL_DISPATCH_SOFT_LIMIT = 20_000;
const INDEX_CACHE_TTL_MS = 10 * 60 * 1_000;
const AICOS_INDEX_URLS = [
  'https://raw.githubusercontent.com/G-Dislioglu/aicos-registry/master/index/INDEX.json',
  'https://cdn.jsdelivr.net/gh/G-Dislioglu/aicos-registry@master/index/INDEX.json',
];

const assumptionCache = new Map<string, ArchitectSourceFragment>();
let assumptionsPrimed = false;
let bootstrapComplete = false;
let persistenceMode: 'unknown' | 'database' | 'memory_fallback' = 'unknown';
let indexCache: AicosIndexCache | null = null;
let latestObservation: ArchitectObservation = {
  updatedAt: null,
  // Not every early return path reaches updateObservation() yet.
  observedAssemblies: 0,
  finalInstructionLength: 0,
  metaFragments: [],
  selectedAssumptions: [],
  omittedMetaFragments: [],
  warnings: [],
  findingSummary: {
    total: 0,
    bySeverity: [],
    byCode: [],
    bySourceKind: [],
  },
  truncationSummary: {
    totalFragments: 0,
    truncatedFragments: 0,
    totalOriginalLength: 0,
    totalFinalLength: 0,
    totalTrimmedChars: 0,
  },
  lastBlockedSignals: [],
  lastWarningSignals: [],
  dispatchHardening: null,
};

const BLOCKED_PATTERNS: Array<{ code: string; message: string; regex: RegExp }> = [
  {
    code: 'prompt_override_pattern',
    message: 'Text enthaelt ein offensichtliches Prompt-Override-Muster.',
    regex: /ignore\s+(all|any|the|previous|prior)\s+(instructions|prompts?)/i,
  },
  {
    code: 'system_prompt_probe',
    message: 'Text versucht System-Prompts oder Hidden-Context zu adressieren.',
    regex: /system\s+prompt|hidden\s+prompt|developer\s+message/i,
  },
  {
    code: 'secret_exfiltration_pattern',
    message: 'Text fordert moegliche Secret-, Env- oder Token-Ausgabe an.',
     regex: /printenv|process\.env|api[_\s-]?key|client[_\s-]?secret|private[_\s-]?key|bearer\s+[a-z0-9._-]+|(?:reveal|dump|show|print|expose)[^\n]{0,40}\b(?:secret|token|key)s?\b/i,
  },
  {
    code: 'script_injection_pattern',
    message: 'Text enthaelt Script- oder Javascript-Injection-Muster.',
    regex: /<script\b|<iframe\b|javascript:/i,
  },
];

const WARNING_PATTERNS: Array<{ code: string; message: string; regex: RegExp }> = [
  {
    code: 'raw_html_detected',
    message: 'Text enthaelt rohe HTML-Tags und wurde nur eng normalisiert.',
    regex: /<\/?[a-z][^>]*>/i,
  },
  {
    code: 'code_fence_detected',
    message: 'Text enthaelt Code-Fences und wird nur als normalisierter Kontext behandelt.',
    regex: /```/,
  },
];

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function clampText(text: string, limit: number): { text: string; truncation: ArchitectTruncation } {
  if (text.length <= limit) {
    return {
      text,
      truncation: {
        originalLength: text.length,
        finalLength: text.length,
        truncated: false,
        limit,
      },
    };
  }

  const shortened = `${text.slice(0, Math.max(0, limit - 24)).trimEnd()}\n[truncated:${text.length - limit}]`;
  return {
    text: shortened,
    truncation: {
      originalLength: text.length,
      finalLength: shortened.length,
      truncated: true,
      limit,
    },
  };
}

function createStableId(prefix: string, text: string): string {
  return `${prefix}-${createHash('sha256').update(text).digest('hex').slice(0, 16)}`;
}

function scanFindings(text: string, sourceKind: ArchitectSourceKind): ArchitectFinding[] {
  const findings: ArchitectFinding[] = [];

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.regex.test(text)) {
      findings.push({
        code: pattern.code,
        severity: 'blocked',
        message: pattern.message,
        sourceKind,
      });
    }
  }

  for (const pattern of WARNING_PATTERNS) {
    if (pattern.regex.test(text)) {
      findings.push({
        code: pattern.code,
        severity: 'warning',
        message: pattern.message,
        sourceKind,
      });
    }
  }

  return findings;
}

function compactFragment(fragment: ArchitectSourceFragment) {
  return {
    id: fragment.id,
    sourceKind: fragment.provenance.sourceKind,
    sourceId: fragment.provenance.sourceId,
    title: fragment.provenance.title,
    hardeningStatus: fragment.hardeningStatus,
    reuseAllowed: fragment.reuseAllowed,
    createdAt: fragment.createdAt,
    findings: fragment.findings.map((finding) => ({
      code: finding.code,
      severity: finding.severity,
    })),
    truncation: fragment.truncation,
  };
}

function sortCountEntries(left: [string, number], right: [string, number]): number {
  if (left[1] !== right[1]) {
    return right[1] - left[1];
  }

  return left[0].localeCompare(right[0]);
}

function countByKey(values: string[]): Array<[string, number]> {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()].sort(sortCountEntries);
}

function normalizeObservationFindings(result: ArchitectAssemblyResult): ArchitectFinding[] {
  return [
    ...result.findings,
    ...result.dispatchHardening.findings.map((finding) => {
      const severity: ArchitectFinding['severity'] = finding.severity === 'block' ? 'blocked' : 'warning';

      return {
        code: finding.code,
        severity,
        message: finding.message,
        sourceKind: 'instruction' as const,
      };
    }),
  ];
}

function summarizeFindings(findings: ArchitectFinding[]): ArchitectObservationFindingSummary {
  return {
    total: findings.length,
    bySeverity: countByKey(findings.map((finding) => finding.severity)).map(([severity, count]) => ({
      severity: severity as ArchitectFinding['severity'],
      count,
    })),
    byCode: countByKey(findings.map((finding) => finding.code)).map(([code, count]) => ({
      code,
      count,
    })),
    bySourceKind: countByKey(findings.map((finding) => finding.sourceKind)).map(([sourceKind, count]) => ({
      sourceKind: sourceKind as ArchitectSourceKind,
      count,
    })),
  };
}

function summarizeSignals(
  findings: ArchitectFinding[],
  severity: ArchitectFinding['severity'],
): ArchitectObservationSignal[] {
  const counts = new Map<string, ArchitectObservationSignal>();

  for (const finding of findings) {
    if (finding.severity !== severity) {
      continue;
    }

    const key = `${finding.code}::${finding.sourceKind}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    counts.set(key, {
      code: finding.code,
      sourceKind: finding.sourceKind,
      count: 1,
    });
  }

  return [...counts.values()].sort((left, right) => {
    if (left.count !== right.count) {
      return right.count - left.count;
    }

    const byCode = left.code.localeCompare(right.code);
    return byCode !== 0 ? byCode : left.sourceKind.localeCompare(right.sourceKind);
  });
}

function summarizeTruncation(fragments: ArchitectSourceFragment[]): ArchitectObservationTruncationSummary {
  return fragments.reduce<ArchitectObservationTruncationSummary>((summary, fragment) => ({
    totalFragments: summary.totalFragments + 1,
    truncatedFragments: summary.truncatedFragments + (fragment.truncation.truncated ? 1 : 0),
    totalOriginalLength: summary.totalOriginalLength + fragment.truncation.originalLength,
    totalFinalLength: summary.totalFinalLength + fragment.truncation.finalLength,
    totalTrimmedChars: summary.totalTrimmedChars + Math.max(0, fragment.truncation.originalLength - fragment.truncation.finalLength),
  }), {
    totalFragments: 0,
    truncatedFragments: 0,
    totalOriginalLength: 0,
    totalFinalLength: 0,
    totalTrimmedChars: 0,
  });
}

function toJsonObject(value: object): Record<string, unknown> {
  return value as unknown as Record<string, unknown>;
}

function toJsonArray(value: object[]): Record<string, unknown>[] {
  return value as unknown as Record<string, unknown>[];
}

function serializeFragmentSection(fragment: ArchitectSourceFragment): string {
  return [
    `- id: ${fragment.id}`,
    `  title: ${fragment.provenance.title}`,
    `  sourceKind: ${fragment.provenance.sourceKind}`,
    `  sourceId: ${fragment.provenance.sourceId}`,
    `  creator: ${fragment.provenance.creator}`,
    `  hardeningStatus: ${fragment.hardeningStatus}`,
    `  reuseAllowed: ${fragment.reuseAllowed ? 'true' : 'false'}`,
    `  text: ${fragment.text}`,
  ].join('\n');
}

function hydrateAssumption(row: PersistedAssumptionRow): ArchitectSourceFragment {
  const provenance = typeof row.provenance === 'object' && row.provenance !== null
    ? row.provenance as unknown as ArchitectProvenance
    : {
        sourceKind: row.sourceKind as ArchitectSourceKind,
        sourceId: row.id,
        title: row.title,
        creator: row.creator,
        createdAt: row.createdAt.toISOString(),
      };
  const truncation = typeof row.truncation === 'object' && row.truncation !== null
    ? row.truncation as unknown as ArchitectTruncation
    : {
        originalLength: row.text.length,
        finalLength: row.text.length,
        truncated: false,
        limit: ASSUMPTION_LIMIT,
      };
  const findings = Array.isArray(row.findings) ? row.findings as unknown as ArchitectFinding[] : [];

  return {
    id: row.id,
    text: row.text,
    hardeningStatus: row.hardeningStatus as ArchitectHardeningStatus,
    reuseAllowed: row.reuseAllowed,
    findings,
    provenance,
    truncation,
    createdAt: row.createdAt.toISOString(),
  };
}

async function primeAssumptionCache(): Promise<void> {
  if (assumptionsPrimed) {
    return;
  }

  assumptionsPrimed = true;

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(builderAssumptions)
      .orderBy(desc(builderAssumptions.updatedAt));

    assumptionCache.clear();
    for (const row of rows) {
      const fragment = hydrateAssumption(row);
      assumptionCache.set(fragment.id, fragment);
    }
    persistenceMode = 'database';
  } catch (error) {
    persistenceMode = 'memory_fallback';
    console.warn('[architect-phase1] assumption prime fallback:', error);
  }
}

async function persistAssumption(fragment: ArchitectSourceFragment): Promise<void> {
  assumptionCache.set(fragment.id, fragment);

  try {
    const db = getDb();
    await db
      .insert(builderAssumptions)
      .values({
        id: fragment.id,
        text: fragment.text,
        hardeningStatus: fragment.hardeningStatus,
        reuseAllowed: fragment.reuseAllowed,
        sourceKind: fragment.provenance.sourceKind,
        creator: fragment.provenance.creator,
        title: fragment.provenance.title,
        provenance: toJsonObject(fragment.provenance),
        findings: toJsonArray(fragment.findings),
        truncation: toJsonObject(fragment.truncation),
        createdAt: new Date(fragment.createdAt),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: builderAssumptions.id,
        set: {
          text: fragment.text,
          hardeningStatus: fragment.hardeningStatus,
          reuseAllowed: fragment.reuseAllowed,
          sourceKind: fragment.provenance.sourceKind,
          creator: fragment.provenance.creator,
          title: fragment.provenance.title,
          provenance: toJsonObject(fragment.provenance),
          findings: toJsonArray(fragment.findings),
          truncation: toJsonObject(fragment.truncation),
          updatedAt: new Date(),
        },
      });
    persistenceMode = 'database';
  } catch (error) {
    persistenceMode = 'memory_fallback';
    console.warn('[architect-phase1] assumption persist fallback:', error);
  }
}

async function getPersistedAssumptionsByIds(ids: string[]): Promise<ArchitectSourceFragment[]> {
  if (ids.length === 0) {
    return [];
  }

  try {
    const db = getDb();
    const rows = await db
      .select()
      .from(builderAssumptions)
      .where(inArray(builderAssumptions.id, ids));

    const fragments = rows.map(hydrateAssumption);
    for (const fragment of fragments) {
      assumptionCache.set(fragment.id, fragment);
    }
    persistenceMode = 'database';
    return fragments;
  } catch {
    return ids
      .map((id) => assumptionCache.get(id))
      .filter((fragment): fragment is ArchitectSourceFragment => Boolean(fragment));
  }
}

function buildAssumptionFragment(text: string, sourceKind: 'assumption' | 'system', creator: string): ArchitectSourceFragment {
  const normalized = normalizeWhitespace(text);
  const createdAt = nowIso();
  const findings = scanFindings(normalized, sourceKind);
  const blocked = findings.some((finding) => finding.severity === 'blocked');
  const id = createStableId(sourceKind, `${sourceKind}:${normalized}`);

  return {
    id,
    text: normalized,
    hardeningStatus: blocked ? 'blocked' : 'accepted',
    reuseAllowed: !blocked,
    findings,
    provenance: {
      sourceKind,
      sourceId: id,
      title: normalized.slice(0, 120),
      creator,
      createdAt,
    },
    truncation: {
      originalLength: normalized.length,
      finalLength: normalized.length,
      truncated: false,
      limit: ASSUMPTION_LIMIT,
    },
    createdAt,
  };
}

export async function ensureBootstrapAssumptions(): Promise<void> {
  await primeAssumptionCache();

  if (bootstrapComplete) {
    return;
  }

  bootstrapComplete = true;
  const openAssumptions = getBuilderControlState().openAssumptions;

  for (const entry of openAssumptions) {
    const normalized = normalizeWhitespace(entry);
    if (!normalized) {
      continue;
    }

    const fragment = buildAssumptionFragment(normalized, 'system', 'phase0-bootstrap');
    if (!assumptionCache.has(fragment.id)) {
      await persistAssumption(fragment);
    }
  }
}

export async function addAssumption(text: string, creator = 'opus-runtime'): Promise<
  | { ok: true; entry: ArchitectSourceFragment }
  | { ok: false; reason: string }
> {
  await primeAssumptionCache();
  const normalized = normalizeWhitespace(text);

  if (!normalized) {
    return { ok: false, reason: 'Assumption text darf nicht leer sein.' };
  }
  if (normalized.length > ASSUMPTION_LIMIT) {
    return { ok: false, reason: `Assumption text ueberschreitet das Limit von ${ASSUMPTION_LIMIT} Zeichen.` };
  }
  if (/\n\s*\n/.test(normalized)) {
    return { ok: false, reason: 'Assumption text darf keine Multi-Paragraph-Struktur enthalten.' };
  }

  const fragment = buildAssumptionFragment(normalized, 'assumption', creator);
  await persistAssumption(fragment);
  return { ok: true, entry: fragment };
}

export async function listArchitectAssumptions(): Promise<ArchitectSourceFragment[]> {
  await ensureBootstrapAssumptions();

  return Array.from(assumptionCache.values()).sort((left, right) => {
    return right.createdAt.localeCompare(left.createdAt);
  });
}

export async function getArchitectAssumptionsByIds(ids: string[]): Promise<ArchitectSourceFragment[]> {
  await ensureBootstrapAssumptions();
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const cached = uniqueIds
    .map((id) => assumptionCache.get(id))
    .filter((fragment): fragment is ArchitectSourceFragment => Boolean(fragment));

  const missingIds = uniqueIds.filter((id) => !assumptionCache.has(id));
  const persisted = await getPersistedAssumptionsByIds(missingIds);
  const merged = [...cached, ...persisted];
  const byId = new Map(merged.map((fragment) => [fragment.id, fragment]));

  return uniqueIds
    .map((id) => byId.get(id))
    .filter((fragment): fragment is ArchitectSourceFragment => Boolean(fragment));
}

async function fetchAicosIndexFromUrl(url: string): Promise<AicosIndexEntry[]> {
  const response = await outboundFetch(url, {
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = await response.json() as unknown;
  if (Array.isArray(payload)) {
    return payload as AicosIndexEntry[];
  }
  if (payload && typeof payload === 'object' && Array.isArray((payload as { cards?: unknown[] }).cards)) {
    return (payload as { cards: AicosIndexEntry[] }).cards;
  }

  throw new Error('Unexpected AICOS index payload');
}

async function getAicosIndex(): Promise<AicosIndexCache> {
  if (indexCache && Date.now() - indexCache.fetchedAt < INDEX_CACHE_TTL_MS) {
    return indexCache;
  }

  const settled = await Promise.allSettled(AICOS_INDEX_URLS.map(async (url) => ({
    url,
    entries: await fetchAicosIndexFromUrl(url),
  })));

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      indexCache = {
        entries: result.value.entries,
        fetchedAt: Date.now(),
        sourceUrl: result.value.url,
      };
      return indexCache;
    }
  }

  if (indexCache) {
    return indexCache;
  }

  throw new Error('AICOS index konnte ueber keine Fallback-Quelle geladen werden.');
}

function normalizeAicosEntry(entry: AicosIndexEntry): string {
  const lines = [
    entry.title ? `Title: ${entry.title}` : null,
    entry.id ? `Id: ${entry.id}` : null,
    entry.type ? `Type: ${entry.type}` : null,
    entry.token ? `Token: ${entry.token}` : null,
    Array.isArray(entry.domain) && entry.domain.length > 0 ? `Domain: ${entry.domain.join(', ')}` : null,
    Array.isArray(entry.tags) && entry.tags.length > 0 ? `Tags: ${entry.tags.join(', ')}` : null,
    typeof entry.status === 'string' ? `Status: ${entry.status}` : null,
    typeof entry.essence === 'string' ? `Essence: ${entry.essence}` : null,
    Array.isArray(entry.applies_to) && entry.applies_to.length > 0
      ? `Applies to: ${entry.applies_to.slice(0, 4).join(' | ')}`
      : null,
    Array.isArray(entry.steps) && entry.steps.length > 0
      ? `Steps: ${entry.steps.slice(0, 5).join(' | ')}`
      : null,
    Array.isArray(entry.fixes) && entry.fixes.length > 0 ? `Fixes: ${entry.fixes.join(', ')}` : null,
    typeof entry.copy_ready === 'boolean' ? `Copy ready: ${entry.copy_ready ? 'true' : 'false'}` : null,
  ].filter((line): line is string => Boolean(line));

  return normalizeWhitespace(lines.join('\n'));
}

function toMetaFragment(entry: AicosIndexEntry, sourceUrl: string): ArchitectSourceFragment {
  const rawText = normalizeAicosEntry(entry);
  const fetched = clampText(rawText, HTTP_META_FETCH_LIMIT);
  const reuse = clampText(fetched.text, HTTP_META_REUSE_LIMIT);
  const findings = scanFindings(rawText, 'http_meta');
  const blocked = findings.some((finding) => finding.severity === 'blocked');
  const id = createStableId('meta', `${entry.id ?? entry.token ?? rawText}`);
  const createdAt = nowIso();

  return {
    id,
    text: reuse.text,
    hardeningStatus: blocked ? 'blocked' : (fetched.truncation.truncated || reuse.truncation.truncated ? 'truncated' : 'accepted'),
    reuseAllowed: !blocked,
    findings,
    provenance: {
      sourceKind: 'http_meta',
      sourceId: entry.id || entry.token || id,
      title: entry.title || entry.id || entry.token || 'AICOS meta source',
      creator: 'aicos-index-loader',
      createdAt,
      sourceUri: `${sourceUrl}#${encodeURIComponent(entry.id || entry.token || id)}`,
    },
    truncation: {
      originalLength: rawText.length,
      finalLength: reuse.text.length,
      truncated: fetched.truncation.truncated || reuse.truncation.truncated,
      limit: HTTP_META_REUSE_LIMIT,
    },
    createdAt,
  };
}

export async function loadAicosMetaFragments(metaSourceIds: string[]): Promise<{
  fragments: ArchitectSourceFragment[];
  warnings: string[];
}> {
  const uniqueIds = [...new Set(metaSourceIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { fragments: [], warnings: [] };
  }

  try {
    const index = await getAicosIndex();
    const fragments: ArchitectSourceFragment[] = [];
    const warnings: string[] = [];

    for (const sourceId of uniqueIds) {
      const entry = index.entries.find((candidate) => candidate.id === sourceId || candidate.token === sourceId);
      if (!entry) {
        warnings.push(`AICOS source not found: ${sourceId}`);
        continue;
      }

      fragments.push(toMetaFragment(entry, index.sourceUrl));
    }

    return { fragments, warnings };
  } catch (error) {
    return {
      fragments: [],
      warnings: [error instanceof Error ? error.message : String(error)],
    };
  }
}

function updateObservation(result: ArchitectAssemblyResult): void {
  const observationFindings = normalizeObservationFindings(result);
  const observationFragments = [
    ...result.metaFragments,
    ...result.selectedAssumptions,
    ...result.omittedMetaFragments,
  ];

  latestObservation = {
    updatedAt: nowIso(),
    observedAssemblies: latestObservation.observedAssemblies + 1,
    finalInstructionLength: result.finalInstruction.length,
    metaFragments: result.metaFragments.map(compactFragment),
    selectedAssumptions: result.selectedAssumptions.map(compactFragment),
    omittedMetaFragments: result.omittedMetaFragments.map(compactFragment),
    warnings: result.warnings,
    findingSummary: summarizeFindings(observationFindings),
    truncationSummary: summarizeTruncation(observationFragments),
    lastBlockedSignals: summarizeSignals(observationFindings, 'blocked'),
    lastWarningSignals: summarizeSignals(observationFindings, 'warning'),
    dispatchHardening: {
      ok: result.dispatchHardening.ok,
      warningCount: result.dispatchHardening.stats.warnCount,
      blockCount: result.dispatchHardening.stats.blockCount,
    },
  };
}

export async function getArchitectState(): Promise<{
  controlPlane: ReturnType<typeof getBuilderControlState>;
  assumptions: Array<ReturnType<typeof compactFragment>>;
  latestObservation: ArchitectObservation;
  aicosLoader: {
    cacheAgeMs: number | null;
    cachedEntries: number;
    sourceUrl: string | null;
    fallbackUrls: string[];
  };
  persistenceMode: 'unknown' | 'database' | 'memory_fallback';
}> {
  const assumptions = await listArchitectAssumptions();

  return {
    controlPlane: getBuilderControlState(),
    assumptions: assumptions.slice(0, 50).map(compactFragment),
    latestObservation,
    aicosLoader: {
      cacheAgeMs: indexCache ? Date.now() - indexCache.fetchedAt : null,
      cachedEntries: indexCache?.entries.length ?? 0,
      sourceUrl: indexCache?.sourceUrl ?? null,
      fallbackUrls: AICOS_INDEX_URLS,
    },
    persistenceMode,
  };
}

export async function assembleArchitectInstruction(
  instruction: string,
  augmentations: ArchitectTaskAugmentations,
): Promise<ArchitectAssemblyResult> {
  await ensureBootstrapAssumptions();

  const warnings: string[] = [];
  const findings: ArchitectFinding[] = [];

  if (instruction.length > USER_INSTRUCTION_SOFT_LIMIT) {
    const dispatchHardening = hardenInstruction(instruction);
    return {
      ok: false,
      finalInstruction: instruction,
      dispatchHardening,
      metaFragments: [],
      selectedAssumptions: [],
      omittedMetaFragments: [],
      findings,
      warnings,
      blockReason: `User instruction exceeds the Phase-1 soft limit of ${USER_INSTRUCTION_SOFT_LIMIT} characters.`,
    };
  }

  const { fragments: metaFragments, warnings: metaWarnings } = await loadAicosMetaFragments(augmentations.metaSourceIds ?? []);
  warnings.push(...metaWarnings);
  const allowedMetaFragments = metaFragments.filter((fragment) => fragment.reuseAllowed);
  const omittedMetaFragments = metaFragments.filter((fragment) => !fragment.reuseAllowed);
  findings.push(...metaFragments.flatMap((fragment) => fragment.findings));

  const selectedAssumptions: ArchitectSourceFragment[] = [];
  for (const assumptionText of augmentations.assumptions ?? []) {
    const result = await addAssumption(assumptionText, 'opus-runtime');
    if (!result.ok) {
      const dispatchHardening = hardenInstruction(instruction);
      return {
        ok: false,
        finalInstruction: instruction,
        dispatchHardening,
        metaFragments: allowedMetaFragments,
        selectedAssumptions,
        omittedMetaFragments,
        findings,
        warnings,
        blockReason: result.reason,
      };
    }
    selectedAssumptions.push(result.entry);
  }

  const retrievedAssumptions = await getArchitectAssumptionsByIds(augmentations.assumptionIds ?? []);
  const missingAssumptionIds = [...new Set((augmentations.assumptionIds ?? []).filter((id) => !retrievedAssumptions.some((fragment) => fragment.id === id)))];
  if (missingAssumptionIds.length > 0) {
    const dispatchHardening = hardenInstruction(instruction);
    return {
      ok: false,
      finalInstruction: instruction,
      dispatchHardening,
      metaFragments: allowedMetaFragments,
      selectedAssumptions,
      omittedMetaFragments,
      findings,
      warnings,
      blockReason: `Unknown assumption ids: ${missingAssumptionIds.join(', ')}`,
    };
  }

  const mergedAssumptions = [...selectedAssumptions, ...retrievedAssumptions];
  const uniqueAssumptions = Array.from(new Map(mergedAssumptions.map((fragment) => [fragment.id, fragment])).values());
  findings.push(...uniqueAssumptions.flatMap((fragment) => fragment.findings));

  const blockedAssumptions = uniqueAssumptions.filter((fragment) => fragment.hardeningStatus === 'blocked' || !fragment.reuseAllowed);
  if (blockedAssumptions.length > 0) {
    const dispatchHardening = hardenInstruction(instruction);
    const result = {
      ok: false,
      finalInstruction: instruction,
      dispatchHardening,
      metaFragments: allowedMetaFragments,
      selectedAssumptions: uniqueAssumptions,
      omittedMetaFragments,
      findings,
      warnings,
      blockReason: `Blocked assumption fragments selected: ${blockedAssumptions.map((fragment) => fragment.id).join(', ')}`,
    } satisfies ArchitectAssemblyResult;
    updateObservation(result);
    return result;
  }

  const sections = [
    instruction.trim(),
    allowedMetaFragments.length > 0
      ? ['ARCHITECT HTTP META SOURCES', ...allowedMetaFragments.map(serializeFragmentSection)].join('\n\n')
      : null,
    uniqueAssumptions.length > 0
      ? ['ARCHITECT ASSUMPTIONS', ...uniqueAssumptions.map(serializeFragmentSection)].join('\n\n')
      : null,
  ].filter((section): section is string => Boolean(section));

  const finalInstruction = sections.join('\n\n');
  if (finalInstruction.length > FINAL_DISPATCH_SOFT_LIMIT) {
    const dispatchHardening = hardenInstruction(finalInstruction);
    const result = {
      ok: false,
      finalInstruction,
      dispatchHardening,
      metaFragments: allowedMetaFragments,
      selectedAssumptions: uniqueAssumptions,
      omittedMetaFragments,
      findings,
      warnings,
      blockReason: `Final dispatch instruction exceeds the Phase-1 soft limit of ${FINAL_DISPATCH_SOFT_LIMIT} characters.`,
    } satisfies ArchitectAssemblyResult;
    updateObservation(result);
    return result;
  }

  const dispatchHardening = hardenInstruction(finalInstruction);
  const result = {
    ok: dispatchHardening.ok,
    finalInstruction,
    dispatchHardening,
    metaFragments: allowedMetaFragments,
    selectedAssumptions: uniqueAssumptions,
    omittedMetaFragments,
    findings,
    warnings,
    blockReason: dispatchHardening.ok
      ? undefined
      : `Dispatch hardening blocked the final instruction with ${dispatchHardening.stats.blockCount} finding(s).`,
  } satisfies ArchitectAssemblyResult;

  updateObservation(result);
  return result;
}
