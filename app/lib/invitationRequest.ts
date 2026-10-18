// A success response must identify an accepted, saved request. Never infer
// acceptance from a 2xx status alone or expose a malformed receipt to the UI.
export function invitationReceipt(status: number, body: unknown): string | null {
  if (status !== 202 || !body || typeof body !== 'object') return null
  const value = body as Record<string, unknown>
  return value.success === true && typeof value.requestId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value.requestId)
    ? value.requestId : null
}
