/**
 * Opus Decomposer Pipeline v1.0
 *
 * Algorithmische Task-Zerlegung für den Worker-Swarm.
 * 7 Stufen, davon 5 sind $0 (kein LLM nötig).
 *
 * Pipeline:
 *   ① graphScan      — Graph-Kanten lesen, Abhängigkeiten finden ($0)
 *   ② fileAnalysis   — Dateien in semantische Blöcke schneiden ($0)
 *   ③ cutPlan        — Schnittplan mit Ankern + Kontext ($0)
 *   ④ workerMatch    — Bester Worker pro Block aus DB-Scores ($0)
 *   ⑤ [swarmExecute] — Worker-Swarm (extern, kostet $$$)
 *   ⑥ smartMerge     — Anker-basiert zusammensetzen ($0)
 *   ⑦ [meister]      — Validierung (extern, kostet $$$)
 */

import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '../db.js';
import { builderWorkerScores } from '../schema/builder.js';
import { desc, sql } from 'drizzle-orm';

// ============================================================
// TYPES
// ============================================================

export interface DecomposerInput {
  taskGoal: string;
  scope: string[];       // File paths from task
  risk: 'low' | 'medium' | 'high';
}

export interface GraphContext {
  nodes: GraphNode[];
  edges: GraphEdge[];
  entryOrder: string[];         // Topologically sorted file paths
  reuseCandidates: string[];    // Files that could be reused
  forbiddenZones: string[];     // do_not_rebuild files
  seams: string[];              // Fragile junctions
}

interface GraphNode {
  id: string;
  kind: string;
  name: string;
  path?: string;
  status: string;
  canonicality: string;
  roles: string[];
  do_not_rebuild?: boolean;
}

interface GraphEdge {
  from: string;
  to: string;
  type: string;
  strength?: number;
}

export interface FileBlock {
  id: string;           // e.g. "opusBridge.ts#imports"
  file: string;
  blockType: 'imports' | 'types' | 'constants' | 'function' | 'route' | 'class' | 'export' | 'other';
  name: string;         // Function/route/type name or block description
  startLine: number;
  endLine: number;
  lineCount: number;
  content: string;
  anchorBefore: string; // Last line of previous block (for reassembly)
  anchorAfter: string;  // First line of next block (for reassembly)
  dependencies: string[]; // Other block IDs this depends on (imports, types)
}

export interface CutUnit {
  id: string;
  file: string;
  blocks: FileBlock[];
  context: string;       // Types + imports that this unit needs
  anchorBefore: string;
  anchorAfter: string;
  totalLines: number;
  complexity: 'trivial' | 'simple' | 'medium' | 'complex';
  dependsOn?: string;   // Another CutUnit ID
}

export interface WorkerAssignment {
  file: string;
  writer: string;
  reason: string;
  dependsOn?: string;
  cutUnit: CutUnit;
}

export interface MergedFile {
  file: string;
  content: string;
  blockOrder: string[];  // Block IDs in order
  conflicts: string[];   // Any merge issues
}

// ============================================================
// STAGE 1: GRAPH SCAN ($0)
// ============================================================

const ARCH_DIR = path.resolve(process.cwd(), 'architecture');
const TRUNK_DIR = path.join(ARCH_DIR, 'trunks');

