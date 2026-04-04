import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import type { GitHubUser } from '@/types'

const AUTH_KEY = 'mctl_auth'
const AUTH_TTL = 8 * 60 * 60 * 1000

export function useAuth() {
  // SSR-safe state
  const user = useState<GitHubUser | null>('auth_user', () => null)
  const errorCode = useState<string | null>('auth_error', () => null)

  const stored = useStorage<(GitHubUser & { exp: number }) | null>(
    AUTH_KEY,
    null
  )

  const isAuth = computed(() => !!user.value?.login)

  const authData = computed(() => {
    if (!user.value) return null;

    return {
      login: user.value.login,
      name: user.value.name || user.value.login,
      email: user.value.email || '',
      avatar_url: user.value.avatar_url,
      html_url: user.value.html_url,
      sig: user.value.sig,
    };
  });

  function setUser(u: GitHubUser) {
    user.value = u
    stored.value = {
      ...u,
      exp: Date.now() + AUTH_TTL,
    }
    errorCode.value = null
  }

  function restore() {
    if (!stored.value) return

    if (Date.now() > stored.value.exp) {
      stored.value = null
      return
    }

    user.value = stored.value
  }

  function logout() {
    user.value = null
    stored.value = null
    errorCode.value = null
  }

  function parseOAuth(): { error?: string } {
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
      const json = atob(auth.replace(/-/g, '+').replace(/_/g, '/'))
      const parsed = JSON.parse(json) as GitHubUser

      setUser(parsed)
    } catch (e) {
      console.error('Failed to parse auth data:', e)
      errorCode.value = 'PARSE_ERROR'
      cleanUrl()
      return { error: 'PARSE_ERROR' }
    }

    cleanUrl()
    return {}
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
    isAuth,
    authData,
    errorCode,
    parseOAuth,
    restore,
    logout,
  }
}
