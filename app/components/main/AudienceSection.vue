<script setup lang="ts">
const { t } = useI18n()

const cards = [
  { titleKey: 'audience.card1.title', descKey: 'audience.card1.desc' },
  { titleKey: 'audience.card2.title', descKey: 'audience.card2.desc' },
  { titleKey: 'audience.card3.title', descKey: 'audience.card3.desc' },
  { titleKey: 'audience.card4.title', descKey: 'audience.card4.desc' },
]
</script>

<template>
  <section class="audience" id="audience">
    <div class="container">
      <p class="section-tag">{{ t('audience.tag') }}</p>
      <h2 class="section-title">{{ t('audience.title') }}</h2>
      <div class="audience-grid">
        <div
          v-for="card in cards"
          :key="card.titleKey"
          v-reveal
          class="audience-card"
        >
          <h3>{{ t(card.titleKey) }}</h3>
          <p>{{ t(card.descKey) }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
