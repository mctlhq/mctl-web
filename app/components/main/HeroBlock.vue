<script setup lang="ts">
const headlineOptions = [
  'The platform team <strong>is now</strong> <em>an agent</em>.',
  'The platform team you didn\'t <em>have to hire</em>.',
  'Production Kubernetes, <em>day one</em>.',
  '<em>kubectl</em> is the fallback now.',
  'Run Kubernetes like a <em>100-person</em> platform team.',
  'Ship code. <em>Sleep through the night.</em>',
  'Kubernetes, <em>finally civilized</em>.',
]

const ledeVoices = {
  eng: 'MCTL is a production-grade, <strong>AI-native Kubernetes platform</strong> for growing product teams. GitOps, secrets, team isolation — built in. Sign in with GitHub, get a namespace in two minutes, and an <strong>on-call agent</strong> that opens fix PRs while you sleep.',
  bold: 'Sign in with GitHub, get a namespace in two minutes, ship before lunch.',
  editorial: 'Most product teams don\'t have a platform problem — they have a queue problem. MCTL gives you production-grade infrastructure without the headcount, and without the queue.',
}

const stats = [
  { value: '39', label: 'MCP tools' },
  { value: '7',  label: 'AI clients' },
  { value: '24/7', label: 'Self-healing agent' },
  { value: '0', label: 'Tickets for routine work' },
]

const currentHeadline = inject('tweaks-headline', ref(0))
const currentVoice    = inject('tweaks-voice', ref('eng'))

const headline = computed(() => headlineOptions[currentHeadline.value] ?? headlineOptions[0])
const lede     = computed(() => ledeVoices[currentVoice.value as keyof typeof ledeVoices] ?? ledeVoices.eng)
</script>

<template>
  <section id="hero" class="hero-block">
    <BaseContainer size="lg" class="hero-block__inner">
      <!-- Left column -->
      <div class="hero-block__left">
        <p class="hero-block__eyebrow marker">
          S/00 — AI-native Kubernetes platform · self-service · GitOps · MCP
        </p>

        <h1 class="hero-block__h1" v-html="headline" />

        <p class="hero-block__lede" v-html="lede" />

        <div class="hero-block__ctas">
          <a href="#request-access" class="hero-block__cta hero-block__cta--primary">
            Request access →
          </a>
          <a href="https://docs.mctl.ai" target="_blank" rel="noopener" class="hero-block__cta hero-block__cta--ghost">
            Read the docs
          </a>
          <a href="https://docs.mctl.ai/mcp/connecting" target="_blank" rel="noopener" class="hero-block__cta hero-block__cta--ghost">
            Connect MCP
          </a>
        </div>

        <!-- Stats strip -->
        <div class="hero-block__stats">
          <div
            v-for="stat in stats"
            :key="stat.label"
            class="hero-block__stat"
          >
            <span class="hero-block__stat-value">{{ stat.value }}</span>
            <span class="hero-block__stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>

      <!-- Right column — console -->
      <div class="hero-block__right">
        <HeroConsole />
      </div>
    </BaseContainer>
  </section>
</template>

<style lang="scss" scoped>
.hero-block {
  padding: var(--section-py) 0;
  background: var(--ink);
  min-height: calc(100vh - 88px);
  display: flex;
  align-items: center;

  &__inner {
    display: grid;
    grid-template-columns: 7fr 5fr;
    gap: 56px;
    align-items: center;

    @media (max-width: 960px) {
      grid-template-columns: 1fr;
    }
  }

  &__left {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  &__eyebrow {
    color: var(--fg-3);
  }

  &__h1 {
    font-family: var(--font-sans);
    font-size: clamp(36px, 6vw, 88px);
    font-weight: 600;
    line-height: 0.96;
    letter-spacing: -0.02em;
    color: var(--fg);

    :deep(strong) { font-weight: 700; color: #fff; }
    :deep(em) {
      font-family: var(--font-serif);
      font-style: italic;
      font-weight: 400;
      color: var(--fg);
    }
  }

  &__lede {
    font-family: var(--font-sans);
    font-size: clamp(16px, 1.6vw, 19px);
    color: var(--fg-2);
    line-height: 1.6;
    max-width: 560px;

    :deep(strong) { color: var(--fg); font-weight: 500; }
  }

  &__ctas {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  &__cta {
    display: inline-flex;
    align-items: center;
    padding: 10px 20px;
    font-size: 14px;
    font-family: var(--font-mono);
    text-decoration: none;
    transition: all 0.15s;
    letter-spacing: 0.01em;

    &--primary {
      background: var(--accent);
      color: var(--ink);
      font-weight: 600;

      &:hover { background: var(--accent-hi); }
    }

    &--ghost {
      color: var(--fg-2);
      border: 1px solid var(--line-2);

      &:hover {
        border-color: var(--fg-3);
        color: var(--fg);
      }
    }
  }

  /* Stats strip */
  &__stats {
    display: flex;
    gap: 32px;
    flex-wrap: wrap;
    padding-top: 8px;
    border-top: 1px solid var(--line);
  }

  &__stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__stat-value {
    font-family: var(--font-mono);
    font-size: clamp(28px, 3vw, 44px);
    font-weight: 600;
    color: var(--accent);
    line-height: 1;
  }

  &__stat-label {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  /* Right column */
  &__right {
    @media (max-width: 960px) { display: none; }
  }
}
</style>
