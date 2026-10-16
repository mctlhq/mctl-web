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
          <h3 class="why-section__card-title">{{ t(card.titleKey) }}</h3>
          <p class="why-section__card-description">{{ t(card.descKey) }}</p>
        </BaseCard>
      </li>
    </ul>
  </BaseSection>
</template>

<style lang="scss" scoped>
.why-section {
  background-color: var(--color-bg-secondary);

  &__cards {
    display: flex;
    flex-direction: column;
    gap: 28px;

    @media (min-width: 768px) {
      flex-direction: row;
    }
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
      box-shadow: var(--shadow-overlay, 0 16px 48px rgba(0, 0, 0, 0.48));
    }
  }

  &__card-title {
    font-size: var(--mctl-typography-font-size-lg, 18px);
    margin-bottom: 12px;
  }

  &__card-description {
    font-size: var(--text-small-size, 14px);
    color: var(--color-text-muted);
    line-height: 1.6;
  }
}

@media (max-width: 900px) {
  .why-section__cards {
    flex-wrap: wrap;
  }

  .why-section__cards-item {
    flex: 1 1 calc(50% - 14px);
    min-width: 200px;
  }
}

@media (max-width: 768px) {
  .why-section__cards {
    flex-direction: column;
  }

  .why-section__cards-item {
    flex: 1 1 100%;
  }
}
</style>
