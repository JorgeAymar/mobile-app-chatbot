# Orion Chat IA

A mobile chat app built with React Native (Expo), connected to a self-hosted [Ollama](https://ollama.com) server, with streaming (token-by-token) responses.

> Repo: `mobile-app-chatbot` · App: **Orion Chat IA**

## Stack

- **Expo SDK 57** + React Native 0.86 + TypeScript
- `expo/fetch` — fetch with `ReadableStream` support, used to consume Ollama's NDJSON stream
- `@react-native-async-storage/async-storage` — local persistence for settings, chat history, and language
- `react-native-safe-area-context` — safe area handling

## Structure

```
App.tsx                       # Entry point: SafeAreaProvider + LanguageProvider + tab navigation
src/
  screens/
    ChatScreen.tsx             # Chat UI: message list, input, streaming, autosave to history
    HistoryScreen.tsx          # List of saved conversations, tap to reopen, delete/clear
    ProfileScreen.tsx          # Remote LLM settings (URL/model/auth) + language switch + connection test
  lib/
    ollama.ts                  # Streaming client for /api/chat + testConnection() for /api/tags
    settings.ts                # Types + persistence for LLM connection settings and language
    history.ts                 # Types + persistence for saved conversations
    i18n.tsx                   # Lightweight translation dictionary (en/es) + LanguageProvider/useI18n
```

### Screens

- **Chat** — the main conversation view. Streams the assistant's reply token by token and autosaves the conversation to history after each exchange. "+ New" starts a fresh conversation.
- **History** — lists saved conversations (title, message count, last-updated time). Tap to reopen a conversation in Chat; swipe/long-press or tap ✕ to delete one; 🗑️ in the header clears everything.
- **Profile** — holds the **remote LLM configuration** (server URL, model, optional `Authorization` header) plus a **Test connection** button that hits `/api/tags` and lists the models the server reports. Also has the **language** switch (English/Español).

### Data flow

1. The user types a message in `ChatScreen` → it's appended to the local conversation.
2. `streamChat()` (`src/lib/ollama.ts`) does `POST {baseUrl}/api/chat` with `{ model, messages, stream: true }`.
3. Ollama responds with **NDJSON** (one line = one JSON object `{ message: { content }, done }`; "thinking" models also emit a `thinking` field for reasoning tokens, which is ignored).
4. The `body` is read as a `ReadableStream`, decoded chunk by chunk and parsed line by line; each `content` delta is appended live to the assistant's message via `onToken`.
5. When the stream ends (`done: true`), the conversation (all messages) is upserted into history (`src/lib/history.ts`) in AsyncStorage.

## Prerequisites

- Node.js + npm
- Xcode (iOS simulator) and/or Android Studio (Android emulator)
- An Ollama server reachable over HTTPS (see the VPS section below)
- [Expo Orbit](https://expo.dev/orbit) (optional, for quickly launching simulators/devices)

## Running the app

```bash
npm install
npm run ios       # opens the iOS simulator
npm run android    # opens the Android emulator
npm run web        # web build (limited, this app targets mobile)
```

This starts the Metro bundler on `http://localhost:8081`.

### Configuring the Ollama connection

The app **ships with no embedded credentials**. Open the **Profile** tab and fill in:

| Field | Example | Notes |
|---|---|---|
| Server URL | `https://ollama.labshub.cc` | Must be HTTPS in production; no trailing `/` |
| Model | `gpt-oss:20b-cloud` | Must exist on the server (`GET /api/tags` lists what's available) |
| Authorization (optional) | `Bearer <token>` | Only needed if your reverse proxy/server enforces auth |

Tap **Test connection** to verify the server responds before chatting. These values are saved **on-device only** (`AsyncStorage`), never in the code or in git.

### Verifying the server manually

```bash
curl -H "Authorization: Bearer <your-token>" https://ollama.labshub.cc/api/tags
```

Should return `200` with a JSON list of available models.

## Ollama server on the VPS

This project assumes Ollama is already running behind a reverse proxy (nginx/caddy) with:

- Its own domain + HTTPS certificate (Let's Encrypt or similar)
- Ollama's native port (`11434`) **not** exposed directly to the internet
- Optionally, an `Authorization` header validated at the proxy before forwarding to Ollama, since Ollama itself has no built-in authentication

In this setup, the server (`ollama.labshub.cc`) exposes `*-cloud` models, which Ollama forwards to `ollama.com` instead of running locally — i.e. inference actually happens in Ollama's cloud, not on the VPS hardware.

## Security

- **Never** commit tokens/API keys to the code — they only live in `AsyncStorage`, set from the Profile tab.
- If a token is ever exposed (pasted in a chat, a log, or a commit), rotate it on the server as soon as possible.
- The repo is public: check `git status`/`git diff` before every push to make sure no credential sneaks in.
- Consider restricting access to the Ollama endpoint (rate limiting, IP allowlist, or mandatory auth at the proxy) to prevent third parties from abusing your compute.

## Roadmap / possible improvements

- Model picker inside Chat, populated from `/api/tags`
- Markdown rendering for assistant responses
- More granular "typing…" indicator
- Additional languages beyond English/Spanish
