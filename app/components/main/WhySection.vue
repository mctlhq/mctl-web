<script setup lang="ts">
const { t } = useI18n()

const cards = [
  { titleKey: 'why.card1.title', descKey: 'why.card1.desc' },
  { titleKey: 'why.card2.title', descKey: 'why.card2.desc' },
  { titleKey: 'why.card3.title', descKey: 'why.card3.desc' },
  { titleKey: 'why.card4.title', descKey: 'why.card4.desc' },
  { titleKey: 'why.card5.title', descKey: 'why.card5.desc' },
]
</script>

<template>
  <section class="problems" id="problems">
    <div class="container">
      <p class="section-tag">{{ t('why.tag') }}</p>
      <h2 class="section-title">{{ t('why.title') }}</h2>
      <div class="problems-grid">
        <div
          v-for="card in cards"
          :key="card.titleKey"
          v-reveal
          class="problem-card"
        >
          <h3>{{ t(card.titleKey) }}</h3>
          <p>{{ t(card.descKey) }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
