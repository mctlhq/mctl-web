<script setup lang="ts">
interface Props {
  highlighted?: boolean
}

defineProps<Props>();
</script>

<template>
  <div class="base-card" :class="highlighted ? 'base-card--highlighted' : ''">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.base-card {
  --card-padding: 20px 32px;
  position: relative;
  padding: var(--card-padding);

  background: var(--color-terminal);
  border-radius: 8px;
  border: 1px solid rgba(0, 245, 255, 0.2);
  transition: all 0.3s ease;

  &--highlighted {
    border-color: var(--color-accent);
    box-shadow: 0 0 30px rgba(0, 245, 255, 0.2);
  }
}
</style>
