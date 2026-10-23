<script setup lang="ts">
const { t } = useI18n();

const footerLinks = computed(() => [
  { label: t('footer.platform'), target: '/#features' },
  { label: t('footer.pricing'), target: '/#pricing' },
  { label: t('footer.contact'), target: '/#contact' },
]);
</script>

<template>
  <!-- Full-bleed, centred footer from site.css (.mctl-site-footer / __inner /
       __links / __copy), the same one docs.mctl.ai and tg.mctl.ai render. -->
  <footer class="mctl-site-footer">
    <BaseContainer class="mctl-site-footer__inner">
      <LogoDefault />
      <ul class="mctl-site-footer__links">
        <li
          v-for="(link, index) in footerLinks"
          :key="index"
        >
          <a :href="link.target">{{ link.label }}</a>
        </li>
        <li>
          <NuxtLink to="/privacy">{{ t('footer.privacy') }}</NuxtLink>
        </li>
      </ul>
      <p class="mctl-site-footer__copy" v-html="t('footer.copyright')" />
    </BaseContainer>
  </footer>
</template>
