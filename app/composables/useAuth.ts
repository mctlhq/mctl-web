import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import type { GitHubUser } from '@/types'
import {
  decodeAuthFragment,
  isExpired,
  isIdentity,
  makeStored,
  readStored,
  type AuthIdentity,
} from '~/lib/authBlob'

const AUTH_KEY = 'mctl_auth'

export function useAuth() {
  // SSR-safe state. `user` holds the identity exactly as the Worker issued it;
  // see app/lib/authBlob.ts for why the client never rebuilds its fields.
  const user = useState<AuthIdentity | null>('auth_user', () => null)
  const errorCode = useState<string | null>('auth_error', () => null)

  const stored = useStorage<unknown>(AUTH_KEY, null)

  const isAuth = computed(() => !!user.value?.login)

  // Sent unchanged in `github_auth` to /api/submit and /api/github/check-team.
  const authData = computed(() => user.value)

  // Display-only view for the signed-in badge; never sent anywhere.
  const profile = computed(() => user.value as unknown as GitHubUser | null)

  function setUser(identity: AuthIdentity) {
    user.value = identity
    stored.value = makeStored(identity, Date.now())
    errorCode.value = null
  }

  function restore() {
    const current = readStored(stored.value)
    if (!current || isExpired(current, Date.now())) {
      stored.value = null
      return
    }

    // Persist the converted shape so a pre-#133 entry is read only once.
    stored.value = current
    user.value = current.identity
  }

  function logout() {
    user.value = null
    stored.value = null
    errorCode.value = null
  }

  function parseOAuth(): { error?: string; authenticated?: boolean } {
    if (import.meta.server || !window) return {}

    const url = new URL(window.location.href)

    const auth = url.searchParams.get('auth') || 
                (url.hash.startsWith('#auth=') ? url.hash.substring(6) : null)
    const error =
      url.searchParams.get('auth_error') ||
      (url.hash.startsWith('#auth_error=') ? url.hash.substring(12) : null)

    if (error) {
      errorCode.value = error
      cleanUrl()
      return { error }
    }

    if (!auth) return {}

    try {
      const parsed = decodeAuthFragment(auth)
      if (!isIdentity(parsed)) throw new Error('identity without login or sig')

      setUser(parsed)
    } catch (e) {
      console.error('Failed to parse auth data:', e)
      errorCode.value = 'PARSE_ERROR'
      cleanUrl()
      return { error: 'PARSE_ERROR' }
    }

    cleanUrl()
    return { authenticated: true }
  }

  function cleanUrl() {
    if (import.meta.server || !window) return

    const url = new URL(window.location.href)
    let changed = false

    if (url.searchParams.has('auth')) {
      url.searchParams.delete('auth')
      changed = true
    }
    if (url.searchParams.has('auth_error')) {
      url.searchParams.delete('auth_error')
      changed = true
    }
    if (url.hash.startsWith('#auth=') || url.hash.startsWith('#auth_error=')) {
      url.hash = ''
      changed = true
    }

    if (changed) {
      const cleanPath = url.pathname + url.search + url.hash
      history.replaceState(null, '', cleanPath)
    }
  }

  return {
    user,
    profile,
    isAuth,
    authData,
    errorCode,
    parseOAuth,
    restore,
    logout,
  }
}
