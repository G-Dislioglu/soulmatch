import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb } from '../db.js';
import { builderErrorCards } from '../schema/opusBridge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');

interface GraphTrunkMeta {
  entry_nodes?: string[];
}

interface GraphTrunkNode {
  id: string;
  name?: string;
  path?: string;
  status?: string;
  canonicality?: string;
  roles?: string[];
  hotspot?: boolean;
  do_not_rebuild?: boolean;
  ai_note?: string;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type?: string;
  reason?: string;
  recommended_action?: string;
}

interface GraphTrunkFile {
  trunk?: GraphTrunkMeta;
  nodes?: GraphTrunkNode[];
}

interface GraphEdgesFile {
  edges?: GraphEdge[];
}

export interface ArchitectureGraph {
  trunk: GraphTrunkMeta;
  nodes: GraphTrunkNode[];
  edges: GraphEdge[];
}

type ErrorCard = typeof builderErrorCards.$inferSelect;

function readJsonFile<T>(relativePath: string, fallback: T): T {
  const filePath = path.resolve(REPO_ROOT, relativePath);

  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return fallback;
  }
}

function normalizePath(value: string | undefined): string {
  return (value ?? '').replace(/\\/g, '/').toLowerCase();
}

function hasScopeMatch(nodePath: string | undefined, taskScope: string[]): boolean {
  if (taskScope.length === 0) {
    return true;
  }

  const normalizedNodePath = normalizePath(nodePath);
  return taskScope.some((scope) => {
    const normalizedScope = normalizePath(scope);
    return normalizedNodePath.includes(normalizedScope) || normalizedScope.includes(normalizedNodePath);
  });
}

function formatNodeLine(node: GraphTrunkNode): string {
  const pathPart = node.path ? ` → ${node.path}` : '';
  const statusPart = node.status ? ` (${node.status})` : '';
  return `  • ${node.name ?? node.id}${statusPart}${pathPart}`;
}

export function loadArchitectureGraph(): ArchitectureGraph {
  const trunkFile = readJsonFile<GraphTrunkFile>('architecture/trunks/soulmatch.json', {});
  const edgesFile = readJsonFile<GraphEdgesFile>('architecture/edges.json', {});

  return {
    trunk: trunkFile.trunk ?? {},
    nodes: trunkFile.nodes ?? [],
    edges: edgesFile.edges ?? [],
  };
}

export function generateGraphBriefing(graph: ArchitectureGraph, taskScope: string[] = []): string {
  const relevantNodes = graph.nodes.filter((node) => hasScopeMatch(node.path, taskScope));
  const relevantNodeIds = new Set(relevantNodes.map((node) => node.id));
  const activeNodes = relevantNodes.length > 0 ? relevantNodes : graph.nodes;

  const entryPointIds = graph.trunk.entry_nodes ?? [];
  const entryPoints = entryPointIds
    .map((entryId) => graph.nodes.find((node) => node.id === entryId))
    .filter((node): node is GraphTrunkNode => Boolean(node))
    .filter((node) => activeNodes.includes(node) || taskScope.length === 0);

  const hotspots = activeNodes.filter((node) => node.hotspot || node.roles?.includes('hotspot'));
  const forbidden = activeNodes.filter(
    (node) => node.canonicality === 'forbidden' || node.do_not_rebuild === true,
  );

  const reuseCandidates = graph.edges.filter((edge) => {
    if (edge.type !== 'reuse_candidate') {
      return false;
    }

    if (taskScope.length === 0) {
      return true;
    }

    return relevantNodeIds.has(edge.from) || relevantNodeIds.has(edge.to);
  });

  const lines: string[] = ['[graph-scout] Architecture Graph Briefing:', ''];

  lines.push('ENTRY POINTS:');
  if (entryPoints.length === 0) {
    lines.push('  • Keine Entry-Points gefunden.');
  } else {
    lines.push(...entryPoints.map(formatNodeLine));
  }
  lines.push('');

  lines.push('HOTSPOTS:');
  if (hotspots.length === 0) {
    lines.push('  • Keine Hotspots im gefilterten Scope.');
  } else {
    lines.push(...hotspots.map(formatNodeLine));
  }
  lines.push('');

  lines.push('REUSE-KANDIDATEN:');
  if (reuseCandidates.length === 0) {
    lines.push('  • Keine Reuse-Kandidaten gefunden.');
  } else {
    for (const edge of reuseCandidates) {
      lines.push(`  • ${edge.from} → ${edge.to}${edge.recommended_action ? ` (${edge.recommended_action})` : ''}`);
      if (edge.reason) {
        lines.push(`    Grund: ${edge.reason}`);
      }
    }
  }
  lines.push('');

  lines.push('VERBOTEN:');
  if (forbidden.length === 0) {
    lines.push('  • Keine verbotenen Nodes im gefilterten Scope.');
  } else {
    lines.push(...forbidden.map(formatNodeLine));
  }
  lines.push('');

  lines.push('EMPFOHLENE REIHENFOLGE:');
  if (entryPoints.length === 0) {
    lines.push('  • Keine Entry-Reihenfolge verfügbar.');
  } else {
    lines.push(`  1. ${entryPoints.map((node) => node.id).join(' → ')}`);
  }

  return lines.join('\n');
}

function tokenizeInstruction(taskInstruction: string): string[] {
  return taskInstruction
    .toLowerCase()
    .split(/[^a-z0-9_/-]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

export async function findRelevantErrorCards(taskInstruction: string, scope: string[] = []): Promise<ErrorCard[]> {
  const db = getDb();
  const allCards = await db.select().from(builderErrorCards);
  const instructionTokens = new Set(tokenizeInstruction(taskInstruction));

  return allCards.filter((card) => {
    const affectedFiles = Array.isArray(card.affectedFiles) ? card.affectedFiles : [];
    const tags = Array.isArray(card.tags) ? card.tags : [];

    const scopeOverlap = scope.length > 0 && affectedFiles.some((file) =>
      scope.some((scopeEntry) => {
        const normalizedFile = normalizePath(String(file));
        const normalizedScope = normalizePath(scopeEntry);
        return normalizedFile.includes(normalizedScope) || normalizedScope.includes(normalizedFile);
      }),
    );

    const tagOverlap = tags.some((tag) => instructionTokens.has(String(tag).toLowerCase()));

    return scopeOverlap || tagOverlap;
  });
}

export function loadProjectDna(): string {
  const filePath = path.resolve(REPO_ROOT, 'docs/project-dna.md');

  if (!fs.existsSync(filePath)) {
    return '';
  }

  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}