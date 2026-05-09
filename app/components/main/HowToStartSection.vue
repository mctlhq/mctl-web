<script setup lang="ts">
const steps = [
  {
    num: '01',
    title: 'Get your workspace.',
    body: 'Sign in with GitHub, choose a team name. Your isolated namespace, RBAC, secrets, and quotas are provisioned in about two minutes — no platform engineer in the loop.',
    code: 'Sign in → Create team → Get namespace',
  },
  {
    num: '02',
    title: 'Configure your service.',
    body: 'Pick a template from the Service Catalog. Specify database, domain, and secrets references. The repo and configs are generated automatically — owned by your team, ready to clone.',
    code: 'Choose template → Configure → Generate',
  },
  {
    num: '03',
    title: 'Push your code, or ask AI.',
    body: 'Push and GitOps deploys it. Or talk to Claude, Cursor or VS Code through MCP and let it deploy, roll back, or spin up a preview environment. Every action is auditable.',
    code: 'git push → Build → Deploy → Live ✓',
  },
]

const yaml = `apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: checkout-web
  owner: team/checkout
spec:
  type: service
  lifecycle: production
  runtime: node-api  # template
  database: postgres
  domain: checkout.acme.dev
  secrets:
    - ref: vault://kv/team/checkout/db
  previewEnvs:
    enabled: true
    ttl: 7d
  tls: cert-manager`
</script>

<template>
  <section id="how-it-works" class="how-section">
    <BaseContainer size="lg">
      <div class="how-section__head">
        <p class="marker how-section__marker">S/03 · How it works</p>
        <h2 class="how-section__title">
          Three steps to production.
          <em>Sign in. Pick a template. Push or ask.</em>
        </h2>
      </div>

      <div class="how-section__body">
        <!-- Steps -->
        <ol class="how-section__steps">
          <li
            v-for="step in steps"
            :key="step.num"
            class="how-section__step"
          >
            <span class="how-section__step-num marker">step {{ step.num }}</span>
            <h3 class="how-section__step-title">{{ step.title }}</h3>
            <p class="how-section__step-body">{{ step.body }}</p>
            <code class="how-section__step-code">{{ step.code }}</code>
          </li>
        </ol>

        <!-- YAML column -->
        <div class="how-section__yaml-col">
          <p class="how-section__yaml-label marker">team/checkout-gitops · catalog-info.yaml</p>
          <pre class="how-section__yaml"><code v-html="highlightYaml(yaml)" /></pre>
        </div>
      </div>
    </BaseContainer>
  </section>
</template>

<script lang="ts">
function highlightYaml(src: string): string {
  return src
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^([\w-]+):/gm, '<span class="yk">$1:</span>')
    .replace(/(#.*)$/gm, '<span class="yc">$1</span>')
    .replace(/'([^']*)'/g, '<span class="ys">\'$1\'</span>')
    .replace(/:\s*(true|false|production|postgres|cert-manager)/g, ': <span class="ys">$1</span>')
}
export default {}
</script>

<style lang="scss" scoped>
.how-section {
  padding: var(--section-py) 0;
  background: var(--ink-2);
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
    max-width: 640px;

    em {
      font-family: var(--font-serif);
      font-style: italic;
      font-weight: 400;
      color: var(--fg-2);
    }
  }

  &__body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 64px;
    align-items: start;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: 40px;
    }
  }

  &__steps {
    display: flex;
    flex-direction: column;
    gap: 0;
    list-style: none;
  }

  &__step {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 28px 0;
    border-bottom: 1px solid var(--line);

    &:first-child { padding-top: 0; }
    &:last-child  { border-bottom: none; padding-bottom: 0; }
  }

  &__step-num { color: var(--fg-3); }

  &__step-title {
    font-family: var(--font-sans);
    font-size: 20px;
    font-weight: 600;
    color: var(--fg);
  }

  &__step-body {
    font-family: var(--font-sans);
    font-size: 15px;
    color: var(--fg-2);
    line-height: 1.65;
  }

  &__step-code {
    display: block;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 7%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 15%, transparent);
    padding: 8px 12px;
    margin-top: 4px;
  }

  /* YAML column */
  &__yaml-col {
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: sticky;
    top: 104px;
  }

  &__yaml-label { color: var(--fg-3); }

  &__yaml {
    background: var(--ink-3);
    border: 1px solid var(--line);
    padding: 20px;
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 1.65;
    color: var(--fg-2);

    :deep(.yk) { color: var(--syn-key); }
    :deep(.ys) { color: var(--syn-str); }
    :deep(.yc) { color: var(--syn-comment); font-style: italic; }
  }
}
</style>
