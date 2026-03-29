import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import type { GitHubUser } from '@/types'

const AUTH_KEY = 'mctl_auth'
const AUTH_TTL = 8 * 60 * 60 * 1000

export function useAuth() {
  // SSR-safe state
  const user = useState<GitHubUser | null>('auth_user', () => null)

  const stored = useStorage<(GitHubUser & { exp: number }) | null>(
    AUTH_KEY,
    null
  )

  const isAuth = computed(() => !!user.value?.login)

  function setUser(u: GitHubUser) {
    user.value = u
    stored.value = {
      ...u,
      exp: Date.now() + AUTH_TTL,
    }
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
  }

  function parseOAuth(): { error?: string } {
    if (!window) return {}

    const url = new URL(window.location.href)

    const auth = url.searchParams.get('auth') || url.hash.replace('#auth=', '')
    const error =
      url.searchParams.get('auth_error') ||
      url.hash.replace('#auth_error=', '')

    if (error) {
      cleanUrl()
      return { error }
    }

    if (!auth) return {}

    try {
      const json = atob(auth.replace(/-/g, '+').replace(/_/g, '/'))
      const parsed = JSON.parse(json) as GitHubUser

      setUser(parsed)
    } catch (e) {
      console.error(e)
      cleanUrl()
      return { error: 'PARSE_ERROR' }
    }

    cleanUrl()
    return {}
  }

  function cleanUrl() {
    history.replaceState(null, '', window.location.pathname)
  }

  function getAuthData() {
    if (!user.value) return ''

    return JSON.stringify({
      login: user.value.login,
      name: user.value.name || user.value.login,
      email: user.value.email || '',
      avatar_url: user.value.avatar_url,
      html_url: user.value.html_url,
      sig: user.value.sig,
    })
  }

  return {
    user,
    isAuth,
    parseOAuth,
    restore,
    logout,
    getAuthData,
  }
}
