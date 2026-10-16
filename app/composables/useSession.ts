import { computed } from 'vue'
import {
  AUTH_FLOW_PARAM,
  SESSION_REQUEST_HEADERS,
  readSessionView,
  resolveAuthFlow,
  sessionProfile,
  type AuthFlow,
  type SessionView,
} from '~/lib/zitadelSession'

const FLOW_STORAGE_KEY = 'mctl_auth_flow'

// The ZITADEL sign-in (C1b). The session lives in the Worker; this composable
// only mirrors who is signed in, as GET /api/zitadel/session reports it, and
// never stores an identity in the browser.
export function useSession() {
  const view = useState<SessionView | null>('zitadel_session', () => null)
  // `unknown` until the first answer, so the form does not flash "sign in"
  // for someone who is signed in.
  const status = useState<'unknown' | 'ready' | 'unavailable'>('zitadel_session_status', () => 'unknown')
  const flow = useState<AuthFlow>('auth_flow', () => 'legacy')

  const sessionUrl = apiUrl('/zitadel/session')
  const loginUrl = apiUrl('/zitadel/login')
  const logoutUrl = apiUrl('/zitadel/logout')
  const { baseUrlFront, authFlow } = useRuntimeConfig().public

  const signedIn = computed(() => !!view.value)
  const profile = computed(() => (view.value ? sessionProfile(view.value) : null))
  const canRequestWorkspace = computed(() => !!view.value?.canRequestWorkspace)

  // Reads `?auth_flow=` and the tab's remembered choice. Client only:
  // the prerendered page always starts from the build default.
  function resolveFlow(): AuthFlow {
    let remembered: string | null = null
    try {
      remembered = sessionStorage.getItem(FLOW_STORAGE_KEY)
    } catch {
      remembered = null
    }
    const query = new URL(window.location.href).searchParams.get(AUTH_FLOW_PARAM)
    const resolved = resolveAuthFlow(authFlow, query, remembered)
    if (query) {
      try {
        sessionStorage.setItem(FLOW_STORAGE_KEY, resolved)
      } catch {
        // Private mode: the parameter still applies to this page view.
      }
    }
    flow.value = resolved
    return resolved
  }

  async function refresh() {
    try {
      const res = await fetch(sessionUrl, { credentials: 'include', cache: 'no-store' })
      if (!res.ok) {
        view.value = null
        status.value = 'unavailable'
        return
      }
      view.value = readSessionView(await res.json().catch(() => null))
      status.value = 'ready'
    } catch {
      view.value = null
      status.value = 'unavailable'
    }
  }

  // The session cookie is gone (the Worker cleared it on 401): drop the mirror
  // at once rather than waiting for a round trip.
  function markSignedOut() {
    view.value = null
    status.value = 'ready'
  }

  function login() {
    const redirect = baseUrlFront ? `?redirect_to=${encodeURIComponent(String(baseUrlFront))}` : ''
    window.location.href = `${loginUrl}${redirect}`
  }

  // Ends the session in the Worker, then at ZITADEL. If the Worker cannot be
  // reached the local view is still cleared; the cookie then expires on its
  // own within the session lifetime.
  async function logout() {
    let next: string | null = null
    try {
      const res = await fetch(logoutUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { ...SESSION_REQUEST_HEADERS },
      })
      const body = await res.json().catch(() => null)
      if (res.ok && body && typeof body.logoutUrl === 'string' && body.logoutUrl.startsWith('https://')) {
        next = body.logoutUrl
      }
    } catch {
      next = null
    }
    markSignedOut()
    if (next) window.location.href = next
  }

  return {
    flow,
    view,
    status,
    signedIn,
    profile,
    canRequestWorkspace,
    resolveFlow,
    refresh,
    markSignedOut,
    login,
    logout,
  }
}
