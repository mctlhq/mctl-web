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
  <BaseSection
    id="audience"
    class="audience-section"
    :tag="t('audience.tag')"
    :title="t('audience.title')"
  >
    <ul class="audience-section__list">
      <li
        v-for="card in cards"
        :key="card.titleKey"
        class="audience-section__list-item"
      >
        <BaseCard
          v-reveal
          class="audience-section__card"
        >
          <h3 class="audience-section__card-title">{{ t(card.titleKey) }}</h3>
          <p class="audience-section__card-description">{{ t(card.descKey) }}</p>
        </BaseCard>
      </li>
    </ul>
  </BaseSection>
</template>

<style lang="scss" scoped>
.audience-section {
  text-align: center;

  &__list {
    display: flex;
    flex-direction: column;
    gap: 28px;

    @media (min-width: 768px) {
      flex-direction: row;
    }
  }

  &__list-item {
    flex: 1;
  }

  &__card {
    --card-bg: var(--color-bg-secondary);
    height: 100%;

    &:hover {
      border-color: var(--color-accent);
      transform: translateY(-6px);
      box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
    }
  }

  &__card-title {
    text-align: center;
  }

  &__card-description {
    font-size: .9rem;
    color: var(--color-text-muted);
  }
}
</style>
