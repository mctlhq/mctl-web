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
  padding: 0 20px;
}

@media (min-width: 1400px) {
  .base-container {
    &--size {
      &--md {
        width: var(--container-width-md);
        padding: 0;
      }
      &--lg {
        width: var(--container-width);
        padding: 0;
      }
      &--wide {
        width: 100%;
        padding: 0 20px;
      }
    }
  }
}
</style>
