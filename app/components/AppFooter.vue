<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

async function scrollTo(sectionId: string) {
  if (route.path === '/') {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
  } else {
    await router.push('/')
    await nextTick()
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }
}
</script>

<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-logo">
          <span class="logo"><span class="logo-m">M</span>CTL</span>
        </div>
        <div class="footer-links">
          <a href="#" @click.prevent="scrollTo('features')">{{ t('footer.platform') }}</a>
          <a href="#" @click.prevent="scrollTo('pricing')">{{ t('footer.pricing') }}</a>
          <a href="#" @click.prevent="scrollTo('contact')">{{ t('footer.contact') }}</a>
        </div>
        <div class="footer-copy" v-html="t('footer.copyright')" />
      </div>
    </div>
  </footer>
</template>
