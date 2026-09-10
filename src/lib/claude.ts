import Anthropic from '@anthropic-ai/sdk';
import { fetch as expoFetch } from 'expo/fetch';
import type { Settings } from './settings';
import { streamChat, type ChatMessage } from './ollama';

const MODEL = 'claude-sonnet-5';

const ASK_OLLAMA_TOOL: Anthropic.Tool = {
  name: 'ask_ollama',
  description:
    "Ask the user's self-hosted Ollama model for the answer to a question. Always call this to resolve the user's question before responding — never answer from your own knowledge instead.",
  input_schema: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: "The user's question, verbatim or lightly cleaned up for clarity.",
      },
    },
    required: ['question'],
  },
};

const SYSTEM_PROMPT =
  "You are a thin routing layer in front of a self-hosted Ollama model. For every user question, call the ask_ollama tool to get its answer, then present that answer to the user. You may lightly polish formatting or clarity, but do not add facts Ollama did not provide and do not substitute your own knowledge for Ollama's answer.";

export async function chatViaClaude(
  settings: Settings,
  messages: ChatMessage[],
  onToken: (delta: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const apiKey = settings.anthropicApiKey.trim();
  if (!apiKey) {
    throw new Error('Missing Anthropic API key. Set it in Profile.');
  }

  const client = new Anthropic({ apiKey, fetch: expoFetch as unknown as typeof fetch });

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  const routingResponse = await client.messages.create(
    {
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [ASK_OLLAMA_TOOL],
      tool_choice: { type: 'tool', name: 'ask_ollama' },
      messages: anthropicMessages,
    },
    { signal }
  );

  const toolUse = routingResponse.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
  );

  if (!toolUse) {
    const text = routingResponse.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    const fallback = text?.text ?? '';
    if (fallback) onToken(fallback);
    return fallback;
  }

  const { question } = toolUse.input as { question: string };
  const ollamaAnswer = await streamChat(settings, [{ role: 'user', content: question }], () => {}, signal);

  const finalMessages: Anthropic.MessageParam[] = [
    ...anthropicMessages,
    { role: 'assistant', content: routingResponse.content },
    {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: ollamaAnswer || '(Ollama returned an empty response)',
        },
      ],
    },
  ];

  const stream = client.messages.stream(
    {
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [ASK_OLLAMA_TOOL],
      messages: finalMessages,
    },
    { signal }
  );

  stream.on('text', (delta) => onToken(delta));

  const finalMessage = await stream.finalMessage();
  const finalText = finalMessage.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  return finalText?.text ?? '';
}
