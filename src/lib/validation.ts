const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value)
}

/**
 * True for `https://github.com/<owner>/<repo>` (optionally `www.`, `.git`, a trailing slash,
 * or `http`).
 * The backend accepts only github.com hosts, so other hosts are rejected here as well.
 */
export function isGithubRepoUrl(value: string): boolean {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return false
  const segments = url.pathname.split('/').filter(Boolean)
  return segments.length === 2 && segments.every((s) => /^[\w.-]+$/.test(s))
}
