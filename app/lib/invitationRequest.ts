// A success response must identify an accepted, saved request. Never infer
// acceptance from a 2xx status alone or expose a malformed receipt to the UI.
export function invitationReceipt(status: number, body: unknown): string | null {
  if (status !== 202 || !body || typeof body !== 'object') return null
  const value = body as Record<string, unknown>
  return value.success === true && typeof value.requestId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value.requestId)
    ? value.requestId : null
}

export function invitationEntryView(input: {
  entry: 'default' | 'invitation' | 'workspace'; invitationOnly: boolean;
  flow: 'legacy' | 'zitadel'; signedIn: boolean; canRequestWorkspace: boolean;
  legacySignedIn: boolean; authError: boolean;
}) {
  const signedIn = input.flow === 'zitadel' ? input.signedIn : input.legacySignedIn
  const eligible = input.flow === 'legacy' ? signedIn : signedIn && input.canRequestWorkspace
  const workspace = input.entry === 'workspace' || (input.entry === 'default' && (!input.invitationOnly || eligible))
  return { workspace, badge: workspace || signedIn || input.authError }
}

// Switching back from the invitation form must preserve the current identity.
// Anonymous invited visitors start OIDC; a live session needs no new redirect.
export function shouldStartInvitedLogin(flow: 'legacy' | 'zitadel', signedIn: boolean, legacySignedIn: boolean): boolean {
  return !(flow === 'zitadel' ? signedIn : legacySignedIn)
}
