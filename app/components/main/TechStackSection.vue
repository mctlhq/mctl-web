<script setup lang="ts">
const layers = [
  {
    num: '01',
    title: 'Service catalog',
    sub: 'Backstage-powered portal',
    body: 'Browse services, owners, dependencies, on-call. Software templates generate repos, configs and CI — every entity backed by code, not a stale wiki.',
    items: [
      { label: 'Backstage', note: 'portal' },
      { label: 'catalog-info', note: 'entities' },
      { label: 'tech-docs', note: 'docs as code' },
      { label: 'scaffolder', note: 'templates' },
    ],
  },
  {
    num: '02',
    title: 'GitOps engine',
    sub: 'ArgoCD-native',
    body: 'App-of-apps pattern. ApplicationSets per tenant. Sync waves for ordered rollout. Health gates first-class. Every change is a commit; rollback is git revert.',
    items: [
      { label: 'ArgoCD', note: 'reconciler' },
      { label: 'Helm', note: 'packaging' },
      { label: 'Kustomize', note: 'overlays' },
      { label: 'GitHub Actions', note: 'CI' },
    ],
  },
  {
    num: '03',
    title: 'Secrets & identity',
    sub: 'Vault + cert-manager + GitHub OIDC',
    body: 'Secrets live in Vault. Manifests carry references, never values. TLS rotates on its own. Identity flows from GitHub SSO to scoped per-team service accounts.',
    items: [
      { label: 'HashiCorp Vault', note: 'kv' },
      { label: 'cert-manager', note: 'TLS' },
      { label: 'External Secrets', note: 'sync' },
      { label: 'GitHub OIDC', note: 'SSO' },
    ],
  },
  {
    num: '04',
    title: 'Kubernetes runtime',
    sub: 'Runs where your cluster runs',
    body: 'k3s for lightweight footprints, full k8s for the rest. EKS, GKE, AKS, on-prem, air-gapped — wherever kubectl reaches. Nothing leaves your VPC unless you say so.',
    items: [
      { label: 'k3s · k8s', note: 'runtime' },
      { label: 'OpenTelemetry', note: 'traces' },
      { label: 'Crunchy PG', note: 'databases' },
      { label: 'BYOC', note: 'any cloud' },
    ],
  },
]
</script>

<template>
  <section id="stack" class="stack-section">
    <BaseContainer size="lg">
      <div class="stack-section__head">
        <p class="marker stack-section__marker">S/05 · Stack</p>
        <h2 class="stack-section__title">
          Boring on purpose.
          <em>Battle-tested open source, integrated into a unified platform.</em>
        </h2>
      </div>

      <div class="stack-section__layers">
        <div
          v-for="layer in layers"
          :key="layer.num"
          class="stack-layer"
        >
          <div class="stack-layer__meta">
            <span class="stack-layer__num marker">Layer {{ layer.num }}</span>
            <div class="stack-layer__title-group">
              <h3 class="stack-layer__title">{{ layer.title }}</h3>
              <span class="stack-layer__sub">{{ layer.sub }}</span>
            </div>
            <p class="stack-layer__body">{{ layer.body }}</p>
          </div>
          <div class="stack-layer__items">
            <div
              v-for="item in layer.items"
              :key="item.label"
              class="stack-item"
            >
              <strong class="stack-item__label">{{ item.label }}</strong>
              <span class="stack-item__note">{{ item.note }}</span>
            </div>
          </div>
        </div>
      </div>
    </BaseContainer>
  </section>
</template>

<style lang="scss" scoped>
.stack-section {
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
    max-width: 640px;

    em {
      font-family: var(--font-serif);
      font-style: italic;
      font-weight: 400;
      color: var(--fg-2);
    }
  }

  &__layers {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
}

.stack-layer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  align-items: start;
  padding: 32px 0;
  border-top: 1px solid var(--line);

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__num { color: var(--fg-3); }

  &__title-group {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }

  &__title {
    font-family: var(--font-sans);
    font-size: 18px;
    font-weight: 600;
    color: var(--fg);
  }

  &__sub {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-3);
    letter-spacing: 0.02em;
  }

  &__body {
    font-family: var(--font-sans);
    font-size: 14px;
    color: var(--fg-2);
    line-height: 1.65;
  }

  &__items {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 24px;
  }
}

.stack-item {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__label {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    color: var(--fg);
  }

  &__note {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-3);
    letter-spacing: 0.03em;
  }
}
</style>
