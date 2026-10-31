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
  >
    <!-- One plan is a narrow centred card, not the first cell of an
         otherwise empty three-column row. -->
    <ul
      class="pricing-section__plans"
      :class="plans.length === 1 ? 'pricing-section__plans--single mctl-site-section__narrow' : 'mctl-site-grid'"
    >
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

    <p v-reveal class="pricing-section__custom">
      {{ t('pricing.custom.note') }}
      <a href="#contact" class="pricing-section__custom-link">
        {{ t('pricing.custom.cta') }}
        <span aria-hidden="true">&#8594;</span>
      </a>
    </p>
  </BaseSection>
</template>

<style lang="scss" scoped>
.pricing-section {
  &__plans--single {
    --mctl-site-narrow-width: 440px;
  }

  &__plans--single + &__custom {
    text-align: center;
  }

  &__card {
    height: 100%;
  }

  &__custom {
    margin-top: 2.5rem;
    color: var(--color-text-muted);
    font-size: var(--text-label-size, 15.2px);
  }

  &__custom-link {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-left: 0.5rem;

    color: var(--color-accent);
    font-weight: var(--mctl-typography-font-weight-medium, 500);
    transition: gap 0.25s ease;

    span { transition: transform 0.25s ease; }

    &:hover span { transform: translateX(4px); }
  }

  @media (max-width: 600px) {
    &__custom-link {
      margin-left: 0;
      margin-top: 0.25rem;
    }
  }
}
</style>
