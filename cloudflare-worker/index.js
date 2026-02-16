/**
 * Cloudflare Worker for mctl.me landing page
 * - GitHub OAuth (login + callback)
 * - Team availability check via GitHub API
 * - Auto-create team + invite user + Telegram notification
 *
 * Environment variables (set via wrangler secret):
 * - TELEGRAM_BOT_TOKEN: Telegram bot token
 * - TELEGRAM_CHAT_ID: Telegram chat ID
 * - GITHUB_CLIENT_ID: GitHub OAuth App client ID
 * - GITHUB_CLIENT_SECRET: GitHub OAuth App client secret
 * - GITHUB_OAUTH_HMAC_KEY: random 32+ char string for signing
 * - GITHUB_ORG_TOKEN: PAT with admin:org scope for team management
 */

const ALLOWED_ORIGIN = 'https://platform.mctl.me';
const LANDING_URL = 'https://platform.mctl.me';
const CALLBACK_URL = 'https://platform.mctl.me/api/github/callback';
const GITHUB_ORG = 'dmitriimashkov';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // GitHub OAuth: initiate login
    if (request.method === 'GET' && path === '/api/github/login') {
      return handleGitHubLogin(env);
    }

    // GitHub OAuth: callback
    if (request.method === 'GET' && path === '/api/github/callback') {
      return handleGitHubCallback(url, request, env);
    }

    // Check team availability
    if (request.method === 'GET' && path === '/api/github/check-team') {
      return handleCheckTeam(url, env);
    }

    // Form submission
    if (request.method === 'POST' && path === '/api/submit') {
      return handleFormSubmit(request, env);
    }

    return new Response('Not Found', { status: 404 });
  }
};

// ─── CORS ────────────────────────────────────────────────────────────────────

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json', ...extraHeaders },
  });
}

// ─── GitHub API helper ───────────────────────────────────────────────────────

function githubAPI(path, token, options = {}) {
  return fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'mctl-landing',
      'Accept': 'application/vnd.github+json',
      ...(options.headers || {}),
    },
  });
}

// ─── HMAC helpers ────────────────────────────────────────────────────────────

async function hmacSign(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacVerify(data, signature, secret) {
  const expected = await hmacSign(data, secret);
  return expected === signature;
}

// ─── GitHub OAuth: Login ─────────────────────────────────────────────────────

async function handleGitHubLogin(env) {
  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  const stateSig = await hmacSign(state, env.GITHUB_OAUTH_HMAC_KEY);

  const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
  githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  githubAuthUrl.searchParams.set('redirect_uri', CALLBACK_URL);
  githubAuthUrl.searchParams.set('scope', 'read:user user:email');
  githubAuthUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      'Location': githubAuthUrl.toString(),
      'Set-Cookie': `__gh_state=${state}.${stateSig}; HttpOnly; Secure; SameSite=Lax; Max-Age=300; Path=/`,
    },
  });
}

// ─── GitHub OAuth: Callback ──────────────────────────────────────────────────

async function handleGitHubCallback(url, request, env) {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) return redirectWithError('ACCESS_DENIED');
  if (!code || !state) return redirectWithError('MISSING_PARAMS');

  // Validate state from cookie
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const stateCookie = cookies['__gh_state'];
  if (!stateCookie) return redirectWithError('INVALID_STATE');

  const [cookieState, cookieSig] = stateCookie.split('.');
  if (cookieState !== state || !await hmacVerify(cookieState, cookieSig, env.GITHUB_OAUTH_HMAC_KEY)) {
    return redirectWithError('INVALID_STATE');
  }

  // Exchange code for access token
  let accessToken;
  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: CALLBACK_URL,
      }),
    });
    const tokenData = await tokenResponse.json();
    if (tokenData.error) return redirectWithError('TOKEN_EXCHANGE');
    accessToken = tokenData.access_token;
  } catch (e) {
    return redirectWithError('TOKEN_EXCHANGE');
  }

  // Fetch user profile and emails
  let user, emails;
  try {
    const [userRes, emailsRes] = await Promise.all([
      githubAPI('/user', accessToken),
      githubAPI('/user/emails', accessToken),
    ]);
    if (!userRes.ok || !emailsRes.ok) return redirectWithError('PROFILE_FETCH');
    user = await userRes.json();
    emails = await emailsRes.json();
  } catch (e) {
    return redirectWithError('PROFILE_FETCH');
  }

  const primaryEmail = emails.find(e => e.primary && e.verified);
  const email = primaryEmail ? primaryEmail.email : (user.email || '');
  const sig = await hmacSign(user.login, env.GITHUB_OAUTH_HMAC_KEY);

  const userData = {
    login: user.login,
    name: user.name || '',
    email,
    avatar_url: user.avatar_url || '',
    html_url: user.html_url || '',
    sig,
  };

  const encoded = btoa(JSON.stringify(userData))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return new Response(null, {
    status: 302,
    headers: {
      'Location': `${LANDING_URL}/#auth=${encoded}`,
      'Set-Cookie': '__gh_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/',
    },
  });
}

function redirectWithError(errorCode) {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': `${LANDING_URL}/#auth_error=${errorCode}`,
      'Set-Cookie': '__gh_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/',
    },
  });
}

