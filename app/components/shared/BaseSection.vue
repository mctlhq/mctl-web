<script setup lang="ts">
interface Props {
  tag?: string
  title?: string
  containerSize?: 'md' | 'lg' | 'wide'
}

defineProps<Props>();
</script>

<template>
  <section class="base-section">
    <BaseContainer :size="containerSize">
      <strong v-if="tag" class="base-section__tag">{{ tag }}</strong>
      <h2 v-if="title" class="base-section__title">
        {{ title }}
      </h2>
      <slot />
    </BaseContainer>
  </section>
</template>

<style lang="scss" scoped>
.base-section {
  padding: 60px 0;
  scroll-margin-top: 80px;

  &__tag {
    display: block;
    margin-bottom: 16px;

    text-align: center;
    font-family: var(--font-mono, 'JetBrains Mono', 'Fira Code', 'Courier New', monospace);
    font-size: .8rem;
    letter-spacing: 2px;
    color: var(--color-accent);
    text-transform: uppercase;
  }

  &__title {
    position: relative;
    margin-bottom: 48px;
    padding-bottom: 1.25rem;
    text-align: center;
    letter-spacing: -1px;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 56px;
      height: 3px;
      border-radius: 3px;
      background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
    }
  }
}
</style>
