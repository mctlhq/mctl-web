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
  <BaseSection
    id="why-section"
    class="why-section"
    :tag="t('why.tag')"
    :title="t('why.title')"
  >
    <ul class="why-section__cards">
      <li
        v-for="card in cards"
        :key="card.titleKey"
        class="why-section__cards-item"
      >
        <BaseCard class="why-section__card">
          <h3>{{ t(card.titleKey) }}</h3>
          <p class="why-section__card-description">{{ t(card.descKey) }}</p>
        </BaseCard>
      </li>
    </ul>
  </BaseSection>
</template>

<style lang="scss" scoped>
.why-section {
  background: var(--color-bg-secondary);

  &__cards {
    display: flex;
    gap: 28px;
  }

  &__cards-item {
    flex: 1;
  }

  &__card {
    height: 100%;
    text-align: center;
    cursor: default;
    transition: all .3s ease;

    &:hover {
      border-color: var(--color-accent);
      transform: translateY(-4px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 245, 255, 0.1);
    }
  }

  &__card-description {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    line-height: 1.6;
  }
}
</style>
