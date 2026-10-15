<script setup lang="ts">
interface Props {
  title: string
  price: string
  description: string
  features: string[]
  badge?: string
  featured?: boolean
}

defineProps<Props>();
</script>

<template>
  <article class="pricing-plan" :class="{ 'pricing-plan--featured': featured }">
    <div v-if="badge" class="pricing-plan__badge">{{ badge }}</div>
    <h3 class="pricing-plan__title">{{ title }}</h3>
    <strong class="pricing-plan__price">{{ price }}</strong>
    <p class="pricing-plan__desc">{{ description }}</p>
    <ul class="pricing-plan__features">
      <li
        v-for="feat in features"
        :key="feat"
        class="pricing-plan__features-item"
      >
        {{ feat }}
      </li>
    </ul>
  </article>
</template>

<style lang="scss" scoped>
.pricing-plan {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-glass-border);
  padding: 3rem 2.5rem;
  border-radius: 16px;
  text-align: center;
  transition: all 0.4s ease;
  position: relative;

  &--featured {
    border-color: var(--color-accent);
    box-shadow: 0 0 30px color-mix(in srgb, var(--color-accent) 15%, transparent);
  }

  &:hover {
    transform: translateY(-6px);
  }

  &__badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);

    padding: 4px 16px;

    color: var(--color-bg);
    border-radius: 20px;
    font-size: var(--text-micro-size);
    font-weight: var(--mctl-typography-font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 1px;

    background: var(--color-accent);
  }

  &__title {
    font-size: var(--text-title-size);
  }

  &__price {
    display: block;
    margin-bottom: 0.5rem;

    font-size: var(--mctl-typography-font-size-3xl);
    font-weight: var(--mctl-typography-font-weight-extrabold);
    color: var(--color-accent);
  }

  &__desc {
    font-size: var(--text-small-size);
    color: var(--color-text-muted);
    margin-bottom: 2rem;
  }

  &__features {
    text-align: left;
  }

  &__features-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0;

    color: var(--color-text-muted);
    font-size: var(--text-small-size);

    border-bottom: 1px solid var(--surface-line);

    &::before {
      content: '\2713';
      color: var(--color-accent);
      font-weight: var(--mctl-typography-font-weight-bold);
      flex-shrink: 0;
    }
  }
}
</style>
