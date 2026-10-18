<script setup lang="ts">
useHead({
  title: 'Privacy Policy — MCTL',
  meta: [
    { name: 'description', content: 'Privacy Policy for the MCTL platform. Learn what data we collect, how we use it, and how to request deletion.' },
    { property: 'og:title', content: 'Privacy Policy — MCTL' },
    { property: 'og:url', content: 'https://mctl.ai/privacy/' },
  ],
})
</script>

<template>
  <section class="privacy-hero">
    <div class="container">
      <p class="section-tag">Legal</p>
      <h1>Privacy Policy</h1>
      <p class="subtitle">Effective date: October 18, 2026</p>
    </div>
  </section>

  <section class="privacy-section">
    <div class="container">
      <div class="privacy-content">

        <h2>1. Overview</h2>
        <p>
          MCTL ("we", "our", "us") operates the mctl.ai platform (the "Service"). This policy explains
          what data we collect, why we collect it, how we use and protect it, and your rights over it.
          By using the Service you agree to this policy.
        </p>
        <p>
          Questions or data requests: <a href="mailto:privacy@mctl.ai">privacy@mctl.ai</a>
        </p>

        <h2>2. Data We Collect</h2>

        <h3>2.1 GitHub OAuth</h3>
        <p>
          When you authenticate via GitHub OAuth we receive:
        </p>
        <ul>
          <li>GitHub username and user ID</li>
          <li>Display name and avatar URL (public profile)</li>
          <li>Email address (<code>user:email</code> scope): your primary verified address, or your public profile email if none is verified</li>
        </ul>
        <p>
          We do not request access to your repositories, organizations, or any code.
          The OAuth scopes used are <code>read:user</code> and <code>user:email</code>.
        </p>

        <h3>2.2 Platform Activity</h3>
        <p>
          While you use the Service we record:
        </p>
        <ul>
          <li>Operations triggered through the API or MCP connector (deploy, scale, rollback, etc.)</li>
          <li>Workflow execution results and status</li>
          <li>API request timestamps and HTTP status codes (for security and debugging)</li>
        </ul>
        <p>We do not record the content of your source code or environment variable values.</p>

        <h3>2.3 Sessions and Tokens</h3>
        <p>
          OAuth access tokens issued by the API and MCP connector are short-lived
          (1 hour by default). Refresh tokens are valid for up to 30 days; the server
          keeps only a hash of each refresh token, so it can rotate and revoke them.
          Your MCP client or the <code>mctl</code> CLI stores the tokens it receives.
        </p>
        <p>
          The developer portal (app.mctl.ai) keeps a server-side session, referenced by a cookie
          in your browser. On this website, the GitHub profile you sign in with (username, name,
          email and avatar) is kept in your browser's <code>localStorage</code> for up to 8 hours
          so you can finish the workspace request.
        </p>

        <h3>2.4 Invitation Requests</h3>
        <p>
          When you request an invitation, we save your name, contact email, optional GitHub
          username and project description to review your request and reply to you. These
          details are provided by you, not verified through GitHub. A request does not create
          an account or workspace and does not grant access.
        </p>
        <p>
          Saved requests expire from our request store after 90 days. A copy is sent to our
          private Telegram review channel; those messages follow the channel's retention
          settings and are not automatically removed by expiry in the request store.
          Contact privacy@mctl.ai to request removal of your request and its notification copy.
        </p>

        <h3>2.5 Website Analytics</h3>
        <p>
          To learn how many people visit mctl.ai and where they come from, this website loads
          Umami, an open-source analytics tool that we host ourselves at stats.mctl.ai. No
          analytics data is sent to a third party. Umami sets no cookies. For each page view it
          records the page address (including campaign parameters such as
          <code>utm_source</code>), the referring site, browser, operating system, device type,
          screen size, language, and country, region and city derived from your IP address.
          Your IP address and user agent are used to compute an anonymous visitor identifier;
          the IP address itself is not stored.
        </p>

        <h2>3. How We Use Your Data</h2>
        <ul>
          <li><strong>Authentication</strong> — verifying your identity on every API request</li>
          <li><strong>Authorization</strong> — resolving your team memberships and scoping access to the correct Kubernetes namespaces</li>
          <li><strong>Audit logging</strong> — maintaining an immutable record of platform operations for security and compliance</li>
          <li><strong>Debugging</strong> — diagnosing failures in workflows and deployments</li>
        </ul>
        <p>We do not sell your data to third parties. We do not use your data for advertising.</p>

        <h2>4. Data Retention</h2>
        <ul>
          <li><strong>Access tokens</strong> — 1 hour by default; not stored server-side after validation</li>
          <li><strong>Refresh tokens</strong> — up to 30 days; stored server-side as a hash until they expire or are revoked</li>
          <li><strong>Audit logs</strong> — retained for 90 days, then automatically purged</li>
          <li><strong>Website analytics</strong> — page-view records without IP addresses; kept on our servers with no automatic expiry</li>
          <li><strong>Profile data</strong> (username, email) — retained while your account is active; deleted within 30 days of an account deletion request</li>
        </ul>

        <h2>5. Third-Party Services</h2>
        <p>
          Users who already have a platform account sign in to the portal and mctl-api
          through ZITADEL (auth.mctl.ai), which we host ourselves; it is not a separate
          processor. Requesting a workspace on this website uses GitHub OAuth, described
          in section 2.1. The following organizations process data
          on our behalf or as independent platforms we rely on:
        </p>
        <ul>
          <li>
            <strong>GitHub</strong> — OAuth identity provider, git hosting, and
            GitHub Actions. Your use of GitHub is governed by
            <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">GitHub's Privacy Statement</a>.
          </li>
          <li>
            <strong>Hetzner Cloud</strong> — compute, volumes, and network in
            Frankfurt. Platform and tenant workloads at rest run here. See
            <a href="https://www.hetzner.com/legal/privacy-policy/" target="_blank" rel="noopener">Hetzner's Privacy Policy</a>.
          </li>
          <li>
            <strong>Cloudflare</strong> — DNS, CDN, Workers (landing OAuth), and
            R2 object storage (backups, logs, Terraform state). Cloudflare may
            log IP addresses and request metadata. See
            <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener">Cloudflare's Privacy Policy</a>.
          </li>
          <li>
            <strong>Anthropic Claude</strong> — when you connect the mctl MCP connector in Claude.ai,
            Anthropic's platform processes your tool invocations. See
            <a href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener">Anthropic's Privacy Policy</a>.
          </li>
          <li>
            <strong>Let's Encrypt</strong> — public TLS certificates for platform
            hostnames via cert-manager. See
            <a href="https://letsencrypt.org/privacy/" target="_blank" rel="noopener">Let's Encrypt Privacy Policy</a>.
          </li>
          <li>
            <strong>Resend</strong> — transactional welcome email after a tenant
            workspace is provisioned (name, email, team). See
            <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener">Resend's Privacy Policy</a>.
          </li>
          <li>
            <strong>Telegram</strong> — operator incident paging, and landing-form
            notifications: tenant requests (GitHub identity, email, team, use
            case) and contact-form messages (name, email, message). See
            <a href="https://telegram.org/privacy" target="_blank" rel="noopener">Telegram's Privacy Policy</a>.
          </li>
        </ul>

        <h2>6. Security</h2>
        <p>
          All data in transit is encrypted with TLS 1.2+. OAuth tokens are validated server-side
          on every request and are never logged. Kubernetes secrets are managed by HashiCorp Vault
          with audit logging enabled. Access is restricted by Kubernetes RBAC and network policies
          to the team's own namespace.
        </p>

        <h2>7. Your Rights</h2>
        <p>You may at any time:</p>
        <ul>
          <li><strong>Access</strong> — request a copy of your stored profile data</li>
          <li><strong>Correction</strong> — request correction of inaccurate data</li>
          <li><strong>Deletion</strong> — request deletion of your account and associated data</li>
          <li><strong>Revocation</strong> — revoke the GitHub OAuth grant at any time via GitHub &rarr; Settings &rarr; Applications &rarr; Authorized OAuth Apps &rarr; Revoke</li>
        </ul>
        <p>
          Send requests to <a href="mailto:privacy@mctl.ai">privacy@mctl.ai</a>.
          We will respond within 30 days.
        </p>

        <h2>8. Changes to This Policy</h2>
        <p>
          We may update this policy from time to time. Material changes will be announced via the
          platform changelog. Continued use of the Service after changes take effect constitutes
          acceptance of the updated policy.
        </p>

        <h2>9. Contact</h2>
        <p>
          For privacy-related inquiries: <a href="mailto:privacy@mctl.ai">privacy@mctl.ai</a>
        </p>

      </div>
    </div>
  </section>
