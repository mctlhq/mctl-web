<script setup lang="ts">
const specs = [
  {
    num: '01',
    tag: 'infrastructure out of the box',
    title: 'Production-Ready Platform',
    body: 'Pre-integrated Kubernetes platform with Backstage, ArgoCD, Vault and cert-manager already wired together. Scale without rebuilding infrastructure from scratch.',
    chips: ['k3s · k8s', 'backstage', 'day-one prod'],
    chipAccent: [false, false, true],
  },
  {
    num: '02',
    tag: 'push to deploy',
    title: 'GitOps Delivery',
    body: 'Fully automated deployments. No manual kubectl. Every change flows through Git, ArgoCD reconciles the cluster, and code moves to production securely and predictably.',
    chips: ['argocd', 'github actions', 'zero kubectl'],
    chipAccent: [false, false, true],
  },
  {
    num: '03',
    tag: 'vault · certs · sso',
    title: 'Enterprise Security',
    body: 'Secrets in Vault, automatic TLS via cert-manager, GitHub SSO across the platform. Per-team RBAC, network policies and resource quotas — security on every layer.',
    chips: ['vault', 'cert-manager', 'github oidc'],
    chipAccent: [false, false, false],
  },
  {
    num: '04',
    tag: 'no tickets · no waiting',
    title: 'Self-Service Catalog',
    body: 'Pick from ready-made templates in the Backstage-powered Service Catalog. Provision services, databases and infra in minutes. Repos and configs generated for you.',
    chips: ['backstage', 'templates', 'catalog-info'],
    chipAccent: [false, false, false],
  },
  {
    num: '05',
    tag: '39 MCP tools · 7 AI clients',
    title: 'AI-Native Operations',
    body: 'Deploy, rollback, preview and monitor through natural language. Connect Claude, Cursor, VS Code or any MCP-compatible client — with the same audit trail your engineers use.',
    chips: ['mcp · 39', 'claude · cursor · vs code', 'audited'],
    chipAccent: [true, false, false],
  },
  {
    num: '06',
    tag: 'mctl-agent · alertmanager → pr',
    title: 'Self-Healing Agent',
    body: 'Automated incident response. The mctl-agent watches AlertManager, diagnoses the issue and opens a PR with the fix — often before you\'ve finished reading the page.',
    chips: ['on-call ai', 'alertmanager', 'gitops fix'],
    chipAccent: [true, false, false],
  },
]
</script>

<template>
  <section id="features" class="platform-section">
    <BaseContainer size="lg">
      <div class="platform-section__head">
        <p class="marker platform-section__marker">S/02 · Platform</p>
        <h2 class="platform-section__title">
          Everything your team needs to ship faster.
          <em>Six primitives, one control plane, zero glue code — and an AI that's already on call.</em>
        </h2>
      </div>

      <ul class="platform-section__grid">
        <li
          v-for="spec in specs"
          :key="spec.num"
          class="spec-card"
        >
          <div class="spec-card__head">
            <span class="spec-card__num marker">{{ spec.num }} / 06</span>
            <code class="spec-card__tag">{{ spec.tag }}</code>
          </div>
          <h3 class="spec-card__title">{{ spec.title }}</h3>
          <p class="spec-card__body">{{ spec.body }}</p>
          <div class="spec-card__chips">
            <span
              v-for="(chip, i) in spec.chips"
              :key="chip"
              class="spec-card__chip"
              :class="{ 'spec-card__chip--accent': spec.chipAccent[i] }"
            >{{ chip }}</span>
          </div>
        </li>
      </ul>
    </BaseContainer>
  </section>
</template>

<style lang="scss" scoped>
.platform-section {
  padding: var(--section-py) 0;
  background: var(--ink);
  border-top: 1px solid var(--line);

  &__head {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 56px;
  }

  &__marker { color: var(--fg-3); }

  &__title {
    font-family: var(--font-sans);
    font-size: clamp(22px, 2.8vw, 40px);
    font-weight: 500;
    line-height: 1.2;
    color: var(--fg);
    max-width: 720px;

    em {
      font-family: var(--font-serif);
      font-style: italic;
      font-weight: 400;
      color: var(--fg-2);
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;

    @media (min-width: 640px) { grid-template-columns: repeat(2, 1fr); }
    @media (min-width: 960px) { grid-template-columns: repeat(3, 1fr); }
  }
}

.spec-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 28px;
  border: 1px solid var(--line);
  margin: -1px 0 0 -1px;
  transition: background 0.15s;

  &:hover { background: var(--ink-2); }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__num {
    color: var(--fg-3);
    flex-shrink: 0;
  }

  &__tag {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
    padding: 2px 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
  }

  &__title {
    font-family: var(--font-sans);
    font-size: 17px;
    font-weight: 600;
    color: var(--fg);
    line-height: 1.25;
  }

  &__body {
    font-family: var(--font-sans);
    font-size: 14px;
    color: var(--fg-2);
    line-height: 1.65;
    flex: 1;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: auto;
  }

  &__chip {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-3);
    background: var(--ink-2);
    border: 1px solid var(--line-2);
    padding: 2px 8px;

    &--accent {
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 8%, transparent);
      border-color: color-mix(in srgb, var(--accent) 25%, transparent);
    }
  }
}
</style>
