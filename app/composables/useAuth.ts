import { ref } from 'vue'

const AUTH_KEY = 'mctl_auth'
const AUTH_TTL = 8 * 60 * 60 * 1000

interface GitHubUser {
  login: string
  name: string
  email: string
  avatar_url: string
  html_url: string
  sig: string
}

function saveAuthStorage(data: Partial<GitHubUser>) {
  try {
    const cur = loadAuthStorage() || {}
    localStorage.setItem(AUTH_KEY, JSON.stringify({ ...cur, ...data, exp: Date.now() + AUTH_TTL }))
  } catch {}
}

function loadAuthStorage(): (GitHubUser & { exp: number }) | null {
  try {
    const d = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null')
    if (!d || Date.now() > d.exp) {
      localStorage.removeItem(AUTH_KEY)
      return null
    }
    return d
  } catch {
    return null
  }
}

function clearAuthStorage() {
  try { localStorage.removeItem(AUTH_KEY) } catch {}
}

const githubUser = ref<GitHubUser | null>(null)

export function useAuth() {
  function checkOAuthReturn(): { error?: string } {
    if (typeof window === 'undefined') return {}

    const hash = window.location.hash
    const urlParams = new URLSearchParams(window.location.search)

    const authError = urlParams.get('auth_error') || (hash.startsWith('#auth_error=') ? hash.substring(12) : null)
    const authData = urlParams.get('auth') || (hash.startsWith('#auth=') ? hash.substring(6) : null)

    if (authError) {
      history.replaceState(null, '', window.location.pathname)
      return { error: authError }
    }

    if (!authData) return {}

    try {
      const base64 = authData.replace(/-/g, '+').replace(/_/g, '/')
      const json = atob(base64)
      const user = JSON.parse(json) as GitHubUser
      githubUser.value = user
      saveAuthStorage({
        login: user.login,
        name: user.name || user.login,
        email: user.email || '',
        avatar_url: user.avatar_url || '',
        html_url: user.html_url || '',
        sig: user.sig || '',
      })
    } catch (e) {
      console.error('Failed to parse GitHub auth data:', e)
      history.replaceState(null, '', window.location.pathname)
      return { error: 'PARSE_ERROR' }
    }

    history.replaceState(null, '', window.location.pathname)
    return {}
  }

  function restoreFromStorage() {
    const saved = loadAuthStorage()
    if (!saved || !saved.login || !saved.sig) return
    githubUser.value = saved
  }

  function logout() {
    githubUser.value = null
    clearAuthStorage()
  }

  function getAuthData(): string {
    if (!githubUser.value) return ''
    return JSON.stringify({
      login: githubUser.value.login,
      name: githubUser.value.name || githubUser.value.login,
      email: githubUser.value.email || '',
      avatar_url: githubUser.value.avatar_url,
      html_url: githubUser.value.html_url,
      sig: githubUser.value.sig,
    })
  }

  return {
    githubUser,
    checkOAuthReturn,
    restoreFromStorage,
    logout,
    getAuthData,
  }
}
