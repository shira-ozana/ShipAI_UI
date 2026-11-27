# Ship AI – Chat UI

Frontend for a multi-agent platform for the software development lifecycle. This is the chat
interface only. By default it talks to the local **Generic Agent API** (a Python backend that
keeps all Cursor credentials and the LangGraph conversation history). A **mock service** is
still available, but only when you opt in with `VITE_USE_MOCK=true`.

The product name is a placeholder. Rename it in [`src/lib/config.ts`](src/lib/config.ts)
(`PRODUCT_NAME`).

## Stack

- React 19 + Vite + TypeScript (strict), React Router for the screens
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

| Variable                | Default | Meaning                                                                                           |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`          | empty   | Base URL of the backend. Empty means the relative `/api/chat` URL.                                |
| `VITE_USE_MOCK`         | empty   | `true` selects the mock service. Any other value uses the real backend.                           |
| `VITE_PLATFORM_API_URL` | empty   | Base URL of the platform backend (`/api/users`, `/api/repositories`). Leave empty in development. |
| `VITE_AGENT_API_URL`    | empty   | Base URL of the Generic Agent API (`/api/init`). Defaults to `VITE_API_URL`.                      |

Restart the dev server after changing them.

### Running with the local backend

1. Start the Generic Agent API on `127.0.0.1:8000` (see the backend project). Check it with
   `curl http://127.0.0.1:8000/api/health` → `{"status":"ok"}`.
2. Start the UI with `npm run dev` and open <http://localhost:5173>.

