export function parseJsonColumn<T>(raw: unknown, label: string): T {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as T;
    } catch (error: unknown) {
      console.error('[JSON_PARSE_FAIL]', label, error);
    }
  }
  return {} as T;
}

export function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}
