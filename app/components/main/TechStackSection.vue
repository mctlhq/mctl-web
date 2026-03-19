<script setup lang="ts">
import ArgocdIcon from '@/assets/icons/argocd.svg';
import CatalogIcon from '@/assets/icons/catalog.svg';
import VaultIcon from '@/assets/icons/vault.svg';
import K3sIcon from '@/assets/icons/k3s.svg';

const { t } = useI18n()

const logos = [
  { icon: CatalogIcon, labelKey: 'tech.catalog' },
  { icon: ArgocdIcon, labelKey: 'tech.gitops' },
  { icon: VaultIcon, labelKey: 'tech.secrets' },
  { icon: K3sIcon, labelKey: 'tech.runtime' },
]
</script>

<template>
  <BaseSection
    id="tech-stack"
    class="tech-stack-section"
    :tag="t('tech.tag')"
    :title="t('tech.title')"
  >
    <p class="tech-stack-section__subtitle">{{ t('tech.subtitle') }}</p>
    <ul class="tech-stack-section__list">
      <li
        v-for="item in logos"
        :key="item.labelKey"
        class="tech-stack-section__list-item"
      >
        <component
          :is="item.icon"
          class="tech-stack-section__icon"
        />
        <p class="tech-stack-section__label">{{ t(item.labelKey) }}</p>
      </li>
    </ul>
  </BaseSection>
</template>

<style lang="scss" scoped>
.tech-stack-section {
  background-color: var(--color-bg-secondary);

  &__subtitle {
    text-align: center;
    margin-bottom: 40px;
    color: var(--color-text-muted);
  }

  &__list {
    display: flex;
    gap: 60px;
    justify-content: center;
  }

  &__list-item {
    color: var(--color-accent);
    opacity: .7;
    transition: all .3s ease;

    &:hover {
      opacity: 1;

      .tech-stack-section__icon {
        transform: translateY(-4px);
      }
    }
  }

  &__icon {
    display: block;
    width: 50px;
    height: 50px;
    margin: 0 auto 16px;
    transition: all .3s ease;
  }
}
</style>
