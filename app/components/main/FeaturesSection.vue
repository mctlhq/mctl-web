<script setup lang="ts">
const { t } = useI18n()

const features = [
  { icon: '/img/icon-platform.svg', titleKey: 'features.card1.title', codeKey: 'features.card1.code', descKey: 'features.card1.desc' },
  { icon: '/img/icon-gitops.svg', titleKey: 'features.card2.title', codeKey: 'features.card2.code', descKey: 'features.card2.desc' },
  { icon: '/img/icon-security.svg', titleKey: 'features.card3.title', codeKey: 'features.card3.code', descKey: 'features.card3.desc' },
  { icon: '/img/icon-selfservice.svg', titleKey: 'features.card4.title', codeKey: 'features.card4.code', descKey: 'features.card4.desc' },
  { icon: '/img/icon-mctl.svg', titleKey: 'features.card5.title', codeKey: 'features.card5.code', descKey: 'features.card5.desc' },
]
</script>

<template>
  <section class="features" id="features">
    <div class="container">
      <p class="section-tag">{{ t('features.tag') }}</p>
      <h2 class="section-title">{{ t('features.title') }}</h2>
      <div class="features-grid">
        <div
          v-for="feat in features"
          :key="feat.titleKey"
          v-reveal
          class="feature-card"
        >
          <div class="feature-icon">
            <img :src="feat.icon" :alt="t(feat.titleKey)" width="56" height="56">
          </div>
          <h3>{{ t(feat.titleKey) }}</h3>
          <code class="feature-code">{{ t(feat.codeKey) }}</code>
          <p>{{ t(feat.descKey) }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
