<script setup lang="ts">
const { t } = useI18n()

// See HeroBlock: re-render v-html after mount so the client locale wins.
const hydrated = ref(false)
onMounted(() => { hydrated.value = true })
</script>

<template>
  <section id="cta" class="cta-section">
    <BaseContainer size="lg" class="cta-section__inner">
      <div class="cta-section__text">
        <p class="marker cta-section__marker">S/08 · {{ t('v3.cta.label') }}</p>
        <h2 :key="`ch-${hydrated}`" class="cta-section__heading" v-html="t('v3.cta.heading')" />
        <p class="cta-section__body">
          {{ t('v3.cta.body') }}
        </p>
      </div>

      <div class="cta-section__actions">
        <a href="#request-access" class="cta-section__btn cta-section__btn--primary">
          {{ t('v3.cta.github') }}
        </a>
        <a href="https://docs.mctl.ai" target="_blank" rel="noopener" class="cta-section__btn cta-section__btn--ghost">
          {{ t('v3.cta.docs') }}
        </a>
        <a href="https://docs.mctl.ai/mcp/connecting" target="_blank" rel="noopener" class="cta-section__btn cta-section__btn--ghost">
          {{ t('v3.cta.mcp') }}
        </a>
      </div>

      <p class="cta-section__micro marker">
        {{ t('v3.cta.micro') }}
      </p>
    </BaseContainer>
  </section>
</template>

<style lang="scss" scoped>
.cta-section {
  padding: var(--section-py) 0;
  background: var(--ink-2);
  border-top: 1px solid var(--line);

  &__inner {
    display: flex;
    flex-direction: column;
    gap: 36px;
    align-items: flex-start;
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 640px;
  }

  &__marker { color: var(--fg-3); }

  &__heading {
    font-family: var(--font-sans);
    font-size: clamp(28px, 4vw, 56px);
    font-weight: 600;
    line-height: 1.05;
    color: var(--fg);

    em {
      font-family: var(--font-serif);
      font-style: italic;
      font-weight: 400;
    }
  }

  &__body {
    font-family: var(--font-sans);
    font-size: 16px;
    color: var(--fg-2);
    line-height: 1.65;
    max-width: 540px;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    padding: 12px 24px;
    font-family: var(--font-mono);
    font-size: 14px;
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

      &:hover { border-color: var(--fg-3); color: var(--fg); }
    }
  }

  &__micro {
    color: var(--fg-3);
    font-size: 11px;
  }
}
</style>
