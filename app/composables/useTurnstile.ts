import { onUnmounted, ref } from 'vue'

const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

interface TurnstileRenderOptions {
  sitekey: string
  callback: (token: string) => void
  'expired-callback'?: () => void
  'error-callback'?: () => void
}

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

  // Set when the component unmounts while `render()` is still awaiting the
  // script, so the late resolution does not render into a detached container.
  let cancelled = false

  async function render(container: string | HTMLElement, sitekey: string) {
    if (import.meta.server) return
    if (!sitekey) return

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
      callback: (t: string) => {
        token.value = t
      },
      'expired-callback': () => {
        token.value = ''
      },
      'error-callback': () => {
        token.value = ''
      },
    })
  }

  function reset() {
    if (import.meta.server) return
    token.value = ''
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
    render,
    reset,
    remove,
  }
}
