<script setup lang="ts">
interface Props {
  highlighted?: boolean
  dark?: boolean
}

defineProps<Props>();
</script>

<template>
  <div
    class="base-card"
    :class="{
      'base-card--highlighted': highlighted,
      'base-card--dark': dark,
    }"
  >
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.base-card {
  --card-padding: 20px 32px;
  --card-bg: var(--color-terminal);

  position: relative;
  padding: var(--card-padding);

  background-color: var(--card-bg);
  border-radius: 8px;
  border: 1px solid var(--color-glass-border);
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;

  // Accent sheen that lights up along the top edge on hover.
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    border-color: var(--color-accent);
    transform: translateY(-4px);
    box-shadow: var(--shadow-card-hover);

    &::after { opacity: 1; }
  }

  &--highlighted {
    border-color: var(--color-accent);
    box-shadow: 0 0 30px var(--color-accent-soft);
  }

  &--dark {
    background-color: var(--color-bg);

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, var(--color-accent-soft) 0%, transparent 50%);
      opacity: 0;
      transition: opacity 0.4s ease;
    }

    &:hover {
      border-color: var(--color-accent);
      box-shadow: var(--shadow-card-hover);

      &::before {
        opacity: 1;
      }
    }
  }
}
</style>
