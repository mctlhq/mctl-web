import { ref } from 'vue'

const TEAM_REGEX = /^[a-z0-9][a-z0-9-]{0,62}$/
const CHECK_TEAM_URL = 'https://mctl.ai/api/github/check-team'

interface GithubAuthIdentity {
  login?: string
  sig?: string
}

// check-team is identity-gated (see cloudflare-worker/index.js handleCheckTeam):
// it requires the same signed { login, sig } handleFormSubmit already
// validates, sent in the POST body — never the query string, since sig is an
// unbounded bearer credential. `getAuthData` is read on every call so the
// composable always uses the caller's current sign-in state.
export function useTeamValidation(getAuthData?: () => GithubAuthIdentity | null | undefined) {
  const teamAvailable = ref(false)
  const teamError = ref('')
  const checking = ref(false)
  let checkTimeout: ReturnType<typeof setTimeout> | null = null
  // Cancels the in-flight check when a newer one starts. The debounce alone
  // does not prevent overlap: it only delays the *start*, so two requests can
  // still be in flight after a pause mid-typing, and a slow first response
  // arriving second would overwrite the newer verdict — leaving the field
  // showing the availability of a name the user has already changed.
  let inFlight: AbortController | null = null

  function validate(value: string): string | null {
    if (!value) return null
    if (!TEAM_REGEX.test(value)) {
      return 'Team name must be lowercase alphanumeric with hyphens (max 63 chars)'
    }
    return null
  }

  function hasIdentity(): boolean {
    const authData = getAuthData ? getAuthData() : null
    return !!(authData && authData.login && authData.sig)
  }

  function onInput(value: string) {
    teamAvailable.value = false
    teamError.value = ''

    if (!value) return

    const error = validate(value)
    if (error) {
      teamError.value = error
      return
    }

    if (!hasIdentity()) {
      teamError.value = 'js.team.sign_in_required'
      return
    }

    if (checkTimeout) clearTimeout(checkTimeout)
    if (value.length >= 2) {
      checkTimeout = setTimeout(() => {
        checkAvailability(value)
      }, 600)
    }
  }

  async function checkAvailability(name: string) {
    const authData = getAuthData ? getAuthData() : null
    if (!authData || !authData.login || !authData.sig) {
      teamAvailable.value = false
      teamError.value = 'js.team.sign_in_required'
      return
    }

    if (inFlight) inFlight.abort()
    const controller = new AbortController()
    inFlight = controller

    checking.value = true
    teamError.value = ''

    try {
      const res = await fetch(CHECK_TEAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          github_auth: { login: authData.login, sig: authData.sig },
        }),
        signal: controller.signal,
      })

      if (res.status === 401) {
        teamAvailable.value = false
        teamError.value = 'js.team.sign_in_required'
        return
      }

      // Every other non-2xx, not just the one we recognise. 429 in particular
      // is now reachable — this endpoint is rate-limited at 20/min/IP, which
      // repeated edits or an office behind one NAT will hit — and its body has
      // no `available` field. Falling through would land in the `else` below
      // and tell the user the name is taken, which is both false and blocking.
      if (!res.ok) {
        teamAvailable.value = false
        teamError.value = res.status === 429 ? 'js.team.rate_limited' : 'js.team.check_failed'
        return
      }

      const data = await res.json()

      if (data.available) {
        teamAvailable.value = true
      } else {
        teamAvailable.value = false
        // It will be beter to use codes instead of parsing error message
        if (data.error === 'Invalid team name format') {
          teamError.value = `js.team.wrong-format`
        } else {
          teamError.value = `js.team.taken`
        }
      }
    } catch (err) {
      // A superseded request is not a failure: abort() rejects the fetch, and
      // reporting that as check_failed would flash an error for a name the
      // user has already moved on from. The newer call owns the outcome.
      if ((err as { name?: string })?.name === 'AbortError') return
      teamAvailable.value = false
      teamError.value = 'js.team.check_failed'
    } finally {
      // Only the newest request may clear the spinner — an aborted older one
      // must not, or the field would read "done" while a check is still running.
      if (inFlight === controller) {
        inFlight = null
        checking.value = false
      }
    }
  }

  return {
    teamAvailable,
    teamError,
    checking,
    validate,
    onInput,
    checkAvailability,
  }
}
