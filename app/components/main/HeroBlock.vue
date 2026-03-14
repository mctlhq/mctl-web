<script setup lang="ts">
const { t } = useI18n()

function scrollToAccess() {
  const section = document.getElementById('request-access')
  if (!section) return
  const navHeight = (document.querySelector('.navbar') as HTMLElement)?.offsetHeight ?? 70
  const tag = section.querySelector<HTMLElement>('.section-tag')
  const target = tag ?? section
  const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16
  window.scrollTo({ top, behavior: 'smooth' })
}
</script>

<template>
  <section class="hero">
    <div class="hero-glow" />
    <div class="container">
      <div class="hero-content">
        <h1>{{ t('hero.title') }}</h1>
        <p class="subtitle" v-html="t('hero.subtitle')" />
        <div class="cta-buttons">
          <a href="#" class="btn btn-primary" @click.prevent="scrollToAccess">
            {{ t('hero.cta') }}
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
