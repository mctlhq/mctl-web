<script setup lang="ts">
const showSuccessModal = ref(false)
</script>

<template>
  <article class="main-page">
    <HeroBlock />
    <RequestAccess />
    <RequestAccessForm @success="showSuccessModal = true" />
    <SuccessModal v-model="showSuccessModal" />
    <WhySection />
    <OrchestrationDiagram />
    <FeaturesSection />
    <AudienceSection />
    <TechStackSection />
    <HowItWorksSection />
    <PricingSection />
    <ContactSection />
  </article>
</template>
