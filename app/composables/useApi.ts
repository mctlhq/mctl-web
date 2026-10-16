import { SESSION_REQUEST_HEADERS, interpretSubmit, type SubmitOutcome } from '~/lib/zitadelSession'

export interface SubmitResult {
  success: boolean
  message?: string
  // HTTP status and the Worker's machine-readable `code`, when present. The
  // request-access form uses them to recognise a stale sign-in
  // (401 auth_expired / auth_format, mctl-web#133).
  status?: number
  code?: string
}

// Joins the configured base (`https://mctl.ai/api` in production) with a
// route path, tolerating a trailing slash on the base. Call it during setup
// (or from a composable's body), not from an async handler: the runtime
// config is only guaranteed to resolve inside the Nuxt app context.
export function apiUrl(path: string): string {
  const raw = String(useRuntimeConfig().public.apiBase || '')
  if (!raw) {
    // Reached only via a misbuild: a defined-but-empty NUXT_PUBLIC_API_BASE
    // overrides the nuxt.config.ts default. Requests then go to a
    // root-relative path that nginx answers with the SPA shell.
    console.error('[api] no apiBase configured; requests will use a root-relative path')
  }
  return `${raw.replace(/\/+$/, '')}${path}`
}

// A request counts as accepted only when the HTTP status is 2xx AND the body
// says `success: true`. Either signal alone is not enough: a proxy error page
// can arrive as 200 HTML, and the Worker answers its own failures with a JSON
// body on a 4xx/5xx. A body that cannot be read is a failed request, never an
// empty success. The Worker's `message` is passed through so the form can show
// the specific reason; callers supply a localized fallback when it is absent.
async function postJson(url: string, payload: object): Promise<SubmitResult> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    body = null
  }

  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
  const message = record && typeof record.message === 'string' ? record.message : undefined

  const code = record && typeof record.code === 'string' ? record.code : undefined

  if (!response.ok || !record || record.success !== true) {
    return { success: false, message, status: response.status, code }
  }
  return { success: true, message }
}

export function useApi() {
  const submitUrl = apiUrl('/submit')
  const contactUrl = apiUrl('/contact')

  // The ZITADEL sign-in (C1b): the Worker reads the creator from its session
  // cookie, so the body carries no identity. The custom header is part of the
  // Worker's CSRF check. A body that cannot be read is a failed request.
  async function submitSessionRequest(payload: {
    team: string
    usecase: string
    turnstile_token: string
  }): Promise<SubmitOutcome> {
    const response = await fetch(submitUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...SESSION_REQUEST_HEADERS },
      body: JSON.stringify(payload),
    })
    const body = await response.json().catch(() => null)
    return interpretSubmit(response.status, body)
  }

  async function submitAccessRequest(payload: {
    github_auth: object
    team: string
    usecase: string
    turnstile_token: string
  }): Promise<SubmitResult> {
    return postJson(submitUrl, payload)
  }

  async function submitContactForm(payload: {
    name: string
    email: string
    message: string
    turnstile_token: string
  }): Promise<SubmitResult> {
    return postJson(contactUrl, payload)
  }

  return {
    submitAccessRequest,
    submitSessionRequest,
    submitContactForm,
  }
}
