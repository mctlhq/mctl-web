import { ref } from 'vue'

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

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Turnstile script'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

export function useTurnstile() {
  const token = ref('')
  const widgetId = ref<string | null>(null)

  async function render(container: string | HTMLElement, sitekey: string) {
    if (import.meta.server) return
    if (!sitekey) return

    await loadTurnstileScript()
    if (!window.turnstile) return

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

  return {
    token,
    render,
    reset,
  }
}
