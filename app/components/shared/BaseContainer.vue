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
  padding: 0 var(--site-gutter, 20px);
}

/* Include gutters in the outer width so content stays aligned at every viewport. */
.base-container--size--lg {
  max-width: calc(var(--container-width) + 2 * var(--site-gutter, 20px));
}
.base-container--size--md {
  max-width: calc(var(--container-width-md) + 2 * var(--site-gutter, 20px));
}
</style>
