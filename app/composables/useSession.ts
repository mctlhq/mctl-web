import { computed } from 'vue'
import {
  AUTH_FLOW_PARAM,
  SESSION_REQUEST_HEADERS,
  interpretLogout,
  readSessionView,
  resolveAuthFlow,
  sessionProfile,
  shouldEndSession,
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
  const { baseUrlFront, authFlow } = useRuntimeConfig().public
  // The prerendered page is built in the build default's flow, so the
  // hydrating render starts from the same one.
  const flow = useState<AuthFlow>('auth_flow', () => resolveAuthFlow(authFlow, null, null))

  const sessionUrl = apiUrl('/zitadel/session')
  const loginUrl = apiUrl('/zitadel/login')
  const logoutUrl = apiUrl('/zitadel/logout')

  const signedIn = computed(() => !!view.value)
  const profile = computed(() => (view.value ? sessionProfile(view.value) : null))
  const canRequestWorkspace = computed(() => !!view.value?.canRequestWorkspace)

  function remember(value: AuthFlow) {
    try {
      localStorage.setItem(FLOW_STORAGE_KEY, value)
    } catch {
      // Storage blocked: the choice still applies to this page view.
    }
  }

  // Reads `?auth_flow=` and the browser's remembered choice (localStorage,
  // because the session cookie is browser-wide too; see resolveAuthFlow).
  // Client only. `endSession` is set when an explicit switch to legacy may
  // leave a session cookie behind (see shouldEndSession).
  function resolveFlow(): { flow: AuthFlow; endSession: boolean } {
    let remembered: string | null = null
    try {
      remembered = localStorage.getItem(FLOW_STORAGE_KEY)
    } catch {
      remembered = null
    }
    const query = new URL(window.location.href).searchParams.get(AUTH_FLOW_PARAM)
    const resolved = resolveAuthFlow(authFlow, query, remembered)
    if (query) remember(resolved)
    flow.value = resolved
    return { flow: resolved, endSession: shouldEndSession(query, remembered) }
  }

  async function postLogout() {
    try {
      const res = await fetch(logoutUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { ...SESSION_REQUEST_HEADERS },
      })
      return interpretLogout(res.status, await res.json().catch(() => null))
    } catch {
      return interpretLogout(0, null)
    }
  }

  // Switching back to legacy while a session cookie exists would leave the
  // legacy form broken: the Worker routes any cookie-bearing /api/submit to
  // the session branch, which refuses it without the CSRF header. So the
  // switch ends the session in the Worker first (not at ZITADEL; no
  // redirect). If that fails the session may still be live, so the page
  // stays on the ZITADEL flow, which matches the cookie, instead.
  async function leaveSessionFlow() {
    const outcome = await postLogout()
    if (outcome.ok) {
      markSignedOut()
      return
    }
    remember('zitadel')
    flow.value = 'zitadel'
    await refresh()
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

  // Ends the session in the Worker, then at ZITADEL. Returns an i18n key when
  // the Worker did not confirm it: the view is then re-read rather than
  // cleared, so the page never says "signed out" over a live session.
  async function logout(): Promise<string | null> {
    const outcome = await postLogout()
    if (!outcome.ok) {
      await refresh()
      return outcome.key
    }
    markSignedOut()
    if (outcome.next) window.location.href = outcome.next
    return null
  }

  return {
    flow,
    view,
    status,
    signedIn,
    profile,
    canRequestWorkspace,
    resolveFlow,
    leaveSessionFlow,
    refresh,
    markSignedOut,
    login,
    logout,
  }
}
