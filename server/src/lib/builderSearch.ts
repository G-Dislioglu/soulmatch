import { callProvider } from './providers.js';

export interface SearchResult {
  query: string;
  summary: string;
  error?: string;
}

export async function webSearch(query: string): Promise<SearchResult> {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { query, summary: '', error: 'GEMINI_API_KEY not set' };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `Search the web and provide a concise technical summary for: ${query}` }],
          },
        ],
        tools: [{ google_search: {} }],
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return { query, summary: '', error: `Gemini search ${response.status}: ${errText.slice(0, 200)}` };
    }

    const data = await response.json() as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>;
        };
        groundingMetadata?: {
          searchEntryPoint?: { renderedContent?: string };
          groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
        };
      }>;
    };

    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join('') ?? '';
    const sources = data.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk) => chunk.web?.uri)
      .filter(Boolean)
      .slice(0, 3) ?? [];

    const summary = sources.length > 0
      ? `${text}\n\nQuellen: ${sources.join(', ')}`
      : text;

    return { query, summary: summary || 'Keine Ergebnisse gefunden.' };
  } catch (err) {
    return {
      query,
      summary: '',
      error: `Search failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}