import { fetch } from 'expo/fetch';
import type { Settings } from './settings';

export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export class OllamaError extends Error {}

/**
 * Streams a chat completion from Ollama's /api/chat endpoint.
 * Ollama sends newline-delimited JSON (NDJSON): one {message, done} object per line.
 * Calls onToken for every content delta and resolves with the full text once done.
 */
export async function streamChat(
  settings: Settings,
  messages: ChatMessage[],
  onToken: (delta: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const url = `${settings.baseUrl.replace(/\/+$/, '')}/api/chat`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (settings.authHeader.trim()) headers.Authorization = settings.authHeader.trim();

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: settings.model,
      messages,
      stream: true,
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => '');
    throw new OllamaError(`Ollama respondió ${response.status}: ${text || response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      full += consumeLine(trimmed, onToken);
    }
  }

  if (buffer.trim()) {
    full += consumeLine(buffer.trim(), onToken);
  }

  return full;
}

export async function testConnection(
  settings: Settings
): Promise<{ ok: true; models: string[] } | { ok: false; error: string }> {
  const url = `${settings.baseUrl.replace(/\/+$/, '')}/api/tags`;
  const headers: Record<string, string> = {};
  if (settings.authHeader.trim()) headers.Authorization = settings.authHeader.trim();

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }
    const json = await response.json();
    const models: string[] = (json.models ?? []).map((m: any) => m.name);
    return { ok: true, models };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'No se pudo conectar' };
  }
}

function consumeLine(line: string, onToken: (delta: string) => void): string {
  try {
    const json = JSON.parse(line);
    if (json.error) throw new OllamaError(json.error);
    const delta: string | undefined = json.message?.content;
    if (delta) {
      onToken(delta);
      return delta;
    }
    return '';
  } catch (err) {
    if (err instanceof OllamaError) throw err;
    return '';
  }
}
