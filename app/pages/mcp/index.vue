<script setup lang="ts">
useHead({
  title: 'mctl Connector — Add MCTL to Claude',
  meta: [
    { name: 'description', content: 'Add MCTL to Claude as a connector. Connect your Kubernetes platform tools directly in Claude via a remote MCP server. No local install required.' },
    { property: 'og:title', content: 'mctl Connector — Add MCTL to Claude' },
    { property: 'og:description', content: 'Add MCTL to Claude as a connector. Connect your platform tools directly in Claude via a remote MCP server. No local install required.' },
    { property: 'og:url', content: 'https://mctl.ai/mcp' },
  ],
})

const MCP_ENDPOINT = 'https://api.mctl.ai/mcp'
const TOKEN_PLACEHOLDER = 'YOUR_GITHUB_TOKEN'
const AUTH_KEY = 'mctl_auth'
const AUTH_TTL = 8 * 60 * 60 * 1000

interface StoredAuth {
  token?: string
  login?: string
  name?: string
  avatar_url?: string
  sig?: string
  html_url?: string
  exp: number
}

function loadStorage(): StoredAuth | null {
  try {
    const d = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null') as StoredAuth | null
    if (!d || Date.now() > d.exp) { localStorage.removeItem(AUTH_KEY); return null }
    return d
  } catch { return null }
}

function saveStorage(data: Partial<StoredAuth>) {
  try {
    const cur = loadStorage() || ({} as Partial<StoredAuth>)
    localStorage.setItem(AUTH_KEY, JSON.stringify({ ...cur, ...data, exp: Date.now() + AUTH_TTL }))
  } catch {}
}

function clearStorage() {
  try { localStorage.removeItem(AUTH_KEY) } catch {}
}

// Auth state
const mcpToken = ref('')
const mcpLogin = ref('')
const mcpName = ref('')
const mcpAvatarUrl = ref('')
const authError = ref('')
const manualTokenInput = ref('')
const isAuthenticated = computed(() => !!mcpToken.value)
const maskedToken = computed(() => mcpToken.value
  ? mcpToken.value.slice(0, 8) + '••••••••••' + mcpToken.value.slice(-4)
  : '')

// Tab state
const activeTab = ref('claude')

// Copy states
const copied = ref<Record<string, boolean>>({})

async function copy(key: string, text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  copied.value[key] = true
  setTimeout(() => { copied.value[key] = false }, 1800)
}

// Config templates
const configToken = computed(() => mcpToken.value || TOKEN_PLACEHOLDER)

const configs = computed(() => {
  const t = configToken.value
  return {
    claude: JSON.stringify({
      mcpServers: { mctl: { type: 'http', url: MCP_ENDPOINT, headers: { Authorization: 'Bearer ' + t } } }
    }, null, 2),

    cursor: JSON.stringify({
      mcpServers: { mctl: { type: 'http', url: MCP_ENDPOINT, headers: { Authorization: 'Bearer ' + t } } }
    }, null, 2),

    vscode: t === TOKEN_PLACEHOLDER
      ? JSON.stringify({
          servers: { mctl: { type: 'http', url: MCP_ENDPOINT, headers: { Authorization: 'Bearer ${input:mctlToken}' } } },
          inputs: [{ id: 'mctlToken', type: 'promptString', description: 'GitHub token — run: gh auth token', password: true }]
        }, null, 2)
      : JSON.stringify({
          servers: { mctl: { type: 'http', url: MCP_ENDPOINT, headers: { Authorization: 'Bearer ' + t } } }
        }, null, 2),

    windsurf: JSON.stringify({
      mcpServers: { mctl: { type: 'http', url: MCP_ENDPOINT, headers: { Authorization: 'Bearer ' + t } } }
    }, null, 2),

    gemini: JSON.stringify({
      mcpServers: { mctl: { httpUrl: MCP_ENDPOINT, headers: { Authorization: 'Bearer ' + t }, trust: true } }
    }, null, 2),

    copilot: JSON.stringify({
      mcpServers: { mctl: { type: 'http', url: MCP_ENDPOINT, headers: { Authorization: 'Bearer ' + t } } }
    }, null, 2),

    other: [
      '# Streamable HTTP transport (MCP spec 2024-11-05)',
      '# Single endpoint — POST to call tools, GET to open stream',
      '',
      'endpoint:   ' + MCP_ENDPOINT,
      'transport:  streamable-http',
      'auth:       Authorization: Bearer ' + t,
      '',
      '# Example: initialize',
      'POST ' + MCP_ENDPOINT,
      'Authorization: Bearer ' + t,
      'Content-Type: application/json',
      '',
      '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"my-client","version":"1.0"}},"id":1}',
    ].join('\n'),
  }
})

function setAuth(token: string, login: string, name: string, avatarUrl: string) {
  mcpToken.value = token
  mcpLogin.value = login
  mcpName.value = name || login
  mcpAvatarUrl.value = avatarUrl || ''
  saveStorage({ token, login, name: mcpName.value, avatar_url: avatarUrl || '' })
}

function signOut() {
  mcpToken.value = ''
  mcpLogin.value = ''
  mcpName.value = ''
  mcpAvatarUrl.value = ''
  manualTokenInput.value = ''
  clearStorage()
}

function applyManualToken() {
  const token = manualTokenInput.value.trim()
  if (!token) return
  mcpToken.value = token
  mcpLogin.value = ''
  mcpName.value = ''
  mcpAvatarUrl.value = ''
  saveStorage({ token })
}

const AUTH_ERROR_MSGS: Record<string, string> = {
  ACCESS_DENIED: 'GitHub access denied. Please try again.',
  INVALID_STATE: 'Auth state mismatch. Please try again.',
  TOKEN_EXCHANGE: 'Failed to exchange GitHub token. Please try again.',
  PROFILE_FETCH: 'Failed to fetch GitHub profile. Please try again.',
}