export function graphScan(scope: string[]): GraphContext {
  const allNodes: GraphNode[] = [];
  const allEdges: GraphEdge[] = [];

  // Load all trunks
  try {
    const trunkFiles = fs.readdirSync(TRUNK_DIR).filter((f) => f.endsWith('.json'));
    for (const file of trunkFiles) {
      const trunk = JSON.parse(fs.readFileSync(path.join(TRUNK_DIR, file), 'utf-8'));
      const nodes = trunk.nodes ?? [];
      allNodes.push(...nodes);
    }
  } catch {
    // No graph available — return empty context
  }

  // Load edges
  try {
    const edgesData = JSON.parse(fs.readFileSync(path.join(ARCH_DIR, 'edges.json'), 'utf-8'));
    const edges = edgesData.edges ?? edgesData;
    if (Array.isArray(edges)) {
      allEdges.push(...edges);
    }
  } catch {
    // No edges
  }

  // Find nodes matching scope
  const scopeNodeIds = new Set<string>();
  for (const scopePath of scope) {
    for (const node of allNodes) {
      if (node.path && scopePath.includes(node.path)) {
        scopeNodeIds.add(node.id);
      }
      if (node.path && node.path.includes(scopePath)) {
        scopeNodeIds.add(node.id);
      }
    }
  }

  // Traverse edges to find related nodes (1 hop)
  const relatedNodeIds = new Set(scopeNodeIds);
  for (const edge of allEdges) {
    if (scopeNodeIds.has(edge.from)) relatedNodeIds.add(edge.to);
    if (scopeNodeIds.has(edge.to)) relatedNodeIds.add(edge.from);
  }

  // Build subgraph
  const relevantNodes = allNodes.filter((n) => relatedNodeIds.has(n.id));
  const relevantEdges = allEdges.filter(
    (e) => relatedNodeIds.has(e.from) || relatedNodeIds.has(e.to),
  );

  // Topological sort for entry order
  const entryOrder = topoSort(scope, relevantEdges, allNodes);

  // Extract special zones
  const reuseCandidates = relevantEdges
    .filter((e) => e.type === 'reuse_candidate')
    .map((e) => allNodes.find((n) => n.id === e.to)?.path ?? '')
    .filter(Boolean);

  const forbiddenZones = relevantNodes
    .filter((n) => n.do_not_rebuild || n.canonicality === 'forbidden')
    .map((n) => n.path ?? '')
    .filter(Boolean);

  const seams = relevantNodes
    .filter((n) => n.roles?.includes('seam'))
    .map((n) => n.path ?? '')
    .filter(Boolean);

  return {
    nodes: relevantNodes,
    edges: relevantEdges,
    entryOrder,
    reuseCandidates,
    forbiddenZones,
    seams,
  };
}

function topoSort(scope: string[], edges: GraphEdge[], nodes: GraphNode[]): string[] {
  // Simple: order scope files by dependency depth
  const pathToId = new Map<string, string>();
  for (const n of nodes) {
    if (n.path) pathToId.set(n.path, n.id);
  }

  const depCount = new Map<string, number>();
  for (const s of scope) depCount.set(s, 0);

  for (const edge of edges) {
    if (edge.type === 'depends_on' || edge.type === 'uses') {
      const fromPath = nodes.find((n) => n.id === edge.from)?.path;
      const toPath = nodes.find((n) => n.id === edge.to)?.path;
      if (fromPath && toPath && scope.includes(fromPath)) {
        depCount.set(fromPath, (depCount.get(fromPath) ?? 0) + 1);
      }
    }
  }

  return [...scope].sort((a, b) => (depCount.get(a) ?? 0) - (depCount.get(b) ?? 0));
}

// ============================================================
// STAGE 2: FILE ANALYSIS ($0)
// ============================================================

