<script setup lang="ts">
const tweaksHeadline = ref(5)
const tweaksVoice    = ref('eng')
provide('tweaks-headline', tweaksHeadline)
provide('tweaks-voice', tweaksVoice)
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
      <TweaksPanel />
    </ClientOnly>
  </article>
</template>
