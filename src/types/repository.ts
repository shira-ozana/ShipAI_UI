/** Response of `POST /api/users`. Profile data only: it carries no token and sets no cookie. */
export interface UserProfile {
  user_id: string
  first_name: string
  last_name: string
  email: string
  username: string
  created_at: string
}

export interface RegisterInput {
  first_name: string
  last_name: string
  email: string
  username: string
}

/** Response of `POST /api/repositories`. The backend never returns the GitHub token. */
export interface Repository {
  id: number
  user_id: string
  username: string
  github_user: string
  repo_url: string
  created_at: string
}

export interface AddRepositoryInput {
  /** ShipAI username from the authenticated session. */
  username: string
  github_user: string
  /** GitHub personal access token. The backend field is named `github_password`. */
  github_password: string
  repo_url: string
}