function parseCookies(cookieHeader) {
  const cookies = {};
  cookieHeader.split(';').forEach(part => {
    const [key, ...rest] = part.trim().split('=');
    if (key) cookies[key.trim()] = rest.join('=').trim();
  });
  return cookies;
}

// ─── Check Team Availability ─────────────────────────────────────────────────

async function handleCheckTeam(url, env) {
  const name = url.searchParams.get('name');
  if (!name) {
    return jsonResponse({ error: 'Missing team name' }, 400);
  }

  const teamNameRegex = /^[a-z0-9][a-z0-9-]{0,62}$/;
  if (!teamNameRegex.test(name)) {
    return jsonResponse({ available: false, error: 'Invalid team name format' }, 400);
  }

  try {
    const res = await githubAPI(`/orgs/${GITHUB_ORG}/teams/${name}`, env.GITHUB_ORG_TOKEN);
    if (res.status === 404) {
      return jsonResponse({ available: true });
    }
    return jsonResponse({ available: false, message: 'Team already exists' });
  } catch (e) {
    console.error('Check team error:', e);
    return jsonResponse({ error: 'Failed to check team' }, 500);
  }
}

// ─── Form Submit ─────────────────────────────────────────────────────────────

async function handleFormSubmit(request, env) {
  try {
    const data = await request.json();
    const { github_auth, team, usecase } = data;

    // Validate GitHub auth
    if (!github_auth || !github_auth.login || !github_auth.sig) {
      return jsonResponse({ success: false, message: 'GitHub authentication required' }, 401);
    }

    const validSig = await hmacVerify(github_auth.login, github_auth.sig, env.GITHUB_OAUTH_HMAC_KEY);
    if (!validSig) {
      return jsonResponse({ success: false, message: 'Invalid authentication signature' }, 403);
    }

    const { login, name, email, avatar_url, html_url } = github_auth;

    if (!name || !email || !team) {
      return jsonResponse({ success: false, message: 'Missing required fields' }, 400);
    }

    const teamNameRegex = /^[a-z0-9][a-z0-9-]{0,62}$/;
    if (!teamNameRegex.test(team)) {
      return jsonResponse({ success: false, message: 'Invalid team name format' }, 400);
    }

    // ─── Create GitHub team ───
    let teamCreated = false;
    let teamError = null;
    try {
      const createRes = await githubAPI(`/orgs/${GITHUB_ORG}/teams`, env.GITHUB_ORG_TOKEN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: team,
          description: `mctl.me team. Backstage: https://backstage-preview.mctl.me/ | ArgoCD: https://argocd-preview.mctl.me/ | Access via GitHub SSO`,
          privacy: 'secret',
        }),
      });
      if (createRes.status === 201) {
        teamCreated = true;
      } else {
        const err = await createRes.json();
        teamError = err.message || `Status ${createRes.status}`;
      }
    } catch (e) {
      teamError = e.message;
    }

    // ─── Invite user to team ───
    let userInvited = false;
    let inviteError = null;
    if (teamCreated) {
      try {
        const inviteRes = await githubAPI(
          `/orgs/${GITHUB_ORG}/teams/${team}/memberships/${login}`,
          env.GITHUB_ORG_TOKEN,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'member' }),
          }
        );
        if (inviteRes.ok) {
          userInvited = true;
        } else {
          const err = await inviteRes.json();
          inviteError = err.message || `Status ${inviteRes.status}`;
        }
      } catch (e) {
        inviteError = e.message;
      }
    }

    // ─── Build Telegram message ───
    const teamStatus = teamCreated ? '✅ Created' : `❌ ${teamError}`;
    const inviteStatus = userInvited ? '✅ Invited' : (teamCreated ? `❌ ${inviteError}` : '⏭ Skipped');

    const msg = [
      `🚀 *mctl\\.me — New Access*`,
      ``,
      `👤 [@${esc(login)}](${esc(html_url)})`,
      `📧 ${esc(email)}`,
      `🏷 Team: \`${esc(team)}\` ${esc(teamStatus)}`,
      `👥 Membership: ${esc(inviteStatus)}`,
      usecase ? `📝 ${esc(usecase)}` : null,
      ``,
      `🔗 *Platform Access \\(via GitHub SSO\\):*`,
      `• [Backstage](https://backstage\\-preview\\.mctl\\.me/)`,
      `• [ArgoCD](https://argocd\\-preview\\.mctl\\.me/)`,
      ``,
      `⏰ ${new Date().toISOString().replace(/[-.]/g, '\\$&')}`,
    ].filter(Boolean).join('\n');

    // Send to Telegram
    const telegramUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: msg,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      }),
    });

    // Response to frontend
    if (teamCreated && userInvited) {
      return jsonResponse({
        success: true,
        message: `Team "${team}" created! Check your GitHub for an invitation.`,
      });
    } else if (teamCreated) {
      return jsonResponse({
        success: true,
        message: `Team "${team}" created, but invitation failed. Admin will follow up.`,
      });
    } else {
      return jsonResponse({
        success: false,
        message: `Failed to create team: ${teamError}`,
      }, 500);
    }

  } catch (error) {
    console.error('Error:', error);
    return jsonResponse({ success: false, message: 'Failed to submit request. Please try again.' }, 500);
  }
}

// ─── Telegram MarkdownV2 escaping ────────────────────────────────────────────

function esc(text) {
  if (!text) return '';
  return String(text).replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}