onMounted(() => {
  const hash = window.location.hash

  if (hash.startsWith('#auth_error=')) {
    const code = hash.slice(12)
    authError.value = AUTH_ERROR_MSGS[code] || 'GitHub auth failed. Please try again.'
    history.replaceState(null, '', location.pathname)
    return
  }

  if (hash.startsWith('#auth=')) {
    const encoded = hash.slice(6)
    try {
      const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
      const data = JSON.parse(atob(base64))
      if (data.token) {
        if (data.sig) saveStorage({ sig: data.sig, html_url: data.html_url || '' })
        setAuth(data.token, data.login || '', data.name || '', data.avatar_url || '')
      }
    } catch {
      authError.value = 'Failed to parse auth response. Please try again.'
    }
    history.replaceState(null, '', location.pathname)
  } else {
    const saved = loadStorage()
    if (saved?.token) {
      setAuth(saved.token, saved.login || '', saved.name || '', saved.avatar_url || '')
    }
  }
})
</script>

<template>
  <!-- Hero -->
  <section class="mcp-hero">
    <div class="mcp-hero-glow"></div>
    <div class="container">
      <p class="section-tag">Claude Connector</p>
      <h1>Add <span class="logo-m">M</span>CTL to Claude</h1>
      <p class="subtitle">Connect your platform tools directly in Claude via a remote MCP server. No local install required.</p>
      <div class="hero-ctas">
        <a href="#connector" class="btn btn-primary">Add to Claude →</a>
        <a href="#advanced" class="btn btn-outline">Advanced MCP setup</a>
      </div>
    </div>
  </section>

  <!-- Connector: Recommended Setup -->
  <section id="connector" class="connector-section">
    <div class="container">
      <div class="connector-card">
        <div class="connector-badge">Recommended</div>
        <h2>Claude.ai custom connector</h2>
        <p class="connector-subtitle">The easiest way to use MCTL in Claude. No binary, no config file, no token management — just sign in with GitHub.</p>

        <div class="connector-steps-list">
          <div class="connector-step">
            <div class="connector-step-num">1</div>
            <div class="connector-step-text">
              Open <strong>Claude.ai</strong> &rarr; Settings &rarr; <strong>Connectors</strong> &rarr; <strong>Add custom connector</strong>
            </div>
          </div>
          <div class="connector-step">
            <div class="connector-step-num">2</div>
            <div class="connector-step-text">Paste the values below and leave <strong>Client Secret</strong> empty</div>
          </div>
          <div class="connector-step">
            <div class="connector-step-num">3</div>
            <div class="connector-step-text">
              Click <strong>Connect</strong> — you'll be redirected to GitHub to sign in, then returned to Claude automatically
            </div>
          </div>
        </div>

        <div class="connector-values">
          <div class="connector-value-row">
            <span class="connector-value-label">Connector URL</span>
            <span class="connector-value-text">{{ MCP_ENDPOINT }}</span>
            <button class="connector-copy-btn" :class="{ copied: copied['cv-url'] }" @click="copy('cv-url', MCP_ENDPOINT)">
              {{ copied['cv-url'] ? 'copied!' : 'copy' }}
            </button>
          </div>
          <div class="connector-value-row">
            <span class="connector-value-label">OAuth Client ID</span>
            <span class="connector-value-text">mctl-connector</span>
            <button class="connector-copy-btn" :class="{ copied: copied['cv-clientid'] }" @click="copy('cv-clientid', 'mctl-connector')">
              {{ copied['cv-clientid'] ? 'copied!' : 'copy' }}
            </button>
          </div>
          <div class="connector-value-row">
            <span class="connector-value-label">Client Secret</span>
            <span class="connector-value-text muted">Leave empty</span>
          </div>
        </div>

        <div class="connector-auth-note">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1a4 4 0 0 1 4 4v1h1a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h1V5a4 4 0 0 1 4-4zm0 1.5A2.5 2.5 0 0 0 5.5 5v1h5V5A2.5 2.5 0 0 0 8 2.5z" fill="#3fb950" />
          </svg>
          Auth: <strong>GitHub sign-in via OAuth / PKCE</strong> — no password or token needed
        </div>

        <p style="font-size:0.78rem;color:var(--color-text-muted);line-height:1.55">
          Access requires membership in a team workspace. Not added yet?
          <a href="/#request-access" style="color:var(--color-accent)">Request access</a> from your platform admin.
        </p>
      </div>
    </div>
  </section>

  <!-- Benefits: What you get -->
  <section class="benefits-section">
    <div class="container">
      <p class="section-tag">What you get</p>
      <h2 class="section-title">Platform tools, inside Claude</h2>
      <div class="workflow-steps">
        <div class="workflow-step">
          <div class="benefit-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><line x1="17" y1="17" x2="22" y2="22" />
            </svg>
          </div>
          <div class="step-content">
            <h3>Inspect platform state</h3>
            <p>Query services, tenants, resource usage, logs, and workflow status — all via natural language.</p>
          </div>
        </div>
        <div class="workflow-step">
          <div class="benefit-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" aria-hidden="true">
              <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
          </div>
          <div class="step-content">
            <h3>Deploy and manage apps</h3>
            <p>Onboard, deploy, rollback, and preview services. Create team workspaces and provision databases.</p>
          </div>
        </div>
        <div class="workflow-step">
          <div class="benefit-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <div class="step-content">
            <h3>Manage domains and scaling</h3>
            <p>Add custom domains with auto-TLS, configure autoscaling, and verify DNS — without touching the CLI.</p>
          </div>
        </div>
        <div class="workflow-step">
          <div class="benefit-icon-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" aria-hidden="true">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <div class="step-content">
            <h3>Full audit trail</h3>
            <p>Every operation creates a git commit. Full traceable chain from "Claude was asked" to "pods running".</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Advanced: Developer MCP clients -->
  <section id="advanced" class="advanced-section">
    <div class="container">
      <div class="advanced-header">
        <div class="advanced-badge">Advanced</div>
        <h2>Developer MCP clients</h2>
        <p>For Cursor, VS Code, Claude Desktop, and other MCP-compatible tools. Requires a GitHub token for authentication.</p>
      </div>
    </div>

    <!-- Connect: Auth + Config Tabs -->
    <div class="connect-section">
      <div class="container">
        <div class="connect-grid">

          <!-- Left: Auth card -->
          <div>
            <div class="auth-card">
              <h3>Get your token</h3>
              <p>Authenticate with GitHub to get a pre-filled config for your developer client.</p>
              <p class="auth-hint" style="margin-bottom:1rem">
                Access requires membership in a team workspace.<br>
                Not added yet? <a href="/#request-access" style="color:var(--color-accent)">Request access</a> from your platform admin.
              </p>

              <!-- Unauthenticated state -->
              <template v-if="!isAuthenticated">
                <a href="/api/github/login?for=mcp" class="btn btn-github btn-block">
                  <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                  </svg>
                  Get your token
                </a>

                <p class="auth-hint" style="margin-top:0.75rem;font-size:0.72rem;line-height:1.5;color:var(--color-text-muted)">
                  Permissions requested: <strong style="color:var(--color-text-secondary)">read your username and avatar</strong> (<code>read:user</code>) and
                  <strong style="color:var(--color-text-secondary)">verified email</strong> (<code>user:email</code>).<br>
                  No access to your code, repositories, or organizations.
                  See our <NuxtLink to="/privacy" style="color:var(--color-accent)">Privacy Policy</NuxtLink>.
                </p>

                <div class="auth-divider">or</div>

                <div class="token-input-row">
                  <input
                    v-model="manualTokenInput"
                    class="token-input"
                    type="password"
                    placeholder="ghp_... or gho_... token"
                    autocomplete="off"
                    spellcheck="false"
                    @keydown.enter="applyManualToken"
                  >
                  <button class="btn-apply" @click="applyManualToken">Apply</button>
                </div>
                <p class="auth-hint" style="margin-top:0.6rem">
                  Get via CLI: <code>gh auth token</code>
                </p>
              </template>

              <!-- Authenticated state -->
              <template v-else>
                <div v-if="mcpLogin" class="user-profile">
                  <img v-if="mcpAvatarUrl" class="user-avatar" :src="mcpAvatarUrl" alt="">
                  <div class="user-info">
                    <div class="user-login">@{{ mcpLogin }}</div>
                    <div v-if="mcpName !== mcpLogin" class="user-name">{{ mcpName }}</div>
                  </div>
                  <button class="btn-signout" title="Sign out" @click="signOut">&times;</button>
                </div>
                <div v-else class="user-profile" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem">
                  <span class="auth-hint">Token applied</span>
                  <button class="btn-signout" title="Sign out" @click="signOut">&times;</button>
                </div>

                <div class="token-row">
                  <span class="token-label">token</span>
                  <span class="token-value">{{ maskedToken }}</span>
                  <button
                    class="btn-copy-token"
                    :class="{ copied: copied['token'] }"
                    @click="copy('token', mcpToken)"
                  >{{ copied['token'] ? 'copied!' : 'copy' }}</button>
                </div>

                <div class="auth-hint">
                  Token is validated server-side on every request.<br>
                  Access scoped to your team memberships.
                </div>
              </template>

              <div v-if="authError" class="auth-error">{{ authError }}</div>
            </div>
          </div>

          <!-- Right: Config Tabs -->
          <div>
            <div class="config-panel">
              <div class="client-tabs-nav" role="tablist">
                <button
                  v-for="tab in ['claude', 'claude-ai', 'cursor', 'vscode', 'windsurf', 'gemini', 'copilot', 'other']"
                  :key="tab"
                  class="client-tab-btn"
                  :class="{ active: activeTab === tab }"
                  role="tab"
                  @click="activeTab = tab"
                >
                  {{ { claude: 'Claude Desktop', 'claude-ai': 'Claude.ai', cursor: 'Cursor', vscode: 'VS Code', windsurf: 'Windsurf', gemini: 'Gemini CLI', copilot: 'Copilot CLI', other: 'Other' }[tab] }}
                </button>
              </div>

              <!-- Claude Desktop -->
              <div v-show="activeTab === 'claude'" class="client-tab-content active">
                <div class="config-path">
                  Add to <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>
                </div>
                <div class="code-block-wrapper">
                  <pre class="code-block-mcp">{{ configs.claude }}</pre>
                  <button class="copy-config-btn" :class="{ copied: copied['cfg-claude'] }" @click="copy('cfg-claude', configs.claude)">
                    {{ copied['cfg-claude'] ? 'copied!' : 'copy' }}
                  </button>
                </div>
                <p class="config-note">Restart Claude Desktop after saving. It will connect and expose 30 platform tools.</p>
              </div>

              <!-- Claude.ai -->
              <div v-show="activeTab === 'claude-ai'" class="client-tab-content">
                <div class="claude-ai-tab-note">
                  &uarr; For Claude.ai, use the <a href="#connector">recommended connector setup</a> above — it's faster and requires no token.
                </div>
                <div class="config-path">
                  <strong>Claude.ai &rarr; Settings &rarr; Connectors &rarr; Add custom connector</strong>
                </div>
                <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px;">
                  <div class="token-row">
                    <span class="token-label">Remote MCP server URL</span>
                    <span class="token-value" style="font-family:monospace">https://api.mctl.ai/mcp</span>
                  </div>
                  <div class="token-row">
                    <span class="token-label">OAuth Client ID</span>
                    <span class="token-value" style="font-family:monospace">mctl-connector</span>
                  </div>
                  <div class="token-row">
                    <span class="token-label">OAuth Client Secret</span>
                    <span class="token-value" style="color:var(--color-text-muted)">(leave empty — PKCE)</span>
                  </div>
                </div>
                <p class="config-note" style="margin-top:16px;">
                  After adding, Claude.ai will redirect you to GitHub to authorize. You'll be returned to Claude automatically. Access is scoped to your team workspaces.
                </p>
              </div>

              <!-- Cursor -->
              <div v-show="activeTab === 'cursor'" class="client-tab-content">
                <div class="config-path">
                  Cursor Settings <span style="color:var(--color-text-muted)">&rarr;</span> MCP <span style="color:var(--color-text-muted)">&rarr;</span> Add server
                </div>
                <div class="code-block-wrapper">
                  <pre class="code-block-mcp">{{ configs.cursor }}</pre>
                  <button class="copy-config-btn" :class="{ copied: copied['cfg-cursor'] }" @click="copy('cfg-cursor', configs.cursor)">
                    {{ copied['cfg-cursor'] ? 'copied!' : 'copy' }}
                  </button>
                </div>
                <p class="config-note">Cursor will pick up the server on next restart.</p>
              </div>

              <!-- VS Code -->
              <div v-show="activeTab === 'vscode'" class="client-tab-content">
                <div class="config-path">
                  Create <code>.vscode/mcp.json</code> in your project root
                </div>
                <div class="code-block-wrapper">
                  <pre class="code-block-mcp">{{ configs.vscode }}</pre>
                  <button class="copy-config-btn" :class="{ copied: copied['cfg-vscode'] }" @click="copy('cfg-vscode', configs.vscode)">
                    {{ copied['cfg-vscode'] ? 'copied!' : 'copy' }}
                  </button>
                </div>
                <p class="config-note">
                  Requires VS Code &ge; 1.99 with the GitHub Copilot Chat extension. VS Code will prompt for the token on first use.
                </p>
              </div>

              <!-- Windsurf -->
              <div v-show="activeTab === 'windsurf'" class="client-tab-content">
                <div class="config-path">
                  Windsurf Settings <span style="color:var(--color-text-muted)">&rarr;</span> MCP Servers <span style="color:var(--color-text-muted)">&rarr;</span> Add
                </div>
                <div class="code-block-wrapper">
                  <pre class="code-block-mcp">{{ configs.windsurf }}</pre>
                  <button class="copy-config-btn" :class="{ copied: copied['cfg-windsurf'] }" @click="copy('cfg-windsurf', configs.windsurf)">
                    {{ copied['cfg-windsurf'] ? 'copied!' : 'copy' }}
                  </button>
                </div>
              </div>

              <!-- Gemini CLI -->
              <div v-show="activeTab === 'gemini'" class="client-tab-content">
                <div class="config-path">
                  Add to <code>~/.gemini/settings.json</code>
                </div>
                <div class="code-block-wrapper">
                  <pre class="code-block-mcp">{{ configs.gemini }}</pre>
                  <button class="copy-config-btn" :class="{ copied: copied['cfg-gemini'] }" @click="copy('cfg-gemini', configs.gemini)">
                    {{ copied['cfg-gemini'] ? 'copied!' : 'copy' }}
                  </button>
                </div>
              </div>

              <!-- Copilot CLI -->
              <div v-show="activeTab === 'copilot'" class="client-tab-content">
                <div class="config-path">
                  Add to <code>~/.config/github-copilot/mcp.json</code>
                </div>
                <div class="code-block-wrapper">
                  <pre class="code-block-mcp">{{ configs.copilot }}</pre>
                  <button class="copy-config-btn" :class="{ copied: copied['cfg-copilot'] }" @click="copy('cfg-copilot', configs.copilot)">
                    {{ copied['cfg-copilot'] ? 'copied!' : 'copy' }}
                  </button>
                </div>
                <p class="config-note">
                  Requires <code>gh copilot</code> extension. Run <code>gh extension install github/gh-copilot</code> if not installed. Restart the CLI after saving.
                </p>
              </div>

              <!-- Other / Generic -->
              <div v-show="activeTab === 'other'" class="client-tab-content">
                <div class="config-path">Generic MCP client connection details</div>
                <div class="code-block-wrapper">
                  <pre class="code-block-mcp">{{ configs.other }}</pre>
                  <button class="copy-config-btn" :class="{ copied: copied['cfg-other'] }" @click="copy('cfg-other', configs.other)">
                    {{ copied['cfg-other'] ? 'copied!' : 'copy' }}
                  </button>
                </div>
                <p class="config-note">
                  Transport: <strong style="color:#fff">Streamable HTTP</strong> (MCP spec 2024-11-05).<br>
                  Send the <code>Authorization</code> header on every request.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Available Tools -->
  <section class="tools-section">
    <div class="container">
      <p class="section-tag">Available Tools</p>
      <h2 class="section-title">30 platform tools</h2>
      <div class="tools-scroll">
      <table class="tools-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Tool</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          <!-- Read tools (16) -->
          <tr><td><span class="tool-badge read">read</span></td><td class="tool-name">mctl_whoami</td><td class="tool-desc">Check identity, team memberships, admin status</td></tr>
          <tr><td><span class="tool-badge read">read</span></td><td class="tool-name">mctl_list_tenants</td><td class="tool-desc">List all team workspaces with quotas</td></tr>
          <tr><td><span class="tool-badge read">read</span></td><td class="tool-name">mctl_get_tenant</td><td class="tool-desc">Get details for a specific tenant</td></tr>
          <tr><td><span class="tool-badge read">read</span></td><td class="tool-name">mctl_list_services</td><td class="tool-desc">List services, optional team filter</td></tr>
          <tr><td><span class="tool-badge read">read</span></td><td class="tool-name">mctl_get_service_status</td><td class="tool-desc">ArgoCD health + sync state</td></tr>
          <tr><td><span class="tool-badge read">read</span></td><td class="tool-name">mctl_get_service_config</td><td class="tool-desc">Current image tag, host, env vars</td></tr>
          <tr><td><span class="tool-badge read">read</span></td><td class="tool-name">mctl_get_service_logs</td><td class="tool-desc">Fetch service logs from Loki</td></tr>
          <tr><td><span class="tool-badge read">read</span></td><td class="tool-name">mctl_get_resource_usage</td><td class="tool-desc">Live CPU/memory/pods from K8s ResourceQuota</td></tr>
          <tr><td><span class="tool-badge read">read</span></td><td class="tool-name">mctl_get_workflow_status</td><td class="tool-desc">Status and logs of Argo Workflow run</td></tr>
          <tr><td><span class="tool-badge read">read</span></td><td class="tool-name">mctl_list_workflows</td><td class="tool-desc">List recent Argo Workflow runs for a team</td></tr>
          <tr><td><span class="tool-badge read">read</span></td><td class="tool-name">mctl_list_recent_operations</td><td class="tool-desc">Recent platform operations from audit log</td></tr>
          <tr><td><span class="tool-badge read">read</span></td><td class="tool-name">mctl_list_repos</td><td class="tool-desc">List GitHub repos available to a team</td></tr>
          <tr><td><span class="tool-badge read">read</span></td><td class="tool-name">mctl_list_previews</td><td class="tool-desc">List active preview environments for a team</td></tr>
          <tr><td><span class="tool-badge read">read</span></td><td class="tool-name">mctl_list_domains</td><td class="tool-desc">List custom domains for a service</td></tr>
          <tr><td><span class="tool-badge read">read</span></td><td class="tool-name">mctl_verify_domain</td><td class="tool-desc">Check DNS + TLS status of custom domain</td></tr>
          <tr><td><span class="tool-badge read">read</span></td><td class="tool-name">mctl_list_operations</td><td class="tool-desc">List all available platform operations</td></tr>
          <tr><td><span class="tool-badge read">read</span></td><td class="tool-name">mctl_get_operation</td><td class="tool-desc">Get detailed schema of a specific operation</td></tr>
          <!-- Write tools (11) -->
          <tr><td><span class="tool-badge write">write</span></td><td class="tool-name">mctl_deploy_service</td><td class="tool-desc">Onboard, deploy, or update-config a service</td></tr>
          <tr><td><span class="tool-badge write">write</span></td><td class="tool-name">mctl_create_tenant</td><td class="tool-desc">Create workspace with namespace, quotas, Vault</td></tr>
          <tr><td><span class="tool-badge write">write</span></td><td class="tool-name">mctl_provision_database</td><td class="tool-desc">PostgreSQL on shared CNPG cluster</td></tr>
          <tr><td><span class="tool-badge write">write</span></td><td class="tool-name">mctl_rollback_service</td><td class="tool-desc">Roll back to a previous image tag</td></tr>
          <tr><td><span class="tool-badge write">write</span></td><td class="tool-name">mctl_scale_service</td><td class="tool-desc">Configure HPA autoscaling for a service</td></tr>
          <tr><td><span class="tool-badge write">write</span></td><td class="tool-name">mctl_create_preview</td><td class="tool-desc">Deploy ephemeral preview environment</td></tr>
          <tr><td><span class="tool-badge write">write</span></td><td class="tool-name">mctl_delete_preview</td><td class="tool-desc">Remove preview environment</td></tr>
          <tr><td><span class="tool-badge write">write</span></td><td class="tool-name">mctl_add_custom_domain</td><td class="tool-desc">Add custom domain with auto-TLS</td></tr>
          <tr><td><span class="tool-badge write">write</span></td><td class="tool-name">mctl_remove_custom_domain</td><td class="tool-desc">Remove custom domain</td></tr>
          <tr><td><span class="tool-badge write">write</span></td><td class="tool-name">mctl_sync_repos</td><td class="tool-desc">Discover and register GitHub repos for a team</td></tr>
          <tr><td><span class="tool-badge write">write</span></td><td class="tool-name">mctl_grant_repo_access</td><td class="tool-desc">Generate GitHub App install URL for repo access</td></tr>
          <!-- Destructive tools (2) -->
          <tr><td><span class="tool-badge destructive">destructive</span></td><td class="tool-name">mctl_retire_service</td><td class="tool-desc">Remove service from cluster</td></tr>
          <tr><td><span class="tool-badge destructive">destructive</span></td><td class="tool-name">mctl_delete_tenant</td><td class="tool-desc">Delete workspace (requires all services retired)</td></tr>
        </tbody>
      </table>
      </div>
      <p style="font-size:0.8rem;color:var(--color-text-muted);margin-top:1.5rem;text-align:center">
        Read tools return immediately with no side effects. Write tools submit Argo Workflows — use
        <span style="color:var(--color-accent)">mctl_get_workflow_status</span> to follow progress.
        <span style="color:var(--color-error)">Destructive</span> tools require explicit confirmation.
      </p>
    </div>
  </section>

  <!-- Auth / Security -->
  <section class="auth-section how-it-works">
    <div class="container">
      <p class="section-tag">Auth &amp; Security</p>
      <h2 class="section-title">How access works</h2>
      <div class="workflow-steps">
        <div class="workflow-step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3>Token validated per request</h3>
            <p>Your GitHub token is checked against the GitHub API on every MCP call. It's never stored by the server.</p>
          </div>
        </div>
        <div class="workflow-arrow">&darr;</div>
        <div class="workflow-step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3>Team-scoped access</h3>
            <p>Access is limited to the workspaces your GitHub login belongs to, resolved from team memberships in the GitOps repo. Admins can operate on all tenants.</p>
          </div>
        </div>
        <div class="workflow-arrow">&darr;</div>
        <div class="workflow-step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3>Full audit trail</h3>
            <p>Every write operation is an Argo Workflow, which produces a git commit. Who did what, when, and why — all in version control.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Usage Examples -->
  <section class="examples-section">
    <div class="container">
      <p class="section-tag">Examples</p>
      <h2 class="section-title">What you can ask</h2>
      <p class="section-sub">Real prompts you can type in Claude once the connector is active.</p>
      <div class="examples-grid">
        <div class="example-card">
          <div class="example-number">01</div>
          <h3>Check service health</h3>
          <div class="example-prompt">"Show me the status of all services in the payments team"</div>
          <div class="example-result">
            <strong>What happens:</strong> Claude calls <code>mctl_list_services</code> and <code>mctl_get_service_status</code>
            to list every service in the <code>team-payments</code> namespace with replica counts, image versions, and health status.
          </div>
        </div>
        <div class="example-card">
          <div class="example-number">02</div>
          <h3>Deploy a new version</h3>
          <div class="example-prompt">"Deploy checkout-api version 2.4.1 to staging"</div>
          <div class="example-result">
            <strong>What happens:</strong> Claude calls <code>mctl_deploy_service</code> which submits an Argo Workflow.
            The workflow commits the new image tag to the GitOps repo, ArgoCD syncs, and Claude reports back with the
            operation status and a link to the workflow run.
          </div>
        </div>
        <div class="example-card">
          <div class="example-number">03</div>
          <h3>Investigate an incident</h3>
          <div class="example-prompt">"Get the last 200 lines of logs from order-service and check recent workflows"</div>
          <div class="example-result">
            <strong>What happens:</strong> Claude calls <code>mctl_get_service_logs</code> to fetch logs from Loki and
            <code>mctl_list_workflows</code> to find recent workflow runs. It correlates timestamps and surfaces errors,
            helping you find the root cause without leaving the chat.
          </div>
        </div>
        <div class="example-card">
          <div class="example-number">04</div>
          <h3>Create a preview environment</h3>
          <div class="example-prompt">"Create a preview of invoice-api from branch feat/pdf-export"</div>
          <div class="example-result">
            <strong>What happens:</strong> Claude calls <code>mctl_create_preview</code> which deploys an ephemeral copy
            of the service in your team's namespace as a separate Helm release. Returns the preview URL
            (<code>{app}-{id}.preview.mctl.ai</code>) so you can share it with your team for review. Clean up with <code>mctl_delete_preview</code>.
          </div>
        </div>
        <div class="example-card">
          <div class="example-number">05</div>
          <h3>Scale and check resources</h3>
          <div class="example-prompt">"Scale notification-service to 5 replicas and show me current resource usage for the platform team"</div>
          <div class="example-result">
            <strong>What happens:</strong> Claude calls <code>mctl_scale_service</code> to update the replica count, then
            <code>mctl_get_resource_usage</code> to show CPU and memory usage across all services in the namespace.
            You see the scaling operation result and a resource summary in one response.
          </div>
        </div>
        <div class="example-card">
          <div class="example-number">06</div>
          <h3>Manage custom domains</h3>
          <div class="example-prompt">"Add custom domain api.example.com to gateway-service and verify TLS"</div>
          <div class="example-result">
            <strong>What happens:</strong> Claude calls <code>mctl_add_custom_domain</code> to update the Ingress and 
            <code>mctl_verify_domain</code> to check DNS propagation and Certificate status.
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Support -->
  <section class="support-section">
    <div class="container">
      <p class="section-tag">Support</p>
      <h2 class="section-title">Need help?</h2>
      <div class="support-grid">
        <div class="support-card">
          <h3>Email support</h3>
          <p>Questions about setup, access, or your account.</p>
          <a href="mailto:support@mctl.ai">support@mctl.ai</a>
        </div>
        <div class="support-card">
          <h3>Privacy</h3>
          <p>Data requests, deletion, or privacy questions.</p>
          <a href="mailto:privacy@mctl.ai">privacy@mctl.ai</a>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section class="faq-section">
    <div class="container">
      <p class="section-tag">FAQ</p>
      <h2 class="section-title">Common questions</h2>
      <div class="faq-list">
        <div class="faq-item">
          <div class="faq-q">What can the AI do?</div>
          <div class="faq-a">Read platform state (services, tenants, resource usage, workflow logs, service logs) and trigger operations: deploy services, rollback, create preview environments, manage custom domains, provision databases, and configure auto-scaling. 30 tools, all via natural language.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">What can it NOT do?</div>
          <div class="faq-a">No direct <code>kubectl</code>, no Vault secret reads, no raw cluster access. The AI operates through a controlled set of tools with a defined scope. Destructive operations (retire service, delete workspace) are exposed but clearly marked and require explicit confirmation.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">Where do write operations actually go?</div>
          <div class="faq-a">Write operations submit Argo Workflows. Each workflow produces a git commit to the GitOps repo. ArgoCD picks up the commit and syncs the cluster. Full traceable chain from "AI was asked" to "pods running".</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">How does auth work for the Claude.ai connector?</div>
          <div class="faq-a">When you add the connector in Claude.ai, it redirects you to GitHub's OAuth page. You authorize the mctl app with <code>read:user</code> and <code>user:email</code> scopes. GitHub returns you to Claude automatically — no token copying, no config files. Your access is scoped to your team workspaces.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">Do I need to install anything?</div>
          <div class="faq-a">No. For Claude.ai, add the connector in Settings — no binary, no config file required. For developer clients (Cursor, VS Code, etc.), add the MCP server config pointing to <code>https://api.mctl.ai/mcp</code> with a GitHub token.</div>
        </div>
        <div class="faq-item">
          <div class="faq-q">What GitHub token scope is needed?</div>
          <div class="faq-a">The OAuth flow requests <code>read:user</code> and <code>user:email</code> — enough to identify your GitHub login. Team access is resolved from workspace memberships in the GitOps repo, not from GitHub org data. If you use <code>gh auth token</code> directly, it works too.</div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mcp-hero {
  padding: var(--section-py) 0 2.5rem;
  text-align: center;
  background: var(--color-bg-secondary);
  position: relative;
  overflow: hidden;
}

