<script setup lang="ts">
useHead({
  title: 'Privacy Policy — MCTL',
  meta: [
    { name: 'description', content: 'Privacy Policy for the MCTL platform. Learn what data we collect, how we use it, and how to request deletion.' },
    { property: 'og:title', content: 'Privacy Policy — MCTL' },
    { property: 'og:url', content: 'https://mctl.ai/privacy' },
  ],
})
</script>

<template>
  <section class="privacy-hero">
    <div class="container">
      <p class="section-tag">Legal</p>
      <h1>Privacy Policy</h1>
      <p class="subtitle">Effective date: August 24, 2026</p>
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
          <li>Primary verified email address (<code>user:email</code> scope)</li>
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

        <h3>2.3 Session Tokens</h3>
        <p>
          OAuth access tokens issued by the Service are short-lived (1-hour TTL).
          Tokens are stored in your browser's <code>localStorage</code> or <code>sessionStorage</code>
          and are never persisted server-side beyond the duration of the request.
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
          <li><strong>Access tokens</strong> — 1-hour TTL; not stored server-side after token validation</li>
          <li><strong>Audit logs</strong> — retained for 90 days, then automatically purged</li>
          <li><strong>Profile data</strong> (username, email) — retained while your account is active; deleted within 30 days of an account deletion request</li>
        </ul>

        <h2>5. Third-Party Services</h2>
        <p>
          GitHub sign-in is brokered by Dex, which we host in-cluster. Dex is
          not a separate processor. The following organizations process data
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
            <strong>Telegram</strong> — operator incident paging only. This is not
            a customer messaging product. See
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
  font-size: clamp(2rem, 5vw, 3rem);
  font-weight: 700;
  margin: 0.5rem 0;
  color: var(--color-text);
}

.privacy-hero .subtitle {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.privacy-section {
  padding: 2rem 0 5rem;
}

.privacy-content {
  max-width: 720px;
  margin: 0 auto;
  color: var(--color-text-muted);
  line-height: 1.75;
}

.privacy-content h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 2.5rem 0 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-glass-border);
}

.privacy-content h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 1.5rem 0 0.5rem;
}

.privacy-content p {
  margin: 0.75rem 0;
  font-size: 0.9rem;
}

.privacy-content ul {
  list-style: disc;
  margin: 0.75rem 0 0.75rem 1.25rem;
  font-size: 0.9rem;
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
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82em;
  background: var(--color-bg-secondary);
  padding: 0.1em 0.35em;
  border-radius: 3px;
  color: var(--color-text-muted);
}
</style>
