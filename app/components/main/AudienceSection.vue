<script setup lang="ts">
const cards = [
  {
    num: '01',
    title: 'Startups',
    sub: 'Multiple teams, no DevOps.',
    body: 'Ship to production from day one — without hiring platform engineers. The first ten people you hire should not be the ones writing your Helm charts.',
    tag: 'Day-one production',
  },
  {
    num: '02',
    title: 'B2B SaaS',
    sub: 'Multi-tenant by default.',
    body: 'Manage customer environments with one consistent isolation model. RBAC, network policies and quotas per tenant — no bespoke clusters per logo.',
    tag: 'Per-customer isolation',
  },
  {
    num: '03',
    title: 'Platform teams',
    sub: 'Already building one?',
    body: 'Accelerate with a production-ready foundation instead of starting from scratch. Bring your golden paths; keep your CODEOWNERS. Stop re-inventing ArgoCD wiring.',
    tag: 'Skip the first six months',
  },
  {
    num: '04',
    title: 'White-label partners',
    sub: 'Branded developer platform.',
    body: 'Offer your clients a developer platform with your name on the front. MCTL powers the infrastructure underneath; your brand stays on top.',
    tag: 'Your brand, our pipes',
  },
]
</script>

<template>
  <section id="audience" class="audience-section" data-surface="light">
    <BaseContainer size="lg">
      <div class="audience-section__head">
        <p class="marker audience-section__marker">S/04 · Who it's for</p>
        <h2 class="audience-section__title">
          Built for teams that want to move fast.
          <em>Four shapes of the same problem.</em>
        </h2>
      </div>

      <ul class="audience-section__grid">
        <li
          v-for="card in cards"
          :key="card.num"
          class="audience-card"
        >
          <div class="audience-card__top">
            <span class="audience-card__num marker">{{ card.num }}</span>
            <h3 class="audience-card__title">{{ card.title }}</h3>
            <p class="audience-card__sub">{{ card.sub }}</p>
          </div>
          <p class="audience-card__body">{{ card.body }}</p>
          <span class="audience-card__tag">→ {{ card.tag }}</span>
        </li>
      </ul>
    </BaseContainer>
  </section>
</template>

<style lang="scss" scoped>
.audience-section {
  padding: var(--section-py) 0;
  background: var(--paper, #f1ede4);
  border-top: 1px solid var(--paper-line, #d8d2c4);
  border-bottom: 1px solid var(--paper-line, #d8d2c4);

  &__head {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 56px;
  }

  &__marker { color: var(--paper-fg, #6b6258); }

  &__title {
    font-family: var(--font-sans);
    font-size: clamp(22px, 2.8vw, 40px);
    font-weight: 500;
    line-height: 1.2;
    color: var(--paper-ink, #15181d);
    max-width: 640px;

    em {
      font-family: var(--font-serif);
      font-style: italic;
      font-weight: 400;
      color: var(--paper-fg, #3a3f47);
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;

    @media (min-width: 640px) { grid-template-columns: repeat(2, 1fr); }
    @media (min-width: 960px) { grid-template-columns: repeat(4, 1fr); }
  }
}

.audience-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 28px;
  border: 1px solid var(--paper-line, #d8d2c4);
  margin: -1px 0 0 -1px;

  &__top {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__num {
    color: var(--paper-fg, #6b6258);
  }

  &__title {
    font-family: var(--font-sans);
    font-size: 18px;
    font-weight: 600;
    color: var(--paper-ink, #15181d);
  }

  &__sub {
    font-family: var(--font-sans);
    font-size: 13px;
    font-style: italic;
    color: var(--paper-fg, #3a3f47);
  }

  &__body {
    font-family: var(--font-sans);
    font-size: 14px;
    color: var(--paper-fg, #3a3f47);
    line-height: 1.65;
    flex: 1;
  }

  &__tag {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--paper-ink, #15181d);
    font-weight: 500;
    margin-top: auto;
  }
}
</style>
