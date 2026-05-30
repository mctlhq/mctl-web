<script setup lang="ts">
const tweaksHeadline = ref(0)
const tweaksVoice    = ref('eng')
provide('tweaks-headline', tweaksHeadline)
provide('tweaks-voice', tweaksVoice)
</script>

<template>
  <article class="main-page">
    <HeroBlock />
    <WhySection />
    <FeaturesSection />
    <HowToStartSection />
    <AudienceSection />
    <TechStackSection />
    <BeforeAfterSection />
    <PricingSection />
    <CtaSection />
    <RequestAccessSection />
    <ContactSection />
    <ClientOnly>
      <TweaksPanel />
    </ClientOnly>
  </article>
</template>
