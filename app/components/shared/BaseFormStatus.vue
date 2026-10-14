<script setup lang="ts">
interface Props {
  type: 'success' | 'error'
}
defineProps<Props>();
</script>

<template>
  <div
    class="base-form-status"
    :class="`base-form-status--type--${type}`"
    :role="type === 'error' ? 'alert' : undefined"
  >
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.base-form-status {
  padding: 16px;
  border-radius: 6px;

  font-size: 0.9rem;
  word-break: break-word;

  &--type--success {
    color: var(--color-success);
    background-color: color-mix(in srgb, var(--color-success) 10%, transparent);
    border: 1px solid var(--color-success);
  }

  &--type--error {
    color: var(--color-error);
    background-color: color-mix(in srgb, var(--color-error) 10%, transparent);
    border: 1px solid var(--color-error);
  }
}
</style>
