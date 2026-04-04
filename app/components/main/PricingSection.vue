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
  // {
  //   titleKey: 'pricing.pro.title',
  //   priceKey: 'pricing.pro.price',
  //   descKey: 'pricing.pro.desc',
  //   badgeKey: 'pricing.pro.badge',
  //   features: ['pricing.pro.f1', 'pricing.pro.f2', 'pricing.pro.f3', 'pricing.pro.f4', 'pricing.pro.f5', 'pricing.pro.f6'],
  //   ctaKey: 'pricing.pro.cta',
  //   ctaHref: '#contact',
  //   ctaClass: 'btn btn-primary btn-block',
  //   featured: true,
  // },
  // {
  //   titleKey: 'pricing.enterprise.title',
  //   priceKey: 'pricing.enterprise.price',
  //   descKey: 'pricing.enterprise.desc',
  //   features: ['pricing.enterprise.f1', 'pricing.enterprise.f2', 'pricing.enterprise.f3', 'pricing.enterprise.f4', 'pricing.enterprise.f5', 'pricing.enterprise.f6'],
  //   ctaKey: 'pricing.enterprise.cta',
  //   ctaHref: '#contact',
  //   ctaClass: 'btn btn-outline btn-block',
  //   featured: false,
  // },
]
</script>

<template>
  <BaseSection
    id="pricing"
    class="pricing-section"
    :tag="t('pricing.tag')"
    :title="t('pricing.title')"
    container-size="md"
  >
    <ul class="pricing-section__plans">
      <li
        v-for="plan in plans"
        :key="plan.titleKey"
        class="pricing-section__plans-item"
      >
        <PricingPlan
          v-reveal
          :title="t(plan.titleKey)"
          :price="t(plan.priceKey)"
          :description="t(plan.descKey)"
          :features="plan.features.map(f => t(f))"
          :badge="plan.badgeKey ? t(plan.badgeKey) : undefined"
          :featured="plan.featured"
          class="pricing-section__card"
        />
      </li>
    </ul>
  </BaseSection>
</template>

<style lang="scss" scoped>
.pricing-section {
  &__plans {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 28px;

    @media (min-width: 768px) {
      flex-direction: row;
      justify-content: center;
    }
  }

  &__plans-item {
    flex: 1;
    max-width: 400px;
  }

  &__card {
    height: 100%;
  }
}
</style>
