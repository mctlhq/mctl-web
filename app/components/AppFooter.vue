<script setup lang="ts">
const { t } = useI18n();

const runtimeConfig = useRuntimeConfig();

const { baseUrlFront } = runtimeConfig.public;

const footerLinks = computed(() => [
  { label: t('footer.platform'), target: `${baseUrlFront}#features` },
  { label: t('footer.pricing'), target: `${baseUrlFront}#pricing` },
  { label: t('footer.contact'), target: `${baseUrlFront}#contact` },
]);
</script>

<template>
  <footer class="app-footer">
    <BaseContainer>
      <LogoDefault class="app-footer__logo" />
      <ul class="app-footer__links">
        <li
          v-for="(link, index) in footerLinks"
          :key="index"
          class="app-footer__links-item"
        >
          <a :href="link.target" class="app-footer__link">{{ link.label }}</a>
        </li>
        <li>
          <NuxtLink to="/privacy" class="app-footer__link">{{ t('footer.privacy') }}</NuxtLink>
        </li>
      </ul>
      <p class="app-footer__copy" v-html="t('footer.copyright')" />
    </BaseContainer>
  </footer>
</template>

<style lang="scss" scoped>
.app-footer {
  padding: 48px 0;
  text-align: center;
  background: var(--color-terminal);
  border-top: 1px solid rgba(0, 245, 255, 0.2);

  &__links {
    display: flex;
    justify-content: center;
    gap: 32px;
    flex-wrap: wrap;
    margin: 24px 0;
  }

  &__link {
    color: var(--color-accent);
    transition: all 0.3s ease;

    &:hover {
      color: #ffffff;
    }
  }

  &__copy {
    color: var(--color-text-muted);
    font-size: 0.8rem;
  }
}
</style>
