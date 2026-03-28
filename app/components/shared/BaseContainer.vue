<script setup lang="ts">
interface BaseContainerProps {
  size?: 'md' | 'lg' | 'wide'
}

const { size = 'lg' } = defineProps<BaseContainerProps>();
</script>

<template>
  <div class="base-container" :class="`base-container--size--${size}`">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.base-container {
  width: 100%;
  margin: 0 auto;
  padding: 0 2rem;
  box-sizing: border-box;

  &--size {
    &--md {
      max-width: var(--container-width-md);
    }
    &--lg {
      max-width: var(--container-width);
    }
    &--wide {
      max-width: 100%;
    }
  }
}

@media (max-width: 768px) {
  .base-container {
    padding: 0 1.5rem;
  }
}

@media (max-width: 380px) {
  .base-container {
    padding: 0 0.75rem;
  }
}
</style>
