<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section class="hero-block">
    <div class="hero-block__glow"></div>
    <BaseContainer size="md">
      <h1>
        {{ t('hero.title') }}
      </h1>
      <p class="hero-block__description" v-html="t('hero.subtitle')" />
      <BaseButton
        size="lg"
        @click="$router.push({ hash: '#request-access' })"
      >
        {{ t('hero.cta') }}
      </BaseButton>
    </BaseContainer>
  </section>
</template>

<style lang="scss" scoped>
.hero-block {
  position: relative;
  padding: 60px 0;
  text-align: center;

  h1 {
    font-size: clamp(2.5rem, 4.5vw, 4.25rem);
  }

  &__description {
    max-width: 900px;
    margin: 0 auto 48px;
    text-align: center;
    font-size: clamp(1rem, 2vw, 1.5rem);
    color: var(--color-text-muted);
    line-height: 1.6;
  }

  &__glow {
    position: absolute;
    top: 20%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 60vw;
    height: 60vw;
    background: radial-gradient(circle, rgba(0, 245, 255, 0.1) 0%, transparent 70%);
    z-index: 0;
    pointer-events: none;
  }
}
</style>