const BLOCK_PATTERNS = {
  import: /^import\s/,
  typeOrInterface: /^(?:export\s+)?(?:type|interface)\s+\w+/,
  constOrLet: /^(?:export\s+)?(?:const|let|var)\s+[A-Z_][A-Z_0-9]*\s*[=:]/,
  functionDecl: /^(?:export\s+)?(?:async\s+)?function\s+\w+/,
  arrowFunction: /^(?:export\s+)?(?:const|let)\s+\w+\s*=\s*(?:async\s*)?\(/,
  routeHandler: /^\w+Router\.\w+\(/,
  classDecl: /^(?:export\s+)?class\s+\w+/,
  exportBlock: /^export\s+(?:default\s+)?{/,
};

export function fileAnalysis(filePath: string): FileBlock[] {
  const resolvedPath = resolveFilePath(filePath);
  if (!resolvedPath) return [];

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  const lines = content.split('\n');
  const blocks: FileBlock[] = [];
  let currentBlock: Partial<FileBlock> | null = null;

  function finalizeBlock(endLine: number) {
    if (!currentBlock || currentBlock.startLine === undefined) return;
    const blockLines = lines.slice(currentBlock.startLine, endLine + 1);
    blocks.push({
      id: `${path.basename(filePath)}#${currentBlock.name ?? `block-${blocks.length}`}`,
      file: filePath,
      blockType: currentBlock.blockType ?? 'other',
      name: currentBlock.name ?? `block-${blocks.length}`,
      startLine: currentBlock.startLine,
      endLine,
      lineCount: endLine - currentBlock.startLine + 1,
      content: blockLines.join('\n'),
      anchorBefore: currentBlock.startLine > 0 ? lines[currentBlock.startLine - 1] : '',
      anchorAfter: endLine + 1 < lines.length ? lines[endLine + 1] : '',
      dependencies: currentBlock.dependencies ?? [],
    });
  }

  // Pass 1: Find import block (always first)
  let importEnd = 0;
  for (let i = 0; i < lines.length; i++) {
    if (BLOCK_PATTERNS.import.test(lines[i].trim())) {
      importEnd = i;
      // Handle multi-line imports
      if (lines[i].includes('{') && !lines[i].includes('}')) {
        while (i < lines.length && !lines[i].includes('}')) i++;
        importEnd = i;
      }
    } else if (lines[i].trim() && !lines[i].trim().startsWith('//') && importEnd > 0) {
      break;
    }
  }

  if (importEnd > 0) {
    currentBlock = {
      blockType: 'imports',
      name: 'imports',
      startLine: 0,
      dependencies: [],
    };
    finalizeBlock(importEnd);
  }

  // Pass 2: Find semantic blocks after imports
  let braceDepth = 0;
  let inBlock = false;

  for (let i = importEnd + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      if (!inBlock) continue;
    }

    if (!inBlock) {
      const blockType = detectBlockType(trimmed);
      if (blockType) {
        if (currentBlock) finalizeBlock(i - 1);
        const name = extractBlockName(trimmed, blockType);
        currentBlock = {
          blockType,
          name,
          startLine: i,
          dependencies: [],
        };
        inBlock = true;
        braceDepth = 0;
      }
    }

    if (inBlock) {
      for (const ch of trimmed) {
        if (ch === '{' || ch === '(') braceDepth++;
        if (ch === '}' || ch === ')') braceDepth--;
      }

      // Block ends when braces are balanced at end of line
      if (braceDepth <= 0 && trimmed.endsWith(';') || trimmed === '}' || trimmed === '});' || trimmed === '})') {
        finalizeBlock(i);
        currentBlock = null;
        inBlock = false;
      }
    }
  }

  // Finalize last open block
  if (currentBlock && currentBlock.startLine !== undefined) {
    finalizeBlock(lines.length - 1);
  }

  return blocks;
}

function detectBlockType(line: string): FileBlock['blockType'] | null {
  if (BLOCK_PATTERNS.typeOrInterface.test(line)) return 'types';
  if (BLOCK_PATTERNS.constOrLet.test(line)) return 'constants';
  if (BLOCK_PATTERNS.routeHandler.test(line)) return 'route';
  if (BLOCK_PATTERNS.functionDecl.test(line)) return 'function';
  if (BLOCK_PATTERNS.arrowFunction.test(line)) return 'function';
  if (BLOCK_PATTERNS.classDecl.test(line)) return 'class';
  if (BLOCK_PATTERNS.exportBlock.test(line)) return 'export';
  return null;
}

function extractBlockName(line: string, blockType: string): string {
  if (blockType === 'route') {
    const match = line.match(/\w+Router\.\w+\(['"]([^'"]+)['"]/);
    return match ? `route:${match[1]}` : 'route:unknown';
  }
  const match = line.match(/(?:function|const|let|var|class|type|interface)\s+(\w+)/);
  return match ? match[1] : `${blockType}-${Date.now().toString(36)}`;
}

function resolveFilePath(filePath: string): string | null {
  const candidates = [
    path.resolve(process.cwd(), filePath),
    path.resolve(process.cwd(), '..', filePath),
  ];
  for (const c of candidates) {
    try { fs.accessSync(c); return c; } catch { /* skip */ }
  }
  return null;
}

// ============================================================
// STAGE 3: CUT PLAN ($0)
// ============================================================

const SMALL_FILE_THRESHOLD = 100;
const MAX_UNIT_LINES = 120;

export function cutPlan(
  scope: string[],
  graphContext: GraphContext,
  fileBlocks: Map<string, FileBlock[]>,
): CutUnit[] {
  const units: CutUnit[] = [];

  for (const filePath of graphContext.entryOrder.length > 0 ? graphContext.entryOrder : scope) {
    const blocks = fileBlocks.get(filePath) ?? [];
    const totalLines = blocks.reduce((sum, b) => sum + b.lineCount, 0);

    // Small files: single unit, no split
    if (totalLines <= SMALL_FILE_THRESHOLD || blocks.length <= 2) {
      units.push({
        id: `unit-${path.basename(filePath)}`,
        file: filePath,
        blocks,
        context: blocks.find((b) => b.blockType === 'imports')?.content ?? '',
        anchorBefore: '',
        anchorAfter: '',
        totalLines,
        complexity: totalLines < 50 ? 'trivial' : 'simple',
      });
      continue;
    }

    // Large files: group blocks into units of ~MAX_UNIT_LINES
    // Always keep imports + types as shared context (not a work unit)
    const contextBlocks = blocks.filter(
      (b) => b.blockType === 'imports' || b.blockType === 'types',
    );
    const workBlocks = blocks.filter(
      (b) => b.blockType !== 'imports' && b.blockType !== 'types',
    );
    const sharedContext = contextBlocks.map((b) => b.content).join('\n\n');

    let currentGroup: FileBlock[] = [];
    let currentLines = 0;
    let unitIndex = 0;

    for (const block of workBlocks) {
      // If adding this block would exceed limit, finalize current group
      if (currentLines + block.lineCount > MAX_UNIT_LINES && currentGroup.length > 0) {
        units.push(buildCutUnit(filePath, unitIndex, currentGroup, sharedContext, graphContext));
        unitIndex++;
        currentGroup = [];
        currentLines = 0;
      }

      currentGroup.push(block);
      currentLines += block.lineCount;

      // Single block exceeds limit — it's its own unit
      if (block.lineCount > MAX_UNIT_LINES) {
        units.push(buildCutUnit(filePath, unitIndex, currentGroup, sharedContext, graphContext));
        unitIndex++;
        currentGroup = [];
        currentLines = 0;
      }
    }

    // Remaining blocks
    if (currentGroup.length > 0) {
      units.push(buildCutUnit(filePath, unitIndex, currentGroup, sharedContext, graphContext));
    }
  }

  // Set dependsOn based on graph edges and unit order within same file
  for (let i = 1; i < units.length; i++) {
    const prev = units[i - 1];
    if (prev.file === units[i].file) {
      units[i].dependsOn = prev.id;
    }
  }

  return units;
}

function buildCutUnit(
  filePath: string,
  index: number,
  blocks: FileBlock[],
  sharedContext: string,
  graphContext: GraphContext,
): CutUnit {
  const totalLines = blocks.reduce((sum, b) => sum + b.lineCount, 0);
  const isSeam = graphContext.seams.some((s) => filePath.includes(s));

  return {
    id: `unit-${path.basename(filePath)}-${index}`,
    file: filePath,
    blocks,
    context: sharedContext,
    anchorBefore: blocks[0]?.anchorBefore ?? '',
    anchorAfter: blocks[blocks.length - 1]?.anchorAfter ?? '',
    totalLines,
    complexity: isSeam ? 'complex'
      : totalLines > 80 ? 'medium'
      : totalLines > 30 ? 'simple'
      : 'trivial',
  };
}

// ============================================================
// STAGE 4: WORKER MATCH ($0)
// ============================================================

const DEFAULT_COMPLEXITY_MAP: Record<string, string[]> = {
  trivial: ['deepseek', 'qwen', 'kimi', 'minimax'],
  simple: ['deepseek', 'minimax', 'kimi', 'sonnet'],
  medium: ['minimax', 'sonnet', 'deepseek', 'gpt'],
  complex: ['minimax', 'sonnet', 'opus'],
};

const MIN_TASKS_FOR_CONFIDENCE = 3;
const RECENT_TASK_LIMIT = 20;

export async function workerMatch(units: CutUnit[]): Promise<WorkerAssignment[]> {
  const workerScores = await loadWorkerScores();
  const liveMap = buildLiveComplexityMap(workerScores);

  return units.map((unit) => {
    const preferredWorkers = liveMap[unit.complexity] ?? DEFAULT_COMPLEXITY_MAP[unit.complexity] ?? ['minimax'];
    const writer = pickBestWorker(preferredWorkers, workerScores);

    return {
      file: unit.file,
      writer,
      reason: `[${unit.complexity}] ${unit.blocks.map((b) => b.name).join(', ')}`,
      dependsOn: unit.dependsOn ? units.find((u) => u.id === unit.dependsOn)?.file : undefined,
      cutUnit: unit,
    };
  });
}

/** Generate complexity map from live DB scores — removes bad workers automatically */
function buildLiveComplexityMap(scores: Map<string, WorkerScore>): Record<string, string[]> {
  if (scores.size < 3) return DEFAULT_COMPLEXITY_MAP; // Not enough data

  const reliable = [...scores.values()]
    .filter((w) => w.taskCount >= MIN_TASKS_FOR_CONFIDENCE && w.effectiveScore >= 45)
    .sort((a, b) => b.effectiveScore - a.effectiveScore);

  const budget = [...scores.values()]
    .filter((w) => w.taskCount >= 2 && w.effectiveScore >= 35)
    .sort((a, b) => b.effectiveScore - a.effectiveScore);

  if (reliable.length < 2) return DEFAULT_COMPLEXITY_MAP;

  return {
    trivial: budget.slice(0, 4).map((w) => w.worker),
    simple: budget.slice(0, 4).map((w) => w.worker),
    medium: reliable.slice(0, 4).map((w) => w.worker),
    complex: [...reliable.slice(0, 2).map((w) => w.worker), 'opus'],
  };
}

export interface WorkerScore {
  worker: string;
  avgScore: number;
  recentAvg: number;
  taskCount: number;
  confidence: number;   // 0-1, based on task count
  effectiveScore: number; // confidence-weighted score
}

async function loadWorkerScores(): Promise<Map<string, WorkerScore>> {
  const scores = new Map<string, WorkerScore>();
  try {
    const db = getDb();

    // Load all scores, ordered by recency
    const allScores = await db
      .select({
        worker: builderWorkerScores.worker,
        quality: builderWorkerScores.quality,
        createdAt: builderWorkerScores.createdAt,
      })
      .from(builderWorkerScores)
      .orderBy(desc(builderWorkerScores.createdAt));

    // Group by worker
    const grouped = new Map<string, number[]>();
    for (const row of allScores) {
      const list = grouped.get(row.worker) ?? [];
      list.push(row.quality);
      grouped.set(row.worker, list);
    }

    // Calculate scores per worker
    for (const [worker, qualities] of grouped) {
      const taskCount = qualities.length;
      const avgScore = Math.round(qualities.reduce((a, b) => a + b, 0) / taskCount * 10) / 10;
      const recentQualities = qualities.slice(0, RECENT_TASK_LIMIT);
      const recentAvg = Math.round(recentQualities.reduce((a, b) => a + b, 0) / recentQualities.length * 10) / 10;
      const confidence = Math.min(1, taskCount / (MIN_TASKS_FOR_CONFIDENCE * 2));

      const blended = taskCount >= MIN_TASKS_FOR_CONFIDENCE
        ? recentAvg * 0.7 + avgScore * 0.3
        : 50;
      const effectiveScore = Math.round((blended * confidence + 50 * (1 - confidence)) * 10) / 10;

      scores.set(worker, { worker, avgScore, recentAvg, taskCount, confidence, effectiveScore });
    }
  } catch {
    // DB not available
  }
  return scores;
}

function pickBestWorker(preferred: string[], scores: Map<string, WorkerScore>): string {
  if (scores.size === 0) return preferred[0] ?? 'minimax';

  let bestWorker = preferred[0] ?? 'minimax';
  let bestScore = -1;

  for (const w of preferred) {
    const score = scores.get(w)?.effectiveScore ?? 50;
    if (score > bestScore) {
      bestScore = score;
      bestWorker = w;
    }
  }

  return bestWorker;
}

// ============================================================
// STAGE 6: SMART MERGE ($0)
// ============================================================

export function smartMerge(
  originalFile: string,
  originalContent: string,
  workerOutputs: Array<{ cutUnitId: string; content: string }>,
  fileBlocks: FileBlock[],
): MergedFile {
  const conflicts: string[] = [];

  // If only one worker output for this file, use it directly
  if (workerOutputs.length === 1) {
    return {
      file: originalFile,
      content: workerOutputs[0].content,
      blockOrder: [workerOutputs[0].cutUnitId],
      conflicts: [],
    };
  }

  // Multi-block merge: reassemble from anchors
  const lines = originalContent.split('\n');

  // Find imports block (always from original, dedup later)
  const importBlock = fileBlocks.find((b) => b.blockType === 'imports');
  const typesBlocks = fileBlocks.filter((b) => b.blockType === 'types');

  const parts: string[] = [];

  // 1. Imports: merge original + any new imports from workers
  const allImports = new Set<string>();
  if (importBlock) {
    for (const line of importBlock.content.split('\n')) {
      allImports.add(line);
    }
  }
  for (const output of workerOutputs) {
    const outputLines = output.content.split('\n');
    for (const line of outputLines) {
      if (/^import\s/.test(line.trim())) {
        allImports.add(line);
      }
    }
  }
  parts.push([...allImports].join('\n'));

  // 2. Types: keep originals
  for (const typeBlock of typesBlocks) {
    parts.push(typeBlock.content);
  }

  // 3. Worker outputs in order, without their imports
  const blockOrder: string[] = [];
  for (const output of workerOutputs) {
    const outputLines = output.content.split('\n')
      .filter((line) => !(/^import\s/.test(line.trim())));
    // Also skip type blocks that are already in context
    const cleanedOutput = outputLines.join('\n').trim();
    if (cleanedOutput) {
      parts.push(cleanedOutput);
      blockOrder.push(output.cutUnitId);
    }
  }

  // 4. Validate: check bracket balance
  const merged = parts.join('\n\n');
  const openBraces = (merged.match(/{/g) ?? []).length;
  const closeBraces = (merged.match(/}/g) ?? []).length;
  if (openBraces !== closeBraces) {
    conflicts.push(`Bracket mismatch: ${openBraces} open, ${closeBraces} close`);
  }

  return {
    file: originalFile,
    content: merged,
    blockOrder,
    conflicts,
  };
}

// ============================================================
// FULL PIPELINE (stages 1-4 + 6)
// ============================================================

export interface DecompositionResult {
  graphContext: GraphContext;
  fileBlocks: Map<string, FileBlock[]>;
  cutUnits: CutUnit[];
  assignments: WorkerAssignment[];
  stats: {
    filesAnalyzed: number;
    totalBlocks: number;
    totalUnits: number;
    estimatedWorkerCalls: number;
  };
}

export async function decompose(input: DecomposerInput): Promise<DecompositionResult> {
  // Stage 1: Graph Scan
  const graphContext = graphScan(input.scope);

  // Stage 2: File Analysis
  const fileBlocks = new Map<string, FileBlock[]>();
  for (const filePath of input.scope) {
    const blocks = fileAnalysis(filePath);
    if (blocks.length > 0) {
      fileBlocks.set(filePath, blocks);
    }
  }

  // Stage 3: Cut Plan
  const cutUnits = cutPlan(input.scope, graphContext, fileBlocks);

  // Stage 4: Worker Match
  const assignments = await workerMatch(cutUnits);

  return {
    graphContext,
    fileBlocks,
    cutUnits,
    assignments,
    stats: {
      filesAnalyzed: fileBlocks.size,
      totalBlocks: [...fileBlocks.values()].reduce((sum, b) => sum + b.length, 0),
      totalUnits: cutUnits.length,
      estimatedWorkerCalls: assignments.length,
    },
  };
}
