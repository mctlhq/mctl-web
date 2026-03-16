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
  margin: 0 auto;

  &--size {
    &--md {
      width: var(--container-width-md);
    }
    &--lg {
      width: var(--container-width);
    }
    &--wide {
      width: 100%;
      padding: 0 20px;
    }
  }
}
</style>
