<script setup lang="ts">
const headlineOptions = [
  'The platform team <strong>is now</strong> <span class="hl-accent">an agent</span>.',
  'The platform team you didn\'t <span class="hl-accent">have to hire</span>.',
  'Production Kubernetes, <span class="hl-accent">day one</span>.',
  '<span class="hl-accent">kubectl</span> is the fallback now.',
  'Run Kubernetes like a <span class="hl-accent">100-person</span> platform team.',
  'Ship code. <span class="hl-accent">Sleep through the night.</span>',
  'Kubernetes, <span class="hl-accent">finally civilized</span>.',
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
    font-size: clamp(48px, 8.5vw, 116px);
    font-weight: 700;
    line-height: 0.93;
    letter-spacing: -0.03em;
    color: var(--fg);

    :deep(strong) { font-weight: 700; color: var(--fg-3); }
    :deep(.hl-accent) {
      font-family: var(--font-serif);
      font-style: italic;
      font-weight: 400;
      color: var(--accent);
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

// Terminal mockup — gives the hero a concrete focal point and shows
// the core "push / ask AI / live" loop in the product's own voice.
.hero-terminal {
  position: relative;
  z-index: 1;
  max-width: 640px;
  margin: 4rem auto 0;

  text-align: left;
  background: var(--color-terminal);
  border: 1px solid var(--color-glass-border);
  border-radius: 12px;
  overflow: hidden;
  backdrop-filter: blur(8px);
  box-shadow: var(--shadow-card-hover);

  &__bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  &__dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;

    &--red { background: #ff5f56; }
    &--amber { background: #ffbd2e; }
    &--green { background: #27c93f; }
  }

  &__title {
    margin-left: auto;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    letter-spacing: 0.5px;
  }

  &__body {
    padding: 1.5rem 1.5rem 1.75rem;
    // Body inherits the page's Geist now; force mono so the terminal reads
    // as a terminal.
    font-family: var(--font-mono);
    font-size: 0.85rem;
    line-height: 1.9;

    @media (max-width: 480px) {
      font-size: 0.72rem;
    }
  }

  &__line {
    margin: 0;

    &--muted { color: var(--color-text-muted); }
    &--ok { color: var(--color-success); }
  }

  &__prompt { color: var(--color-accent); }
  &__accent { color: var(--color-accent); }
  &__str { color: #ffbd2e; }

  &__cursor {
    display: inline-block;
    width: 8px;
    height: 1em;
    margin-left: 4px;
    vertical-align: text-bottom;
    background: var(--color-accent);
    animation: heroBlink 1.1s step-end infinite;
  }
}

@keyframes heroPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

@keyframes heroBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .hero-block__badge-dot,
  .hero-terminal__cursor { animation: none; }
}
</style>