`vite.config.ts` proxies `/api/init` **unchanged** to the Generic Agent API on
`http://127.0.0.1:3000`, and the rest of `/api` to `http://127.0.0.1:8000` (for `npm run dev` and
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
├── App.tsx                    # Router: the routes listed under "Repository onboarding"
├── pages/                     # ChatPage, RegisterPage, AddRepositoryPage, RepositoryDetailsPage
├── components/
│   ├── layout/                # ChatLayout, PageLayout (page shells), Header
│   ├── chat/                  # MessageList, MessageBubble, Markdown, CodeBlock,
│   │                          # ChatInput, EmptyState, TypingIndicator
│   ├── repository/            # RepositoryDetails (details + Init Repository button)
│   └── ui/                    # shadcn/ui primitives (button, textarea, input, label, alert, form-field)
├── hooks/
│   ├── useChat.ts             # Messages, sending, streaming and stop logic
│   ├── useRepositories.ts     # GET /api/repositories for the signed-in session
│   ├── useInitRepository.ts   # Subscribe to shared init tracking for one repo
│   └── useCreateFeature.ts    # Explicit New Feature (POST /api/features)
├── services/
│   ├── chatService.ts         # ChatService interface (the contract)
│   ├── apiChatService.ts      # Real implementation: POST /api/chat (default)
│   ├── mockChatService.ts     # Mock implementation, only with VITE_USE_MOCK=true
│   ├── index.ts               # ← chooses which implementation the app uses
│   ├── authService.ts         # /api/auth/*: current user, email-code sign-in, sign-out
│   ├── userService.ts         # POST /api/users
│   ├── repositoryService.ts   # GET|POST /api/repositories
│   ├── initService.ts         # POST /api/features, POST /api/agents/init/run, GET status
│   └── initRunTracker.ts      # One poll loop per repo; shared by list + details
├── types/                     # chat.ts (Message, StreamChunk), repository.ts
└── lib/                       # config, cn(), http (JSON client), validation
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

## Repository onboarding

| Route               | Screen                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------ |
| `/`                 | Chat (unchanged)                                                                           |
| `/register`         | Register: first name, last name, email, ShipAI username                                    |
| `/repositories`     | List: name opens details; per-row **Initialize** / status                                  |
| `/repositories/new` | Add Repository: repository URL, GitHub username, masked GitHub token                       |
| `/repositories/:id` | Details (from list by id): init status, **Init Repository**, **New Feature** after success |

| Call                                                                         | Sent when                                                  | Notes                                                                                           |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `POST /api/users`                                                            | Register                                                   | `201` profile, `409` email or username in use                                                   |
| `GET /api/repositories`                                                      | Repositories list / details by id                          | Session cookie; no init status on each row                                                      |
| `POST /api/repositories`                                                     | Add Repository                                             | `github_password` is the token field. `201` returns `id`, then the UI opens `/repositories/:id` |
| `POST /api/features` `{username, repo_url}`                                  | Init (bootstrap, if needed) or **New Feature** on details  | `201 {feature_id, username, repo_url, created_at}`. Init retries reuse the bootstrap ID         |
| `POST /api/agents/init/run` `{feature_id, project:{repo_url}, dry_run:false}` | Initialize on the list or **Init Repository** on details  | `202 {runId, status:"running"}` via the Platform Backend (port 8000). Completion reads `result.output` (`branch`, `commit`, `pushed`) |
| `GET /api/agents/init/runs/{runId}`                                          | After a `202`, while a screen still subscribes to that run | Platform status for that run. Completion is shown only from this route                          |

Registration, adding a repository and opening the details screen never start initialization.
Initialize on the list and Init Repository on details share one in-memory tracker per repository
(at most one poll loop). The token lives only in the Add Repository form and the request body;
it is cleared on success and is not put in navigation state, storage or logs.

### Sign-in and session

The backend (`backend/app/auth.py`) issues an HttpOnly `shipai_session` cookie; the UI never sees
or stores a token and learns who is signed in only from `GET /api/auth/me` (`AuthProvider`).

- **New user:** `POST /api/users` (201) starts the session, then the UI confirms it with
  `/api/auth/me` and opens Add Repository.
- **Existing user:** `/sign-in` asks for a username or email; the backend emails a one-time code to
  the address on the account, and `POST /api/auth/sign-in/verify` turns it into the cookie.
  A username alone, or a registration `409`, never signs anyone in.
- **Local development:** the backend must run with `AUTH_EMAIL_MODE=console` (the code is written to
  the backend log, never to the HTTP response) or `AUTH_EMAIL_MODE=smtp` with `SMTP_*` set.
  The default `disabled` makes sign-in for existing accounts return 503.
- Keep `VITE_PLATFORM_API_URL` empty so the cookie stays same-origin through the Vite proxy.

### Backend gaps (as of this version)

These contracts do not exist in `backend/` or `shipAI_Generic_Agent/`, so the UI handles them
explicitly instead of faking them:

- **Repository lookup by id.** There is no `GET /api/repositories/{id}`. Details load the selected
  repository from `GET /api/repositories` by matching the route id (and still accept navigation
  state right after Add Repository for a faster first paint).
- **Repository-level initialization status.** `RepositoryOut` has no init field, and there is no
  "latest/active init run for this repository" endpoint. **New Feature** is shown only after a
  successful init tracked in the current browser session; a full reload cannot re-confirm
  eligibility from the server.
- **Active run discovery.** Init runs are addressable only by `runId`
  (`GET /api/agents/init/runs/{runId}`). Reopening a screen resumes an in-memory `started` run;
  after a full reload the UI cannot find an in-flight run without a new API.
- **Ownership checks.** `/api/repositories` requires the session and checks `username` against it.
  `/api/features` and `/api/tasks` still do not check who is calling.
- **Init agent process.** `POST /api/agents/init/run` is forwarded by the Platform Backend to the
  INIT agent (`INIT_AGENT_URL`, default port 3000). Status is polled at
  `GET /api/agents/init/runs/{runId}` on the Platform API, not the older Generic Agent
  `GET /api/init/{runId}` path (different Vite proxy target).
- **CORS.** `backend/` allows only `http://localhost:4200`, so use the Vite proxy in development.
