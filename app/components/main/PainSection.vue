<template>
  <section id="pain" class="pain-section">
    <div class="pain-section__head">
      <div class="marker pain-section__marker"><b>S/01</b> &nbsp;·&nbsp; {{ t('v3.pain.label') }}</div>
      <h2 :key="`pt-${hydrated}`" class="pain-section__title" v-html="t('v3.pain.title')" />
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
          {{ t('v3.pain.cta') }} <span class="pain-card__arrow">→</span>
        </a>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
const { t } = useI18n()

// See HeroBlock: re-render v-html after mount so the resolved client locale
// wins over the server's default-locale SSR output.
const hydrated = ref(false)
onMounted(() => { hydrated.value = true })

const painCards = computed(() => [
  { num: '01', tag: t('v3.pain.c1.tag'), title: t('v3.pain.c1.title'), body: t('v3.pain.c1.body'), outcome: false },
  { num: '02', tag: t('v3.pain.c2.tag'), title: t('v3.pain.c2.title'), body: t('v3.pain.c2.body'), outcome: false },
  { num: '03', tag: t('v3.pain.c3.tag'), title: t('v3.pain.c3.title'), body: t('v3.pain.c3.body'), outcome: false },
  { num: '04', tag: t('v3.pain.c4.tag'), title: t('v3.pain.c4.title'), body: t('v3.pain.c4.body'), outcome: false },
  { num: '05', tag: t('v3.pain.c5.tag'), title: t('v3.pain.c5.title'), body: t('v3.pain.c5.body'), outcome: false },
  { num: '→', tag: t('v3.pain.c6.tag'), title: t('v3.pain.c6.title'), body: t('v3.pain.c6.body'), outcome: true },
])
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
