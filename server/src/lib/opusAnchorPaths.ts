const EXPLICIT_PATH_RE = /(?:server|client)\/src\/[\w/.-]+\.tsx?/gi;

export function extractExplicitPaths(instruction: string): string[] {
  return [...new Set(instruction.match(EXPLICIT_PATH_RE) ?? [])];
}
