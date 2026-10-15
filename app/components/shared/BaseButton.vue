<script setup lang="ts">
interface BaseButtonProps {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
}

const { variant = 'primary', size = 'md', block = false } = defineProps<BaseButtonProps>()
</script>

<template>
  <button
    class="base-button"
    :class="`base-button--variant--${variant} base-button--size--${size} ${block ? 'base-button--block' : ''}`"
  >
    <slot />
  </button>
</template>

<style lang="scss" scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  font-family: var(--font-display);
  font-size: var(--text-label-size);
  font-weight: var(--mctl-typography-font-weight-medium);
  color: var(--color-text);

  background-color: var(--control-bg);
  border-width: 1px;
  border-style: solid;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color .2s ease, color .2s ease, border-color .2s ease;

  &--variant {
    &--primary {
      background-color: var(--color-accent);
      color: var(--color-bg);
      border-color: var(--color-accent);

      &:hover {
        background-color: transparent;
        color: var(--color-accent);
      }
    }

    &--secondary {
      background-color: transparent;
      color: var(--color-accent);
      border-color: var(--color-accent);

      &:hover {
        background-color: var(--color-accent);
        color: var(--color-bg);
      }
    }
  }

  &--size {
    &--md {
      padding: 8px 20px;
    }

    &--lg {
      padding: 14px 32px;
    }
  }

  &--block {
    width: 100%;
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: .5;
    pointer-events: none;
  }
}
</style>
