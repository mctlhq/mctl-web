<script setup lang="ts">
const { t } = useI18n()

// Locale-reactive (t() reads the current locale, so these recompute on switch).
const headlineOptions = computed(() => [
  t('v3.hero.headline.0'),
  t('v3.hero.headline.1'),
  t('v3.hero.headline.2'),
  t('v3.hero.headline.3'),
  t('v3.hero.headline.4'),
  t('v3.hero.headline.5'),
  t('v3.hero.headline.6'),
])

const ledeVoices = computed<Record<string, string>>(() => ({
  eng: t('v3.hero.voice.eng'),
  bold: t('v3.hero.voice.bold'),
  editorial: t('v3.hero.voice.editorial'),
}))

const stats = computed(() => [
  { value: '39', label: t('v3.hero.stat.0') },
  { value: '7', label: t('v3.hero.stat.1') },
  { value: '24/7', label: t('v3.hero.stat.2') },
  { value: '0', label: t('v3.hero.stat.3') },
])

const micro = computed(() => [
  t('v3.hero.micro.0'),
  t('v3.hero.micro.1'),
  t('v3.hero.micro.2'),
  t('v3.hero.micro.3'),
])

const currentHeadline = inject('tweaks-headline', ref(0))
const currentVoice    = inject('tweaks-voice', ref('eng'))

const headline = computed(() => headlineOptions.value[currentHeadline.value] ?? headlineOptions.value[0])
const lede     = computed(() => ledeVoices.value[currentVoice.value] ?? ledeVoices.value.eng)

// The server renders the default locale (no localStorage); flip a key after
// mount so v-html re-renders with the resolved client locale (Vue doesn't
// reconcile v-html innerHTML on a hydration locale mismatch like it does text).
const hydrated = ref(false)
onMounted(() => { hydrated.value = true })
</script>

<template>
  <section id="hero" class="hero-block">
    <BaseContainer size="lg" class="hero-block__inner">
      <!-- Left column -->
      <div class="hero-block__left">
        <p class="hero-block__eyebrow marker">
          {{ t('v3.hero.eyebrow') }}
        </p>

        <h1 :key="`h-${hydrated}`" class="hero-block__h1" v-html="headline" />

        <p :key="`l-${hydrated}`" class="hero-block__lede" v-html="lede" />

        <div class="hero-block__ctas">
          <a href="#cta" class="hero-block__cta hero-block__cta--primary">
            {{ t('v3.hero.cta.demo') }}
          </a>
          <a href="#contact" class="hero-block__cta hero-block__cta--ghost">
            {{ t('v3.hero.cta.engineer') }}
          </a>
          <a href="https://docs.mctl.ai" target="_blank" rel="noopener" class="hero-block__cta hero-block__cta--ghost">
            {{ t('v3.hero.cta.docs') }}
          </a>
        </div>

        <div class="hero-block__micro">
          <span v-for="m in micro" :key="m"><i class="hero-block__micro-dot" />{{ m }}</span>
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

  /* Micro strip */
  &__micro {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 22px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-3);
    letter-spacing: 0.02em;

    span {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
  }

  &__micro-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    background: var(--ok);
    border-radius: 1px;
    box-shadow: 0 0 6px rgba(124, 242, 164, 0.4);
    flex-shrink: 0;
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
