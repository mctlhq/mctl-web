<script setup lang="ts">
const { t } = useI18n()

const plans = [
  {
    titleKey: 'pricing.starter.title',
    priceKey: 'pricing.starter.price',
    descKey: 'pricing.starter.desc',
    features: ['pricing.starter.f1', 'pricing.starter.f2', 'pricing.starter.f3', 'pricing.starter.f4', 'pricing.starter.f5', 'pricing.starter.f6'],
    ctaKey: 'pricing.starter.cta',
    ctaHref: '#request-access',
    ctaClass: 'btn btn-outline btn-block',
    featured: false,
  },
  {
    titleKey: 'pricing.pro.title',
    priceKey: 'pricing.pro.price',
    descKey: 'pricing.pro.desc',
    badgeKey: 'pricing.pro.badge',
    features: ['pricing.pro.f1', 'pricing.pro.f2', 'pricing.pro.f3', 'pricing.pro.f4', 'pricing.pro.f5', 'pricing.pro.f6'],
    ctaKey: 'pricing.pro.cta',
    ctaHref: '#contact',
    ctaClass: 'btn btn-primary btn-block',
    featured: true,
  },
  {
    titleKey: 'pricing.enterprise.title',
    priceKey: 'pricing.enterprise.price',
    descKey: 'pricing.enterprise.desc',
    features: ['pricing.enterprise.f1', 'pricing.enterprise.f2', 'pricing.enterprise.f3', 'pricing.enterprise.f4', 'pricing.enterprise.f5', 'pricing.enterprise.f6'],
    ctaKey: 'pricing.enterprise.cta',
    ctaHref: '#contact',
    ctaClass: 'btn btn-outline btn-block',
    featured: false,
  },
]
</script>

<template>
  <section class="pricing" id="pricing">
    <div class="container">
      <p class="section-tag">{{ t('pricing.tag') }}</p>
      <h2 class="section-title">{{ t('pricing.title') }}</h2>
      <div class="pricing-grid">
        <div
          v-for="plan in plans"
          :key="plan.titleKey"
          v-reveal
          class="pricing-card"
          :class="{ 'pricing-card-featured': plan.featured }"
        >
          <div v-if="plan.badgeKey" class="pricing-badge">{{ t(plan.badgeKey) }}</div>
          <h3>{{ t(plan.titleKey) }}</h3>
          <div class="pricing-price">{{ t(plan.priceKey) }}</div>
          <p class="pricing-desc">{{ t(plan.descKey) }}</p>
          <ul class="pricing-features">
            <li v-for="f in plan.features" :key="f">{{ t(f) }}</li>
          </ul>
          <a :href="plan.ctaHref" :class="plan.ctaClass">{{ t(plan.ctaKey) }}</a>
        </div>
      </div>
    </div>
  </section>
</template>
