import { onUnmounted, ref } from 'vue'

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

interface TurnstileRenderOptions {
  sitekey: string
  callback: (token: string) => void
  'expired-callback'?: () => void
  'error-callback'?: () => void
  theme?: 'auto' | 'light' | 'dark'
  size?: 'normal' | 'flexible' | 'compact'
  appearance?: 'always' | 'execute' | 'interaction-only'
  language?: string
}

// What the form should tell the user about the challenge. `pending` covers
// both "still loading" and "solving invisibly"; only the two failure states
// below get visible copy, because with `appearance: 'interaction-only'` the
// widget itself is hidden unless a human check is actually needed, and an
// expired or failed challenge would otherwise leave no trace on the page.
export type TurnstileState = 'pending' | 'ready' | 'expired' | 'error'

interface TurnstileApi {
  render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string
  reset: (widgetId?: string) => void
  remove: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Turnstile script'))
    document.head.appendChild(script)
  }).catch((err) => {
    // Drop the cached promise so a later mount retries the load instead of
    // re-awaiting a permanently rejected one. Without this, a single
    // transient CDN failure disables the widget for the rest of the page's
    // life, and both forms gate on a token that can then never arrive.
    scriptPromise = null
    throw err
  })

  return scriptPromise
}

export function useTurnstile() {
  const token = ref('')
  const widgetId = ref<string | null>(null)
  const loadFailed = ref(false)
  const state = ref<TurnstileState>('pending')

  // Set when the component unmounts while `render()` is still awaiting the
  // script, so the late resolution does not render into a detached container.
  let cancelled = false

  async function render(container: string | HTMLElement, sitekey: string, language?: string) {
    if (import.meta.server) return
    if (!sitekey) {
      // Reached only via a misbuild — an empty NUXT_PUBLIC_TURNSTILE_SITE_KEY
      // overriding the config fallback. Returning quietly here is what turned
      // that into two permanently unusable forms with no diagnosis.
      loadFailed.value = true
      console.error('[turnstile] no sitekey configured; widget will not render')
      return
    }

    cancelled = false
    try {
      await loadTurnstileScript()
    } catch (err) {
      loadFailed.value = true
      // The most likely causes are a CSP block or an ad blocker, neither of
      // which produces any other trace. Without this line the on-call view of
      // "nobody can submit the contact form" is an empty console.
      console.error('[turnstile] script failed to load', err)
      return
    }

    if (cancelled) return
    if (!window.turnstile) {
      loadFailed.value = true
      console.error('[turnstile] script loaded but window.turnstile is undefined')
      return
    }

    loadFailed.value = false
    widgetId.value = window.turnstile.render(container, {
      sitekey,
      // Follow the OS colour scheme, fill the form's width, and stay out of
      // sight unless Cloudflare needs an interaction.
      theme: 'auto',
      size: 'flexible',
      appearance: 'interaction-only',
      ...(language ? { language } : {}),
      callback: (t: string) => {
        token.value = t
        state.value = 'ready'
      },
      'expired-callback': () => {
        // The widget refreshes an expired token by itself; the state tells the
        // form to say so instead of failing the next submit silently.
        token.value = ''
        state.value = 'expired'
      },
      'error-callback': () => {
        token.value = ''
        state.value = 'error'
      },
    })
  }

  function reset() {
    if (import.meta.server) return
    token.value = ''
    state.value = 'pending'
    if (window.turnstile && widgetId.value) {
      window.turnstile.reset(widgetId.value)
    }
  }

  function remove() {
    if (import.meta.server) return
    cancelled = true
    token.value = ''
    if (window.turnstile && widgetId.value) {
      window.turnstile.remove(widgetId.value)
    }
    widgetId.value = null
  }

  // Both forms live on the homepage, which is left and re-entered by SPA
  // navigation (the footer links to /privacy). Without this, every return
  // registers another widget against the global Turnstile API and keeps the
  // previous one's callbacks alive.
  onUnmounted(remove)

  return {
    token,
    loadFailed,
    state,
    render,
    reset,
    remove,
  }
}
