<script setup lang="ts">
interface BaseButtonProps {
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
}

const { variant = 'primary', size = 'md' } = defineProps<BaseButtonProps>()
</script>

<template>
  <button
    class="base-button"
    :class="`base-button--variant--${variant} base-button--size--${size}`"
  >
    <slot />
  </button>
</template>

<style lang="scss" scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
  font-size: inherit;
  font-weight: 500;
  color: #fff;
  background-color: var(--color-primary);
  border-width: 1px;
  border-style: solid;
  border-radius: 4px;
  cursor: pointer;
  transition: all .3s ease;

  &--variant {
    &--primary {
      background-color: var(--color-accent);
      color: var(--color-bg);
      border-color: var(--color-accent);

      &:hover {
        background-color: transparent;
        color: var(--color-accent);
        box-shadow: 0 0 20px rgba(0, 245, 255, 0.5);
      }
    }

    &--secondary {
      background-color: transparent;
      color: var(--color-accent);
      border-color: var(--color-accent);

      &:hover {
        background-color: var(--color-accent);
        color: var(--color-bg);
        box-shadow: 0 0 15px rgba(0, 245, 255, 0.3);
      }
    }
  }

  &--size {
    &--md {
      padding: 8px 20px;
    }
  }
}
</style>
