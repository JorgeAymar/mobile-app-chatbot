# mobile-app-chatbot

Chat móvil en React Native (Expo) conectado a un servidor [Ollama](https://ollama.com) propio, con respuestas en streaming (token por token).

## Stack

- **Expo SDK 57** + React Native 0.86 + TypeScript
- `expo/fetch` — fetch con soporte de `ReadableStream`, usado para consumir el streaming NDJSON de Ollama
- `@react-native-async-storage/async-storage` — persistencia local de la configuración (URL, modelo, header de auth)
- `react-native-safe-area-context` — manejo de safe areas

## Estructura

```
App.tsx                     # Entry point, envuelve SafeAreaProvider + ChatScreen
src/
  screens/
    ChatScreen.tsx           # UI de chat: lista de mensajes, input, modal de configuración
  lib/
    ollama.ts                # Cliente que hace streaming contra /api/chat de Ollama
    settings.ts               # Tipos + persistencia de configuración en AsyncStorage
```

### Flujo de datos

1. El usuario escribe un mensaje en `ChatScreen` → se agrega al historial local.
2. `streamChat()` (`src/lib/ollama.ts`) hace `POST {baseUrl}/api/chat` con `{ model, messages, stream: true }`.
3. Ollama responde con **NDJSON** (una línea = un JSON `{ message: { content }, done }`).
4. Se lee el `body` como `ReadableStream`, se decodifica por chunks y se parsea línea por línea; cada `content` delta se agrega en vivo al mensaje del asistente vía `onToken`.
5. Al terminar (`done: true` o fin del stream), se devuelve el texto completo.

## Requisitos previos

- Node.js + npm
- Xcode (simulador iOS) y/o Android Studio (emulador Android)
- Un servidor Ollama accesible por HTTPS (ver sección VPS más abajo)
- [Expo Orbit](https://expo.dev/orbit) (opcional, para lanzar simuladores/dispositivos fácilmente)

## Cómo correr la app

```bash
npm install
npm run ios       # abre el simulador de iOS
npm run android    # abre el emulador de Android
npm run web        # versión web (limitada, pensada para mobile)
```

Esto levanta el bundler de Metro en `http://localhost:8081`.

### Configurar la conexión a Ollama

La app **no trae credenciales embebidas**. Al abrir el chat, toca el ícono ⚙️ (arriba a la derecha) y completa:

| Campo | Ejemplo | Notas |
|---|---|---|
| URL del servidor | `https://ollama.labshub.cc` | Debe ser HTTPS en producción; sin `/` al final |
| Modelo | `gpt-oss:20b-cloud` | Debe existir en el servidor (`GET /api/tags` lista los disponibles) |
| Authorization (opcional) | `Bearer <token>` | Solo si tu proxy/servidor exige autenticación |

Estos valores se guardan **solo en el dispositivo** (`AsyncStorage`), nunca en el código ni en git.

### Verificar el servidor manualmente

```bash
curl -H "Authorization: Bearer <tu-token>" https://ollama.labshub.cc/api/tags
```

Debe responder `200` con un JSON listando los modelos disponibles.

## Servidor Ollama en el VPS

Este proyecto asume que ya tienes Ollama corriendo detrás de un reverse proxy (nginx/caddy) con:

- Dominio propio + certificado HTTPS (Let's Encrypt u otro)
- El puerto nativo de Ollama (`11434`) **no** expuesto directamente a internet
- Opcionalmente, un header `Authorization` validado en el proxy antes de reenviar a Ollama, ya que Ollama por sí mismo no implementa autenticación

En este caso el servidor (`ollama.labshub.cc`) expone modelos tipo `*-cloud`, que Ollama reenvía a `ollama.com` en vez de ejecutarlos localmente en el VPS — es decir, la inferencia real corre en la nube de Ollama, no en el hardware del VPS.

## Seguridad

- **Nunca** commitees tokens/API keys al código — van solo en `AsyncStorage` vía la pantalla de configuración.
- Si un token queda expuesto (por ejemplo, pegado en un chat, log o commit), rótalo en el servidor lo antes posible.
- El repo es público: antes de cada push, revisa `git status`/`git diff` para asegurarte de que no se cuele ninguna credencial.
- Considera limitar el acceso al endpoint de Ollama (rate limiting, IP allowlist, o auth obligatoria en el proxy) para evitar abuso de cómputo por terceros.

## Roadmap / posibles mejoras

- Persistir el historial de conversación entre sesiones
- Selector de modelo dentro del chat (poblado desde `/api/tags`)
- Manejo de múltiples conversaciones
- Indicador de "escribiendo…" más granular / markdown rendering en las respuestas
