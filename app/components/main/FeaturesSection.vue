<script setup lang="ts">
import GitOpsIcon from '@/assets/icons/gitops.svg';
import MctlIcon from '@/assets/icons/mctl.svg';
import PlatformIcon from '@/assets/icons/platform.svg';
import SecurityIcon from '@/assets/icons/security.svg';
import SelfServiceIcon from '@/assets/icons/selfservice.svg';

const { t } = useI18n()

const features = [
  { icon: PlatformIcon, titleKey: 'features.card1.title', codeKey: 'features.card1.code', descKey: 'features.card1.desc' },
  { icon: GitOpsIcon, titleKey: 'features.card2.title', codeKey: 'features.card2.code', descKey: 'features.card2.desc' },
  { icon: SecurityIcon, titleKey: 'features.card3.title', codeKey: 'features.card3.code', descKey: 'features.card3.desc' },
  { icon: SelfServiceIcon, titleKey: 'features.card4.title', codeKey: 'features.card4.code', descKey: 'features.card4.desc' },
  { icon: MctlIcon, titleKey: 'features.card5.title', codeKey: 'features.card5.code', descKey: 'features.card5.desc' },
]
</script>

<template>
  <BaseSection
    id="features"
    class="features"
    :tag="t('features.tag')"
    :title="t('features.title')"
  >
    <ul class="features__list">
      <li
        v-for="feat in features"
        :key="feat.titleKey"
        class="features__list-item"
      >
        <BaseCard
          v-reveal
          dark
          class="features__card"
        >
          <component :is="feat.icon" class="features__card-icon" />
          <h3 class="features__card-title">{{ t(feat.titleKey) }}</h3>
          <code class="features__card-code">{{ t(feat.codeKey) }}</code>
          <p class="features__card-description">{{ t(feat.descKey) }}</p>
        </BaseCard>
      </li>
    </ul>
  </BaseSection>
</template>

<style lang="scss" scoped>
.features {
  background-color: var(--color-bg-secondary);

  &__list {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  &__list-item {
    display: grid;
    grid-template-rows: subgrid;
    grid-row: span 4;
  }

  &__card {
    position: relative;
    display: grid;
    grid-template-rows: subgrid;
    grid-row: span 4;

    &:hover {
      transform: translateY(-8px);

      .features__card-icon {
        transform: scale(1.1);
      }
    }
  }

  &__card-icon {
    display: block;
    width: 56px;
    height: 56px;
    margin: 0 auto 20px;
    color: var(--color-accent);
    transition: transform 0.3s ease;
    align-self: end;
  }

  &__card-title {
    margin-bottom: 20px;
    font-size: 24px;
    text-align: center;
  }

  &__card-code {
    margin-bottom: 20px;
    min-height: 54px;
    font-size: 0.8rem;
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 7%, transparent);
    padding: 0.5rem 0.8rem;
    border-radius: 6px;
    border: 1px solid color-mix(in srgb, var(--color-accent) 10%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    line-height: 1.4;
    align-self: start;
  }

  &__card-description {
    color: var(--color-text-muted);
  }

  @media (min-width: 768px) {
    &__list {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      column-gap: 28px;
    }

    &__list-item {
      display: grid;
      grid-template-rows: subgrid;
      grid-row: span 4;
    }
  }
}

@media (max-width: 1100px) {
  .features__list {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: none;
  }

  .features__list-item {
    grid-row: auto;
    display: flex;
    flex-direction: column;
  }

  .features__card {
    grid-row: auto;
    display: flex;
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .features__list {
    grid-template-columns: 1fr;
  }
}
</style>
