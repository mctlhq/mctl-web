<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section class="hero">
    <div class="hero-glow" />
    <div class="container">
      <div class="hero-content">
        <h1>{{ t('hero.title') }}</h1>
        <p class="subtitle" v-html="t('hero.subtitle')" />
        <div class="cta-buttons">
          <a href="#request-access" class="btn btn-primary">
            {{ t('hero.cta') }}
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
