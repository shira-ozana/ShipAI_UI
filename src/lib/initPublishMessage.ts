import type { InitPublishInfo } from '@/services/initService'

/**
 * User-facing publish line derived from `result.output`.
 * "Pushed to GitHub" is only returned when `pushed` is true.
 */
export function initPublishMessage(publish: InitPublishInfo | null | undefined): string | null {
  if (!publish) return null

  if (publish.pushed) {
    const parts = ['Pushed to GitHub']
    if (publish.branch) parts.push(`on branch ${publish.branch}`)
    if (publish.commit) parts.push(`(${publish.commit})`)
    return parts.join(' ')
  }

  if (publish.publishError) {
    if (publish.commit) {
      const where = publish.branch ? ` on branch ${publish.branch}` : ''
      return (
        `Local commit ${publish.commit}${where} was not pushed to GitHub. ${publish.publishError}`
      )
    }
    return publish.publishError
  }

  if (publish.commit) {
    const where = publish.branch ? ` on branch ${publish.branch}` : ''
    return `Local commit ${publish.commit}${where} was not pushed to GitHub.`
  }

  return null
}
