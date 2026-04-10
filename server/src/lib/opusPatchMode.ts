export type PatchEdit = { search: string; replace: string };

export function applyPatches(source: string, patches: PatchEdit[]): string {
  let result = source;
  for (const p of patches) {
    if (!result.includes(p.search)) throw new Error("Not found: " + p.search.slice(0,40));
    result = result.replace(p.search, p.replace);
  }
  return result;
}
