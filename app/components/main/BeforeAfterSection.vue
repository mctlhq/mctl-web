<script setup lang="ts">
const rows = [
  {
    before: '"Hi DevOps, can we get a namespace for checkout-web?" — answered tomorrow, maybe Friday.',
    after:  'Devs sign in with GitHub. Their namespace exists in about two minutes, with RBAC and secrets included.',
  },
  {
    before: 'Preview environments are a three-day project, so engineers stop using them.',
    after:  'Preview environments are a one-line request. They expire on their own.',
  },
  {
    before: 'Secrets sit in someone\'s ~/.env.local. The audit is a quarterly emergency.',
    after:  'Secrets live in Vault. Manifests carry references. The audit is the diff.',
  },
  {
    before: 'Two SREs answer the same five questions every week. Burnout becomes a roadmap item.',
    after:  'Platform engineers ship policy and golden paths, not tickets.',
  },
  {
    before: '"Roll it back" means three Slack threads and a kubectl session.',
    after:  '"Roll it back" is git revert. ArgoCD does the rest. Receipts attached.',
  },
]
</script>

<template>
  <section id="before-after" class="ba-section">
    <BaseContainer size="lg">
      <div class="ba-section__head">
        <p class="marker ba-section__marker">S/06 · Before / After</p>
        <h2 class="ba-section__title">
          What changes the day you onboard MCTL.
          <em>Same cluster. Same team. Different rhythm.</em>
        </h2>
      </div>

      <div class="ba-section__grid">
        <!-- Headers -->
        <div class="ba-col ba-col--before">
          <p class="ba-col__label marker">Before (today)</p>
        </div>
        <div class="ba-col ba-col--after">
          <p class="ba-col__label marker">With MCTL (day 1)</p>
        </div>

        <!-- Rows -->
        <template v-for="row in rows" :key="row.before">
          <div class="ba-row ba-row--before">
            <p class="ba-row__text">{{ row.before }}</p>
          </div>
          <div class="ba-row ba-row--after">
            <p class="ba-row__text">{{ row.after }}</p>
          </div>
        </template>
      </div>
    </BaseContainer>
  </section>
</template>

<style lang="scss" scoped>
.ba-section {
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
    max-width: 680px;

    em {
      font-family: var(--font-serif);
      font-style: italic;
      font-weight: 400;
      color: var(--fg-2);
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;

    @media (max-width: 640px) { grid-template-columns: 1fr; }
  }
}

.ba-col {
  padding: 12px 24px;
  border: 1px solid var(--line);

  &:first-child { border-right: none; }

  &--after {
    border-left: 3px solid var(--accent);
  }

  &__label { color: var(--fg-3); }
}

.ba-row {
  padding: 20px 24px;
  border: 1px solid var(--line);
  border-top: none;

  &--before { border-right: none; }

  &--after {
    border-left: 3px solid var(--accent);
    background: color-mix(in srgb, var(--accent) 4%, transparent);
  }

  &__text {
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.65;
    color: var(--fg-2);
  }

  &--before &__text { color: var(--fg-3); }
  &--after  &__text { color: var(--fg); }

  @media (max-width: 640px) {
    border-top: 1px solid var(--line);

    &--before { border-right: 1px solid var(--line); }
    &--after { border-left: 3px solid var(--accent); }
  }
}
</style>
