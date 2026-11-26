# SDLC Studio – Chat UI

Frontend for a multi-agent platform for the software development lifecycle. This is the chat
interface only. By default it talks to the local **Generic Agent API** (a Python backend that
keeps all Cursor credentials and the LangGraph conversation history). A **mock service** is
still available, but only when you opt in with `VITE_USE_MOCK=true`.

The product name is a placeholder. Rename it in [`src/lib/config.ts`](src/lib/config.ts)
(`PRODUCT_NAME`).

## Stack

- React 19 + Vite + TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui components, lucide-react icons
- react-markdown + remark-gfm for assistant replies
- ESLint (typescript-eslint, react-hooks) + Prettier

## Getting started

Requires Node.js 20.19+ (or 22.12+).

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script                 | What it does                            |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | Start the dev server                    |
| `npm run build`        | Type-check and build to `dist/`         |
| `npm run preview`      | Serve the production build locally      |
| `npm run lint`         | Run ESLint                              |
| `npm run format`       | Format all files with Prettier          |
| `npm run format:check` | Check formatting without changing files |

### Environment

Copy `.env.example` to `.env.local` if you need to change anything. Both variables are optional.

| Variable        | Default | Meaning                                                                 |
| --------------- | ------- | ----------------------------------------------------------------------- |
| `VITE_API_URL`  | empty   | Base URL of the backend. Empty means the relative `/api/chat` URL.      |
| `VITE_USE_MOCK` | empty   | `true` selects the mock service. Any other value uses the real backend. |

Restart the dev server after changing them.

### Running with the local backend

1. Start the Generic Agent API on `127.0.0.1:8000` (see the backend project). Check it with
   `curl http://127.0.0.1:8000/api/health` → `{"status":"ok"}`.
2. Start the UI with `npm run dev` and open <http://localhost:5173>.

`vite.config.ts` proxies `/api` **unchanged** to `http://127.0.0.1:8000` (for `npm run dev` and
`npm run preview`), so the browser only talks to the UI's own origin and no CORS setup is needed.
No credentials live in this project; Cursor keys stay in the Python backend.

**`VITE_API_URL` override.** When `VITE_API_URL` is set (for example
`VITE_API_URL=http://127.0.0.1:8000` or a deployed backend), `src/lib/config.ts` exposes it as
`API_URL` and the chat calls `${VITE_API_URL}/api/chat` directly instead of using the proxy. A
trailing slash is ignored. Because the browser then makes a cross-origin request, the backend
must allow CORS for the UI's origin. Leave it empty to use the relative URL.

**Mock mode.** `VITE_USE_MOCK=true npm run dev` shows the "Mock mode" badge and streams canned
replies. The app never switches to the mock after an API error; errors are shown in the chat.

### Deploying to Vercel

Import the repository in Vercel. It detects Vite automatically (build: `npm run build`, output:
`dist`). The dev proxy does not exist in production, so set `VITE_API_URL` under Project →
Settings → Environment Variables to your deployed backend (which must allow CORS for the site),
or add a Vercel rewrite that forwards `/api/*` to it.

## Project structure

```
src/
├── App.tsx                    # Wires useChat to the layout and chat components
├── components/
│   ├── layout/                # ChatLayout (page shell), Header
│   ├── chat/                  # MessageList, MessageBubble, Markdown, CodeBlock,
│   │                          # ChatInput, EmptyState, TypingIndicator
│   └── ui/                    # shadcn/ui primitives (button, textarea)
├── hooks/useChat.ts           # Messages, sending, streaming and stop logic
├── services/
│   ├── chatService.ts         # ChatService interface (the contract)
│   ├── apiChatService.ts      # Real implementation: POST /api/chat (default)
│   ├── mockChatService.ts     # Mock implementation, only with VITE_USE_MOCK=true
│   └── index.ts               # ← chooses which implementation the app uses
├── types/chat.ts              # Message and StreamChunk types
└── lib/                       # config (name, API URL), cn() helper
```

Components are presentational. All chat state lives in `useChat`, which only knows the
`ChatService` interface.

## Backend contract and chat behaviour

| Request                                                | Response                                                    |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `GET /api/health`                                      | `{"status":"ok"}`                                           |
| `POST /api/chat` `{"threadId":"<UUID>","message":"…"}` | `{"threadId":"<same UUID>","reply":"…"}`                    |
| `POST /api/chat` while that thread is still running    | `409` (shown as a "previous request still running" message) |

- `useChat` generates one thread UUID per chat session and reuses it for every turn. Only the
  **newest user message** is sent; LangGraph supplies the earlier history. `reset()` (returned by
  `useChat`) clears the conversation and starts a new thread. The current UI has no "new chat"
  button, so reloading the page also starts a fresh thread.
- The backend returns one complete JSON reply, which `apiChatService` passes to `onChunk` once as
  `{ delta: reply }`. The typing indicator stays visible until it arrives.
- **Stop** aborts the browser request (`AbortSignal`). It does not cancel the model run: the server
  may still finish that turn, so an immediate follow-up can get a "still running" (409) message.
- Friendly messages are shown for an unreachable backend, an invalid/unexpected response, a busy
  thread (409), and other HTTP errors.

The contract (`src/services/chatService.ts`):

```ts
interface ChatService {
  sendMessage(
    threadId: string, // stable for the whole chat session
    messages: Message[], // local history; the last entry is the newest user message
    onChunk: (chunk: StreamChunk) => void, // { delta: string; agent?: string }
    signal: AbortSignal,
  ): Promise<void>
}
```

Implementations throw `ChatServiceError` (with a user-friendly message) for failures and let
`AbortError` propagate when aborted. Setting `agent` on a chunk shows that agent's name as a small
label above the reply.
