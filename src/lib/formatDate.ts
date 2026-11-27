/** Formats an ISO timestamp for list metadata. Falls back to the raw string if unparseable. */
export function formatConnectedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
