import path from 'node:path';

const GLOBAL_BLACKLIST = [
  'server/src/routes/builder.ts',
  'server/src/lib/builderEngine.ts',
  'server/src/lib/builderGates.ts',
  'server/src/lib/builderFileIO.ts',
  'server/src/lib/builderExecutor.ts',
  'server/src/db.ts',
  '.env',
  '.env.example',
  'package.json',
  'server/package.json',
  'node_modules/',
];

const DESTRUCTIVE_PATTERNS = [
  /rm\s+-rf/i,
  /DROP\s+TABLE/i,
  /DELETE\s+FROM/i,
  /TRUNCATE/i,
  /git\s+push/i,
  /git\s+.*force/i,
  /npm\s+publish/i,
];

function normalizePath(filePath: string) {
  return filePath.replace(/\\/g, '/').replace(/^\/+/, '');
}

function matchesRule(filePath: string, rule: string) {
  const normalizedPath = normalizePath(filePath);
  const normalizedRule = normalizePath(rule);

  return (
    normalizedPath === normalizedRule ||
    normalizedPath.startsWith(`${normalizedRule}/`) ||
    normalizedPath.endsWith(`/${normalizedRule}`) ||
    normalizedRule.endsWith('/') && normalizedPath.startsWith(normalizedRule)
  );
}

export function checkScope(filePath: string, taskScope: string[], policyForbidden: string[]) {
  const normalizedPath = normalizePath(filePath);

  if (!normalizedPath || normalizedPath.startsWith('../') || path.isAbsolute(normalizedPath)) {
    return { allowed: false, reason: 'Path escapes allowed root' };
  }

  if (GLOBAL_BLACKLIST.some((entry) => matchesRule(normalizedPath, entry))) {
    return { allowed: false, reason: 'Path is globally blocked' };
  }

  if (policyForbidden.some((entry) => matchesRule(normalizedPath, entry))) {
    return { allowed: false, reason: 'Path is blocked by policy profile' };
  }

  if (taskScope.length > 0 && !taskScope.some((entry) => matchesRule(normalizedPath, entry))) {
    return { allowed: false, reason: 'Path is outside task scope' };
  }

  return { allowed: true };
}

export function checkDestructive(command: string) {
  for (const pattern of DESTRUCTIVE_PATTERNS) {
    const match = command.match(pattern);
    if (match) {
      return { safe: false, match: match[0] };
    }
  }

  return { safe: true };
}

export function checkTokenBudget(used: number, budget: number) {
  const remaining = budget - used;
  return {
    ok: remaining >= 0,
    remaining,
  };
}