import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initPublishMessage } from '@/lib/initPublishMessage'
import { getInitRun, startInit } from '@/services/initService'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('startInit', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs dry_run: false with feature_id and project.repo_url', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(202, { runId: 'run-abc', status: 'running' }),
    )

    const runId = await startInit('feature-1', 'https://github.com/org/repo')

    expect(runId).toBe('run-abc')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/agents/init/run')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({
      feature_id: 'feature-1',
      project: { repo_url: 'https://github.com/org/repo' },
      dry_run: false,
    })
  })
})

describe('getInitRun result.output', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads branch, commit, and pushed=true from result.output', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        runId: 'run-1',
        status: 'completed',
        result: {
          output: {
            summary: 'INIT finished.',
            branch: 'shipAI',
            commit: 'abc123def',
            pushed: true,
          },
        },
      }),
    )

    const snapshot = await getInitRun('run-1')

    expect(snapshot).toEqual({
      runId: 'run-1',
      status: 'completed',
      publish: {
        branch: 'shipAI',
        commit: 'abc123def',
        pushed: true,
        publishError: null,
        summary: 'INIT finished.',
      },
    })
    expect(initPublishMessage(snapshot.publish)).toBe(
      'Pushed to GitHub on branch shipAI (abc123def)',
    )
  })

  it('does not claim a GitHub push when pushed is false but a local commit exists', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        runId: 'run-2',
        status: 'completed',
        result: {
          output: {
            summary: 'INIT finished.',
            branch: 'shipAI',
            commit: 'localsha',
            pushed: false,
          },
        },
      }),
    )

    const snapshot = await getInitRun('run-2')

    expect(snapshot.publish).toMatchObject({
      branch: 'shipAI',
      commit: 'localsha',
      pushed: false,
      publishError: null,
    })
    const message = initPublishMessage(snapshot.publish)
    expect(message).toContain('Local commit localsha on branch shipAI was not pushed to GitHub.')
    expect(message).not.toContain('Pushed to GitHub')
  })

  it('surfaces the backend publish error from alerts', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        runId: 'run-3',
        status: 'completed_with_warnings',
        result: {
          output: {
            summary: 'INIT finished.',
            branch: 'shipAI',
            commit: null,
            pushed: false,
            alerts: [
              {
                kind: 'write_failure',
                severity: 'error',
                reason: 'publish failed: authentication required',
              },
            ],
          },
        },
      }),
    )

    const snapshot = await getInitRun('run-3')

    expect(snapshot.status).toBe('completed_with_warnings')
    expect(snapshot.publish?.pushed).toBe(false)
    expect(snapshot.publish?.publishError).toBe('publish failed: authentication required')
    expect(initPublishMessage(snapshot.publish)).toBe('publish failed: authentication required')
    expect(initPublishMessage(snapshot.publish)).not.toContain('Pushed to GitHub')
  })

  it('combines local commit and publish error when both are present', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        runId: 'run-4',
        status: 'completed_with_warnings',
        result: {
          output: {
            branch: 'shipAI',
            commit: 'deadbeef',
            pushed: false,
            alerts: [
              {
                kind: 'write_failure',
                severity: 'error',
                reason: 'publish failed: remote rejected',
              },
            ],
          },
        },
      }),
    )

    const snapshot = await getInitRun('run-4')
    expect(initPublishMessage(snapshot.publish)).toBe(
      'Local commit deadbeef on branch shipAI was not pushed to GitHub. publish failed: remote rejected',
    )
  })
})
