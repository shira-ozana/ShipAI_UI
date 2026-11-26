import type { Message } from '@/types/chat'
import type { ChatService } from './chatService'

const FIRST_TOKEN_DELAY_MS = 700
const WORD_DELAY_MS = 28

interface CannedReply {
  agent?: string
  build: (prompt: string) => string
}

const FENCE = '```'

const featureReply: CannedReply = {
  agent: 'Planner',
  build: (prompt) => `## Plan: ${summarize(prompt)}

Here is how I would break this down across the lifecycle:

1. **Requirements** – clarify the user story and acceptance criteria
2. **Design** – sketch the API contract and the data model
3. **Implementation** – build the endpoint and the UI behind a feature flag
4. **Testing** – unit tests for the service, one end-to-end happy path
5. **Release** – ship to staging, then roll out gradually

A first cut of the API endpoint:

${FENCE}python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/features")


class FeatureRequest(BaseModel):
    title: str
    description: str


@router.post("/", status_code=201)
async def create_feature(req: FeatureRequest) -> dict[str, str]:
    if not req.title.strip():
        raise HTTPException(status_code=422, detail="Title is required")
    return {"status": "planned", "title": req.title}
${FENCE}

> Want me to hand this off to the **Developer** agent to start implementing?
`,
}

const structureReply: CannedReply = {
  agent: 'Architect',
  build: () => `## Project structure

The repository is organized **by area**, so each concern has one obvious home:

- \`src/components\` – presentational React components
- \`src/hooks\` – stateful logic such as \`useChat\`
- \`src/services\` – the \`ChatService\` contract and its implementations
- \`src/types\` – shared TypeScript types

| Layer | Responsibility | Talks to |
| --- | --- | --- |
| UI | Render state, capture input | Hooks |
| Hooks | Own state and side effects | Services |
| Services | Fetch / stream replies | Backend |

Swapping the backend only touches the service layer:

${FENCE}ts
// src/services/index.ts
export const chatService: ChatService = mockChatService
${FENCE}
`,
}

const genericReply: CannedReply = {
  build: (prompt) => `## Got it: ${summarize(prompt)}

This is a **mock reply** streamed word by word, so the UI can be built before the backend exists.

What happens next, once the real agents are connected:

- The request is routed to the right agent
- Agents collaborate on requirements, code and tests
- Results stream back here as Markdown

${FENCE}ts
async function handle(request: string): Promise<string> {
  const plan = await planner.run(request)
  const code = await developer.run(plan)
  return reviewer.run(code)
}
${FENCE}

Try asking me to *add a new feature* or *explain the project structure*.
`,
}

function summarize(prompt: string): string {
  const oneLine = prompt.replace(/\s+/g, ' ').trim()
  return oneLine.length > 60 ? `${oneLine.slice(0, 57)}...` : oneLine
}

function pickReply(prompt: string): CannedReply {
  const text = prompt.toLowerCase()
  if (/(structure|architecture|folder|explain)/.test(text)) return structureReply
  if (/(feature|add|build|implement|create)/.test(text)) return featureReply
  return genericReply
}

/** Resolves after `ms`, or rejects with an AbortError as soon as `signal` aborts. */
function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export const mockChatService: ChatService = {
  async sendMessage(_threadId: string, messages: Message[], onChunk, signal) {
    const lastUser = messages.findLast((m) => m.role === 'user')
    const prompt = lastUser?.content ?? ''
    const reply = pickReply(prompt)
    const text = reply.build(prompt)

    await sleep(FIRST_TOKEN_DELAY_MS, signal)

    // Split on whitespace but keep it, so newlines and indentation survive.
    const tokens = text.split(/(\s+)/).filter(Boolean)
    let first = true
    for (const token of tokens) {
      if (!/^\s+$/.test(token)) await sleep(WORD_DELAY_MS, signal)
      onChunk(first && reply.agent ? { delta: token, agent: reply.agent } : { delta: token })
      first = false
    }
  },
}