.mcp-hero-glow {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50vw;
  height: 50vw;
  background: radial-gradient(circle, rgba(0,245,255,0.08) 0%, transparent 70%);
  pointer-events: none;
}

.mcp-hero h1 {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
  margin-bottom: 1rem;
  position: relative;
}

.mcp-hero .subtitle {
  font-size: 1.1rem;
  color: var(--color-text-muted);
  margin-bottom: 1.5rem;
  max-width: 540px;
  margin-left: auto;
  margin-right: auto;
}

.hero-ctas {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 2rem;
}

/* Connector section */
.connector-section {
  padding: 3rem 0 2.5rem;
  background: var(--color-bg);
}

.connector-card {
  max-width: 720px;
  margin: 0 auto;
  background: var(--color-terminal);
  border: 1px solid rgba(0,245,255,0.25);
  border-radius: 16px;
  padding: 2rem 2.25rem;
  box-shadow: 0 0 60px rgba(0,245,255,0.05);
}

.connector-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.8rem;
  background: rgba(0,245,255,0.1);
  border: 1px solid rgba(0,245,255,0.3);
  border-radius: 20px;
  font-size: 0.72rem;
  color: var(--color-accent);
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  margin-bottom: 1.25rem;
}

.connector-card h2 {
  font-size: clamp(1.25rem, 3vw, 1.65rem);
  color: #fff;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.connector-card .connector-subtitle {
  font-size: 0.88rem;
  color: var(--color-text-muted);
  margin-bottom: 1.75rem;
  line-height: 1.6;
}

