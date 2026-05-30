<script setup lang="ts">
const tweaksHeadline = ref(5)
const tweaksVoice    = ref('eng')
provide('tweaks-headline', tweaksHeadline)
provide('tweaks-voice', tweaksVoice)

// Design-iteration panel (accent picker / copy A-B switcher). Never shown to
// mctl.ai visitors — only in local dev, or opt-in via ?tweaks on a preview.
const showTweaks = ref(false)
onMounted(() => {
  showTweaks.value = import.meta.dev || new URLSearchParams(window.location.search).has('tweaks')
})
</script>

<template>
  <article class="main-page">
    <HeroBlock />
    <TrustStrip />
    <PainSection />
    <WhySection />
    <FeaturesSection />
    <MidCtaSection />
    <HowToStartSection />
    <AudienceSection />
    <TechStackSection />
    <BeforeAfterSection />
    <PricingSection />
    <CtaSection />
    <RequestAccessSection />
    <ContactSection />
    <ClientOnly>
      <TweaksPanel v-if="showTweaks" />
    </ClientOnly>
  </article>
</template>
