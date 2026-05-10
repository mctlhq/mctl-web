<template>
  <section id="pain" class="pain-section">
    <div class="pain-section__head">
      <div class="marker pain-section__marker"><b>S/01</b> &nbsp;·&nbsp; Pain</div>
      <h2 class="pain-section__title">
        When Kubernetes starts <em>slowing you down.</em>
        <em>You probably hit two of these in the last sprint.</em>
      </h2>
    </div>

    <div class="pain-section__grid">
      <article v-for="card in painCards" :key="card.num" class="pain-card" :class="{ 'pain-card--outcome': card.outcome }">
        <header class="pain-card__header">
          <span class="pain-card__num">{{ card.num }}</span>
          <span class="pain-card__tag">{{ card.tag }}</span>
        </header>
        <h4 class="pain-card__title">{{ card.title }}</h4>
        <p class="pain-card__body">{{ card.body }}</p>
        <a v-if="card.outcome" href="#cta" class="pain-card__cta">
          See how MCTL fixes this <span class="pain-card__arrow">→</span>
        </a>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
const painCards = [
  {
    num: '01',
    tag: 'deployments',
    title: 'Deploys are fragile, and one person knows why.',
    body: 'Helm values diverge across staging and prod. Rollbacks are a Slack thread. The bus factor is, generously, two.',
    outcome: false,
  },
  {
    num: '02',
    tag: 'drift',
    title: "Staging and prod don’t match — and you know it.",
    body: '“What’s in production” is a question someone has to answer with kubectl. Manifests live in three places.',
    outcome: false,
  },
  {
    num: '03',
    tag: 'tickets',
    title: 'Every namespace, secret and domain is a ticket.',
    body: 'Devs wait on DevOps for trivial work. DevOps becomes a queue. Preview environments become a luxury.',
    outcome: false,
  },
  {
    num: '04',
    tag: 'tooling',
    title: 'CI, CD and observability are glued together by hand.',
    body: 'Five repos, four dashboards, three secret stores. New hires take a sprint just to deploy a hello world.',
    outcome: false,
  },
  {
    num: '05',
    tag: 'hiring → cost',
    title: 'Hiring a platform team is too early, or too expensive.',
    body: 'Two SREs at $250k each, six months to a v1, eighteen to feature parity with the OSS you already run. The math is not loving.',
    outcome: false,
  },
  {
    num: '→',
    tag: 'where this goes',
    title: 'You ship slower the bigger you get.',
    body: "Eventually someone says \"maybe we shouldn't be doing this ourselves.\" That's the conversation MCTL is built for.",
    outcome: true,
  },
]
</script>

<style lang="scss" scoped>
.pain-section {
  padding: 64px 0 0;
  border-bottom: 1px solid var(--line);

  &__head {
    display: grid;
    grid-template-columns: 1fr 3fr;
    gap: clamp(16px, 2vw, 28px);
    align-items: start;
    padding: 0 clamp(20px, 4vw, 56px);
    border-bottom: 1px dashed var(--line);
    padding-bottom: 18px;
    margin-bottom: 0;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  &__marker {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-3);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding-top: 4px;

    b {
      color: var(--fg);
      font-weight: 500;
    }
  }

  &__title {
    font-size: clamp(20px, 2.4vw, 30px);
    font-weight: 500;
    letter-spacing: -0.01em;
    line-height: 1.15;
    color: var(--fg);
    max-width: 38ch;
    margin: 0;

    em {
      font-style: normal;
      color: var(--fg-3);
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);

    @media (max-width: 960px) {
      grid-template-columns: repeat(2, 1fr);
    }

    @media (max-width: 580px) {
      grid-template-columns: 1fr;
    }
  }
}

.pain-card {
  padding: 28px clamp(20px, 4vw, 56px);
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 220px;
  transition: background 0.2s;

  &:hover { background: var(--ink-2); }

  &:nth-child(3n) { border-right: none; }
  &:nth-last-child(-n+3) { border-bottom: none; }

  @media (max-width: 960px) {
    &:nth-child(3n) { border-right: 1px solid var(--line); }
    &:nth-child(2n) { border-right: none; }
    &:nth-last-child(-n+3) { border-bottom: 1px solid var(--line); }
    &:nth-last-child(-n+2) { border-bottom: none; }
  }

  @media (max-width: 580px) {
    border-right: none !important;
    border-bottom: 1px solid var(--line) !important;

    &:last-child { border-bottom: none !important; }
  }

  &--outcome {
    background: linear-gradient(180deg, rgba(0, 229, 255, 0.05), transparent 70%);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: var(--font-mono);
    font-size: 10.5px;
    color: var(--fg-3);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding-bottom: 10px;
    border-bottom: 1px dashed var(--line);
  }

  &__num {
    color: var(--fg-2);
    font-weight: 500;
  }

  &__tag { color: var(--fg-3); }

  &__title {
    font-size: 19px;
    font-weight: 500;
    letter-spacing: -0.01em;
    margin: 0;
    line-height: 1.2;
    color: var(--fg);
    max-width: 24ch;
  }

  &__body {
    margin: 0;
    color: var(--fg-2);
    font-size: 14px;
    line-height: 1.55;
    max-width: 42ch;
  }

  &__cta {
    margin-top: auto;
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 14px;
    border: 1px solid var(--line-2);
    border-radius: 6px;
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.02em;
    color: var(--ink);
    background: var(--accent);
    border-color: var(--accent);
    font-weight: 600;
    text-decoration: none;
    transition: background 0.15s, border-color 0.15s;

    &:hover {
      background: var(--accent-hi);
      border-color: var(--accent-hi);
    }
  }

  &__arrow { transition: transform 0.2s; }
  &__cta:hover &__arrow { transform: translateX(2px); }
}
</style>
