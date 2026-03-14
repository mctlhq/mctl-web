<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-logo">
          <span class="logo"><span class="logo-m">M</span>CTL</span>
        </div>
        <div class="footer-links">
          <a href="#features">{{ t('footer.platform') }}</a>
          <a href="#pricing">{{ t('footer.pricing') }}</a>
          <a href="#contact">{{ t('footer.contact') }}</a>
        </div>
        <div class="footer-copy" v-html="t('footer.copyright')" />
      </div>
    </div>
  </footer>
</template>