.connector-steps-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin-bottom: 1.75rem;
}

.connector-step {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
}

.connector-step-num {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(0,245,255,0.08);
  border: 1px solid rgba(0,245,255,0.25);
  color: var(--color-accent);
  font-size: 0.78rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.connector-step-text {
  font-size: 0.88rem;
  color: var(--color-text-muted);
  line-height: 1.55;
}

.connector-step-text strong { color: #fff; }

.connector-values {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.connector-value-row {
  display: flex;
  align-items: center;
  background: var(--color-bg);
  border: 1px solid var(--color-glass-border);
  border-radius: 8px;
  overflow: hidden;
}

.connector-value-label {
  padding: 0.65rem 1rem;
  font-size: 0.72rem;
  color: var(--color-text-muted);
  min-width: 148px;
  flex-shrink: 0;
  border-right: 1px solid var(--color-glass-border);
  letter-spacing: 0.2px;
}

.connector-value-text {
  padding: 0.65rem 1rem;
  font-size: 0.875rem;
  color: var(--color-accent);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.connector-value-text.muted {
  color: var(--color-text-muted);
  font-style: italic;
  font-size: 0.82rem;
}

.connector-copy-btn {
  padding: 0.65rem 0.9rem;
  background: rgba(0,245,255,0.06);
  border: none;
  border-left: 1px solid var(--color-glass-border);
  color: var(--color-text-muted);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  transition: all 0.15s;
  white-space: nowrap;
}

.connector-copy-btn:hover { background: rgba(0,245,255,0.15); color: var(--color-accent); }
.connector-copy-btn.copied { color: var(--color-success); }

.connector-auth-note {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 1rem;
  background: rgba(63,185,80,0.06);
  border: 1px solid rgba(63,185,80,0.18);
  border-radius: 8px;
  font-size: 0.82rem;
  color: var(--color-text-muted);
  margin-bottom: 1rem;
  line-height: 1.4;
}

.connector-auth-note strong { color: #3fb950; }

/* Benefits section */
.benefits-section {
  padding: 2.5rem 0 3rem;
  background: var(--color-bg-secondary);
}

.benefit-icon-wrap {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  background: var(--color-accent);
  color: var(--color-bg);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(0, 245, 255, 0.3);
}

/* Advanced section */
.advanced-section {
  background: var(--color-bg);
}

.connect-section {
  background: var(--color-bg);
  padding: 0 0 2.5rem;
}

.connect-grid {
  display: grid;
  grid-template-columns: minmax(280px, 340px) 1fr;
  gap: 2rem;
  align-items: start;
}

.advanced-header {
  text-align: center;
  padding: 3rem 0 2rem;
}

.advanced-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.8rem;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 20px;
  font-size: 0.72rem;
  color: var(--color-text-muted);
  font-weight: 600;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
}

.advanced-header h2 {
  font-size: clamp(1.35rem, 3vw, 1.9rem);
  color: #fff;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.advanced-header p {
  font-size: 0.88rem;
  color: var(--color-text-muted);
  max-width: 520px;
  margin: 0 auto;
  line-height: 1.6;
}

/* Auth card */
.auth-card {
  background: var(--color-terminal);
  border: 1px solid var(--color-glass-border);
  border-radius: 12px;
  padding: 1.75rem;
}

.auth-card h3 {
  font-size: 0.95rem;
  color: #fff;
  margin-bottom: 0.5rem;
}

.auth-card p {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 1.25rem 0;
  color: var(--color-text-muted);
  font-size: 0.75rem;

  &::before, &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--color-glass-border);
  }
}

.token-input-row {
  display: flex;
  gap: 0.5rem;
}

.token-input {
  flex: 1;
  background: var(--color-bg);
  border: 1px solid var(--color-glass-border);
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  outline: none;
  transition: border-color 0.15s;

  &:focus { border-color: var(--color-accent); }
  &::placeholder { color: var(--color-text-muted); opacity: 0.6; }
}

.btn-apply {
  padding: 0.6rem 0.9rem;
  background: transparent;
  border: 1px solid var(--color-accent);
  border-radius: 6px;
  color: var(--color-accent);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover { background: rgba(0,245,255,0.1); }
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--color-glass-border);
}

.user-info { flex: 1; min-width: 0; }

.user-login {
  font-size: 0.875rem;
  color: #fff;
  font-weight: 600;
}

.user-name {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.btn-signout {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  padding: 4px;
  border-radius: 4px;
  transition: color 0.15s;

  &:hover { color: var(--color-error); }
}

.token-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-bg);
  border: 1px solid var(--color-glass-border);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  margin-bottom: 1.25rem;
}

