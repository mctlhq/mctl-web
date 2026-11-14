// A NEW team (tenant) name requested from the site: 2-31 characters,
// lowercase alphanumeric and hyphens, not starting with a hyphen. Deploy
// operations and Vault secrets on the platform cap names at 31, so a longer
// team could be created but never deploy. The Worker (cloudflare-worker/
// index.js TEAM_NAME_RE), mctl-api, mctl-portal and mctl-gitops enforce the
// same bound.
export const TEAM_NAME_MAX_LENGTH = 31

export const TEAM_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,30}$/

export function isValidTeamName(value: string): boolean {
  return TEAM_NAME_PATTERN.test(value)
}
