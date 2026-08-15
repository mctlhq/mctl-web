<script setup lang="ts">
useHead({
  title: 'MCTL Docs — Platform Documentation',
  meta: [
    { name: 'description', content: 'Everything you need to understand, evaluate, and start using mctl. Self-service Kubernetes platform with GitOps, Vault, RBAC, and MCP tools.' },
    { property: 'og:title', content: 'MCTL Docs — Platform Documentation' },
    { property: 'og:description', content: 'Everything you need to understand, evaluate, and start using mctl. Self-service Kubernetes platform with GitOps, Vault, RBAC, and MCP tools.' },
    { property: 'og:url', content: 'https://mctl.ai/docs' },
  ],
})
</script>

<template>
  <!-- Hero -->
  <section class="docs-hero">
    <div class="docs-hero-glow"></div>
    <div class="container">
      <p class="section-tag">Documentation</p>
      <h1>Platform Documentation</h1>
      <p class="subtitle">Everything you need to understand, evaluate, and start using mctl</p>
    </div>
  </section>

  <!-- What is mctl? -->
  <section class="docs-section docs-section-default">
    <div class="container">
      <p class="section-tag">Overview</p>
      <h2 class="section-title">What is mctl?</h2>
      <div class="docs-text">
        <p>
          mctl is a self-service Kubernetes platform that automates the full delivery lifecycle
          for product teams. It combines GitOps (ArgoCD), secrets management (HashiCorp Vault),
          team isolation (RBAC, namespaces, network policies), and AI-native tooling (MCP server)
          into a single control plane.
        </p>
        <p>
          Instead of assembling and maintaining these pieces yourself, mctl provides them
          pre-integrated and production-ready. Teams get isolated workspaces, pick from a
          service catalog, and deploy via git push, a developer portal, REST API, or natural
          language through any MCP-compatible AI client.
        </p>
        <p>
          Everything is automated end-to-end: from namespace provisioning and RBAC setup to
          CI/CD pipelines, TLS certificates, database provisioning, and domain management.
          No kubectl, no manual YAML, no tickets.
        </p>
      </div>
    </div>
  </section>

  <!-- Who is it for? -->
  <section class="docs-section docs-section-alt">
    <div class="container">
      <p class="section-tag">Use Cases</p>
      <h2 class="section-title">Who is it for?</h2>
      <div class="audience-grid">
        <div v-reveal class="audience-card">
          <h3>Startups (5-50 engineers)</h3>
          <p>
            You have multiple teams shipping features but no dedicated DevOps hire.
            mctl gives every team its own isolated namespace with secrets, TLS, and CI/CD
            from day one — so engineers deploy themselves instead of waiting on infrastructure.
          </p>
        </div>
        <div v-reveal class="audience-card">
          <h3>B2B SaaS Companies</h3>
          <p>
            You need per-customer or per-environment isolation with consistent security
            and governance. mctl provisions tenants with their own namespaces, resource
            quotas, and network policies. Onboard a new customer environment in minutes, not days.
          </p>
        </div>
        <div v-reveal class="audience-card">
          <h3>Platform Teams</h3>
          <p>
            Already building an internal developer platform? mctl provides the foundation:
            GitOps engine, service catalog, secrets integration, and self-service workflows.
            Skip 6 months of integration work and build your customizations on top.
          </p>
        </div>
        <div v-reveal class="audience-card">
          <h3>AI-first Teams</h3>
          <p>
            You want infrastructure managed through natural language. mctl exposes
            20+ MCP tools that let Claude, Cursor, VS Code Copilot, or any MCP client
            deploy services, manage previews, provision databases, and monitor resources
            through conversation.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- How it works -->
  <section class="docs-section docs-section-default">
    <div class="container">
      <p class="section-tag">Architecture</p>
      <h2 class="section-title">How it works</h2>
      <div class="docs-diagram">
        <div class="diagram-box">
          <h4>Developer / AI</h4>
          <p>Portal, API, MCP</p>
        </div>
        <div class="diagram-connector">
          <div class="connector-line"></div>
          <div class="connector-arrow"></div>
        </div>
        <div class="diagram-box highlight-box">
          <h4>mctl-api</h4>
          <p>Control Plane</p>
          <div class="box-glow"></div>
        </div>
        <div class="diagram-connector">
          <div class="connector-line"></div>
          <div class="connector-arrow"></div>
        </div>
        <div class="diagram-box">
          <h4>Argo Workflows</h4>
          <p>Task Execution</p>
        </div>
        <div class="diagram-connector">
          <div class="connector-line"></div>
          <div class="connector-arrow"></div>
        </div>
        <div class="diagram-box">
          <h4>mctl-gitops</h4>
          <p>Source of Truth</p>
        </div>
        <div class="diagram-connector">
          <div class="connector-line"></div>
          <div class="connector-arrow"></div>
        </div>
        <div class="diagram-box">
          <h4>ArgoCD &rarr; K8s</h4>
          <p>Reconcile &amp; Deploy</p>
        </div>
      </div>
      <div class="docs-text">
        <p>
          Every action — whether triggered by a git push, a portal click, an API call,
          or an AI prompt — flows through mctl-api, which orchestrates Argo Workflows
          to make changes in the mctl-gitops repository. ArgoCD watches the repo and
          reconciles the cluster state. This means every change is a git commit, every
          deploy is traceable, and rollbacks are a one-line revert.
        </p>
      </div>
      <div class="agent-callout">
        <h4>mctl-agent: self-healing loop</h4>
        <p>
          A separate component watches the cluster for anomalies (crash loops, resource
          pressure, misconfiguration). When it detects an issue, it diagnoses the root
          cause using Claude API and opens a pull request to mctl-gitops with the fix.
          The change goes through the same GitOps pipeline — reviewed, merged, deployed.
        </p>
      </div>
    </div>
  </section>

  <!-- Platform components -->
  <section class="docs-section docs-section-alt">
    <div class="container">
      <p class="section-tag">Components</p>
      <h2 class="section-title">Platform components</h2>
      <div class="component-grid">
        <div v-reveal class="component-card">
          <span class="component-name">mctl-api</span>
          <h3>Control Plane</h3>
          <p>
            Go REST API and MCP server. Receives commands from the portal, CLI, AI clients,
            or direct HTTP calls. Authenticates via GitHub OAuth or Dex SSO. Routes operations
            to Argo Workflows for execution. Exposes 20+ MCP tools for AI-driven management.
          </p>
        </div>
        <div v-reveal class="component-card">
          <span class="component-name">mctl-gitops</span>
          <h3>Source of Truth</h3>
          <p>
            The GitOps repository. Contains Helm charts, ArgoCD application definitions,
            Kubernetes manifests, and tenant configurations. Every platform change is a git
            commit here. ArgoCD watches this repo and reconciles cluster state continuously.
          </p>
        </div>
        <div v-reveal class="component-card">
          <span class="component-name">mctl-portal</span>
          <h3>Developer Portal</h3>
          <p>
            Backstage-based developer portal. Provides a service catalog, software templates,
            deploy UI, and team management. Developers browse available templates, configure
            services, and track deployments through a web interface.
          </p>
        </div>
        <div v-reveal class="component-card">
          <span class="component-name">mctl-agent</span>
          <h3>Self-Healing</h3>
          <p>
            Watches the cluster for issues: crash loops, OOM kills, failed probes,
            resource exhaustion. Diagnoses problems using Claude API, then opens pull
            requests to mctl-gitops with targeted fixes. Humans review, merge, ArgoCD deploys.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Four ways to interact -->
  <section class="docs-section docs-section-default">
    <div class="container">
      <p class="section-tag">Interfaces</p>
      <h2 class="section-title">Four ways to interact</h2>
      <div class="interface-grid">
        <div v-reveal class="interface-card">
          <h3>Portal</h3>
          <span class="interface-url">app.mctl.ai</span>
          <p>
            Web UI built on Backstage. Browse the service catalog, create services from
            templates, view deploy history, manage team members, and check logs.
          </p>
        </div>
        <div v-reveal class="interface-card">
          <h3>AI / MCP</h3>
          <span class="interface-url">api.mctl.ai/mcp</span>
          <p>
            Natural language interface via MCP protocol. Connect Claude, Cursor, VS Code,
            Copilot, or any MCP client. Deploy, rollback, preview, provision databases —
            all through conversation.
          </p>
        </div>
        <div v-reveal class="interface-card">
          <h3>REST API</h3>
          <span class="interface-url">api.mctl.ai</span>
          <p>
            Direct HTTP access to every platform operation. Use from CI/CD pipelines,
            scripts, or custom tooling. Authenticate with GitHub token or Dex JWT.
          </p>
        </div>
        <div v-reveal class="interface-card">
          <h3>GitOps</h3>
          <span class="interface-url">push to repo</span>
          <p>
            Push code to your service repo. CI builds the image, updates the GitOps
            repo, and ArgoCD syncs to the cluster. Zero-touch delivery from commit to production.
          </p>
        </div>
      </div>
    </div>
  </section>

  <!-- Getting started -->
  <section class="docs-section docs-section-alt">
    <div class="container">
      <p class="section-tag">Quick Start</p>
      <h2 class="section-title">Getting started</h2>
      <div class="quickstart-grid">
        <div v-reveal class="workflow-step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3>Developer</h3>
            <p>
              Sign in with GitHub at mctl.ai. Pick a template from the service catalog.
              Configure your service (name, database, domain). Deploy — your namespace,
              CI/CD pipeline, and TLS certificate are provisioned automatically.
            </p>
          </div>
        </div>
        <div v-reveal class="workflow-step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3>
              Platform Operator
              <span class="component-name" style="font-size:0.7rem;vertical-align:middle;margin-left:0.4rem">admin</span>
            </h3>
            <p>
              Create a tenant via the API or portal. Assign namespaces, set resource quotas,
              configure network policies. Manage services and environments through the REST
              API or ArgoCD directly. Requires admin-level access.
            </p>
          </div>
        </div>
        <div v-reveal class="workflow-step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3>AI User</h3>
            <p>
              Go to <a href="https://docs.mctl.ai/mcp/connecting" style="color:var(--color-accent)">docs.mctl.ai/mcp/connecting</a>,
              sign in with GitHub and add MCTL to your AI client. Start prompting: "deploy my-app
              to staging", "show service status", "create a preview for PR #42".
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.docs-hero {
  padding: var(--section-py) 0 2.5rem;
  text-align: center;
  background: var(--color-bg-secondary);
  position: relative;
  overflow: hidden;
}