.token-label {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.token-value {
  flex: 1;
  font-size: 0.78rem;
  color: var(--color-accent);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-copy-token {
  background: none;
  border: 1px solid var(--color-glass-border);
  color: var(--color-text-muted);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 0.72rem;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover { border-color: var(--color-accent); color: var(--color-accent); }
  &.copied { color: var(--color-success); border-color: var(--color-success); }
}

.auth-hint {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.5;

  code {
    color: var(--color-accent);
    background: rgba(0,245,255,0.08);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 0.72rem;
  }
}

.auth-error {
  font-size: 0.8rem;
  color: var(--color-error);
  margin-top: 0.75rem;
}

/* Config panel */
.config-panel {
  background: var(--color-terminal);
  border: 1px solid var(--color-glass-border);
  border-radius: 12px;
  overflow: hidden;
  max-width: 100%;
}

.client-tabs-nav {
  display: flex;
  border-bottom: 1px solid var(--color-glass-border);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.client-tab-btn {
  padding: 0.75rem 1.1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  margin-bottom: -1px;

  &:hover { color: var(--color-text); }
  &.active { color: var(--color-accent); border-bottom-color: var(--color-accent); }
}

.client-tab-content {
  padding: 1.5rem;
  max-width: 100%;
  overflow: hidden;
}

.config-path {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 100%;

  code {
    color: var(--color-text);
    background: rgba(255,255,255,0.05);
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 0.72rem;
  }
}

.code-block-wrapper {
  position: relative;
  max-width: 100%;
  overflow: hidden;
}

.code-block-mcp {
  background: var(--color-bg);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 8px;
  padding: 1rem 1.1rem;
  font-family: var(--font-mono);
  font-size: 0.82rem;
  color: var(--color-text);
  line-height: 1.6;
  white-space: pre;
  overflow-x: auto;
  margin: 0;
  max-width: 100%;
}

.copy-config-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.3rem 0.6rem;
  background: rgba(0,245,255,0.08);
  border: 1px solid var(--color-glass-border);
  border-radius: 5px;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { background: rgba(0,245,255,0.15); color: var(--color-accent); }
  &.copied { color: var(--color-success); border-color: var(--color-success); }
}

.config-note {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 0.75rem;
  line-height: 1.5;

  a { color: var(--color-accent); text-decoration: none; }
  a:hover { text-decoration: underline; }

  code {
    color: var(--color-accent);
    background: rgba(0,245,255,0.08);
    padding: 1px 5px;
    border-radius: 3px;
  }
}

.claude-ai-tab-note {
  background: rgba(0,245,255,0.05);
  border: 1px solid rgba(0,245,255,0.15);
  border-radius: 6px;
  padding: 0.6rem 0.9rem;
  font-size: 0.78rem;
  color: var(--color-text-muted);
  margin-bottom: 1rem;

  a { color: var(--color-accent); text-decoration: none; }
  a:hover { text-decoration: underline; }
}

/* Tools section */
.tools-section {
  padding: 2.5rem 0 3rem;
  background: var(--color-bg);
  overflow: hidden;
}

.tools-section .section-title { margin-bottom: 2rem; }

.tools-table {
  width: 100%;
  border-collapse: collapse;
}

.tools-table th {
  text-align: left;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: var(--color-text-muted);
  padding: 0.5rem 1rem 0.75rem;
  border-bottom: 1px solid var(--color-glass-border);
}

.tools-table td {
  padding: 0.875rem 1rem;
  font-size: 0.85rem;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  vertical-align: top;
}

.tools-table tr:last-child td { border-bottom: none; }
.tools-table tr:hover td { background: rgba(255,255,255,0.02); }

.tool-name {
  color: var(--color-accent);
  font-weight: 500;
  white-space: nowrap;
}

.tool-desc { color: var(--color-text-muted); }

.tool-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  white-space: nowrap;

  &.read {
    background: rgba(63,185,80,0.12);
    color: var(--color-success);
    border: 1px solid rgba(63,185,80,0.25);
  }

  &.write {
    background: rgba(0,245,255,0.08);
    color: var(--color-accent);
    border: 1px solid rgba(0,245,255,0.2);
  }

  &.destructive {
    background: rgba(248,81,73,0.1);
    color: var(--color-error);
    border: 1px solid rgba(248,81,73,0.25);
  }
}

/* Auth/Security section */
.auth-section {
  padding: 2.5rem 0 3rem;
  background: var(--color-bg-secondary);
}

.auth-section .section-title { margin-bottom: 2rem; }

/* FAQ section */
.faq-section {
  padding: 2.5rem 0 3rem;
  background: var(--color-bg);
}

.faq-section .section-title { margin-bottom: 2rem; }

.faq-list {
  max-width: 720px;
  margin: 0 auto;
}

.faq-item {
  border-bottom: 1px solid var(--color-glass-border);
  padding: 0.875rem 0;

  &:first-child { border-top: 1px solid var(--color-glass-border); }
}

.faq-q {
  font-size: 0.9rem;
  color: #fff;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.faq-a {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  line-height: 1.6;

  code {
    color: var(--color-accent);
    background: rgba(0,245,255,0.08);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 0.78rem;
  }
}

/* Responsive */
@media (max-width: 900px) {
  .connect-grid { grid-template-columns: 1fr; }
  .advanced-header { padding: 2rem 0 1.5rem; }
  .connect-grid > div:first-child { order: 2; }
  .connect-grid > div:last-child { order: 1; }
}

@media (max-width: 640px) {
  .connector-card { padding: 1.25rem 1.125rem; }
  .connector-value-row { flex-wrap: wrap; }
  .connector-value-label {
    min-width: 0;
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--color-glass-border);
    padding: 0.5rem 0.875rem 0.4rem;
  }
  .connector-value-text { padding: 0.5rem 0.875rem; }
  .connector-copy-btn {
    border-left: none;
    border-top: 1px solid var(--color-glass-border);
    width: 100%;
    text-align: center;
  }
  .benefit-icon-wrap { width: 46px; height: 46px; }
  .benefit-icon-wrap svg { width: 20px; height: 20px; }
  .advanced-section { overflow-x: hidden; }
  .advanced-header { padding: 1.5rem 0 1.25rem; }
  /* Tabs: allow horizontal scroll, slightly smaller */
  .client-tabs-nav { scrollbar-width: none; }
  .client-tabs-nav::-webkit-scrollbar { display: none; }
  .client-tab-btn { padding: 0.6rem 0.65rem; font-size: 0.7rem; letter-spacing: 0; }
  .client-tab-content { padding: 0.875rem; }
  .code-block-mcp { font-size: 0.72rem; padding: 0.75rem 0.875rem; }
  .config-path { font-size: 0.68rem; }
  .copy-config-btn { font-size: 0.65rem; padding: 0.25rem 0.5rem; }
  .auth-card { padding: 1.25rem; }
  .connect-section { padding: 0 0 2rem; }
  /* Advanced header compact */
  .advanced-header h2 { font-size: 1.35rem; }
  .advanced-header p { font-size: 0.82rem; }
}