</template>

<style scoped>
.privacy-hero {
  padding: 6rem 0 2.5rem;
  text-align: center;
  background: var(--color-bg);
  position: relative;
}

.privacy-hero h1 {
  font-size: var(--text-prose-title-size, 32px);
  font-weight: var(--text-prose-title-weight, 800);
  line-height: var(--text-prose-title-leading, 1.25);
  letter-spacing: var(--text-prose-title-tracking, -0.02em);
  margin: 0.5rem 0;
  color: var(--color-text);
}

.privacy-hero .subtitle {
  color: var(--color-text-muted);
  font-size: var(--text-small-size, 14px);
  margin-top: 0.5rem;
}

.privacy-section {
  padding: 2rem 0 5rem;
}

.privacy-content {
  max-width: 720px;
  margin: 0 auto;
  color: var(--color-text-muted);
  font-size: var(--text-prose-size, 16px);
  line-height: var(--text-prose-leading, 1.75);
}

.privacy-content h2 {
  font-size: var(--mctl-typography-font-size-xl, 20px);
  font-weight: var(--mctl-typography-font-weight-semibold, 600);
  color: var(--color-text);
  margin: 2.5rem 0 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-glass-border);
}

.privacy-content h3 {
  font-size: var(--text-body-size, 16px);
  font-weight: var(--mctl-typography-font-weight-semibold, 600);
  color: var(--color-text);
  margin: 1.5rem 0 0.5rem;
}

.privacy-content p {
  margin: 0.75rem 0;
  font-size: var(--text-small-size, 14px);
}

.privacy-content ul {
  list-style: disc;
  margin: 0.75rem 0 0.75rem 1.25rem;
  font-size: var(--text-small-size, 14px);
}

.privacy-content li {
  margin-bottom: 0.4rem;
}

.privacy-content a {
  color: var(--color-accent);
  text-decoration: none;
}

.privacy-content a:hover {
  text-decoration: underline;
}

.privacy-content code {
  font-family: var(--font-mono, 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace);
  font-size: 0.82em;
  background: var(--color-bg-secondary);
  padding: 0.1em 0.35em;
  border-radius: 3px;
  color: var(--color-text-muted);
}
</style>