.docs-hero-glow {
  position: absolute;
  top: 30%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50vw;
  height: 50vw;
  background: radial-gradient(circle, color-mix(in srgb, var(--color-accent) 8%, transparent) 0%, transparent 70%);
  pointer-events: none;
}

.docs-hero h1 {
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
  margin-bottom: 1rem;
  position: relative;
}

.docs-hero .subtitle {
  font-size: 1.1rem;
  color: var(--color-text-muted);
  margin-bottom: 0;
  max-width: 580px;
  margin-left: auto;
  margin-right: auto;
}

.docs-section {
  padding: var(--section-py) 0;
}

.docs-section-alt {
  background: var(--color-bg-secondary);
}

.docs-section-default {
  background: var(--color-bg);
}

.docs-text {
  max-width: 760px;
  margin: 0 auto;
  color: var(--color-text-muted);
  font-size: 0.95rem;
  line-height: 1.8;
}

.docs-text p {
  margin-bottom: 1rem;
}

.component-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.component-card {
  background: var(--color-terminal);
  border: 1px solid var(--color-glass-border);
  padding: 2rem 1.5rem;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.component-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.4), 0 0 20px color-mix(in srgb, var(--color-accent) 10%, transparent);
}

.component-name {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 7%, transparent);
  padding: 0.35rem 0.65rem;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--color-accent) 10%, transparent);
  display: inline-block;
  margin-bottom: 0.75rem;
}