/* Tools table — scrollable on mobile */
.tools-scroll {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 8px;
}

@media (max-width: 600px) {
  .tools-table th:first-child,
  .tools-table td:first-child { display: none; }
  .tool-name { white-space: normal; word-break: break-all; font-size: 0.78rem; }
  .tool-desc { font-size: 0.78rem; }
  .tools-table td { padding: 0.625rem 0.75rem; }
  .tools-table th { padding: 0.5rem 0.75rem 0.625rem; }
}

/* --- Examples --- */
.examples-section {
  padding: var(--section-py) 0;
  background: var(--color-bg);
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.example-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-glass-border);
  border-radius: 12px;
  padding: 1.5rem;
}

.example-number {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-accent);
  margin-bottom: 0.5rem;
  font-family: 'JetBrains Mono', monospace;
}

.example-card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 0.75rem;
}

.example-prompt {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  color: var(--color-accent);
  background: rgba(0, 245, 255, 0.05);
  border: 1px solid rgba(0, 245, 255, 0.15);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 0.75rem;
  font-style: italic;
}

.example-result {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-height: 1.6;
}

.example-result strong {
  color: var(--color-text);
}

.example-result code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8em;
  background: rgba(0, 245, 255, 0.08);
  padding: 0.1em 0.35em;
  border-radius: 3px;
  color: var(--color-accent);
}

/* --- Support --- */
.support-section {
  padding: var(--section-py) 0;
  background: var(--color-bg-secondary);
}

.support-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
  margin-top: 2rem;
}

.support-card {
  background: var(--color-bg);
  border: 1px solid var(--color-glass-border);
  border-radius: 12px;
  padding: 1.5rem;
}

.support-card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 0.5rem;
}

.support-card p {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin: 0 0 0.75rem;
  line-height: 1.5;
}

.support-card a {
  color: var(--color-accent);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
}

.support-card a:hover {
  text-decoration: underline;
}

@media (max-width: 768px) {
  .mcp-hero { padding: 5rem 0 2rem; }
  .examples-grid { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .hero-ctas .btn { width: 100%; justify-content: center; }
}
</style>
