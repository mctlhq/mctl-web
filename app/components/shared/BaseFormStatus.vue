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
    role="alert"
    aria-live="assertive"
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
    background-color: rgba(63, 185, 80, 0.1);
    border: 1px solid var(--color-success);
  }

  &--type--error {
    color: var(--color-error);
    background-color: rgba(248, 81, 73, 0.1);
    border: 1px solid var(--color-error);
  }
}
</style>