.component-card h3 {
  font-size: 1.1rem;
  color: #fff;
  margin-bottom: 0.75rem;
}

.component-card p {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-height: 1.7;
}

.interface-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
}

.interface-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-glass-border);
  padding: 2rem 1.5rem;
  border-radius: 12px;
  text-align: center;
  transition: all 0.3s ease;
}

.interface-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-4px);
  box-shadow: 0 15px 30px rgba(0,0,0,0.3);
}

.interface-card h3 {
  font-size: 1.1rem;
  color: #fff;
  margin-bottom: 0.5rem;
}

.interface-card .interface-url {
  font-size: 0.78rem;
  color: var(--color-accent);
  margin-bottom: 0.75rem;
  display: block;
}

.interface-card p {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-height: 1.6;
}

.docs-diagram {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.docs-diagram :deep(.diagram-box) {
  width: clamp(130px, 12vw, 180px);
  padding: 1.5rem 1rem;
}

.docs-diagram :deep(.diagram-box) h4 {
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.docs-diagram :deep(.diagram-box) p {
  font-size: 0.75rem;
}

.docs-diagram :deep(.diagram-connector) {
  flex: 0 0 auto;
  min-width: 24px;
  max-width: 50px;
}

.agent-callout {
  max-width: 760px;
  margin: 2rem auto 0;
  background: var(--color-terminal);
  border: 1px solid var(--color-glass-border);
  border-radius: 12px;
  padding: 1.5rem 2rem;
}

.agent-callout h4 {
  font-size: 1rem;
  color: #fff;
  margin-bottom: 0.5rem;
}

.agent-callout p {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  line-height: 1.7;
}

.quickstart-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.quickstart-grid :deep(.workflow-step) {
  flex-direction: column;
  text-align: center;
  padding: 2rem 1.5rem;
  margin-bottom: 0;
}

.quickstart-grid :deep(.step-content h3) {
  font-size: 1.25rem;
}

.quickstart-grid :deep(.step-content p) {
  margin-bottom: 0;
}

@media (max-width: 1100px) {
  .interface-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .docs-hero { padding: 7rem 0 2rem; }
  .docs-hero h1 { font-size: 2.2rem; }
  .docs-section { padding: 4rem 0; }
  .interface-grid { grid-template-columns: 1fr; }
  .quickstart-grid { grid-template-columns: 1fr; }
  .docs-diagram { flex-direction: column; }
  .docs-diagram :deep(.diagram-connector) {
    transform: rotate(90deg);
    height: 24px;
    min-width: auto;
    max-width: none;
    width: 2px;
  }
  .docs-diagram :deep(.diagram-box) {
    width: 100%;
    max-width: 240px;
  }
  .agent-callout { padding: 1.25rem 1.5rem; }
}

@media (max-width: 380px) {
  .docs-hero { padding: 6rem 0 1.5rem; }
  .component-card { padding: 1.5rem 1rem; }
}
</style>
