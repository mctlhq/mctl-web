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
  border: 1px solid rgba(0, 245, 255, 0.2);
  transition: all 0.3s ease;
  overflow: hidden;

  &--highlighted {
    border-color: var(--color-accent);
    box-shadow: 0 0 30px rgba(0, 245, 255, 0.2);
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
      background: linear-gradient(135deg, rgba(0, 245, 255, 0.05) 0%, transparent 50%);
      opacity: 0;
      transition: opacity 0.4s ease;
    }

    &:hover {
      border-color: var(--color-accent);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 245, 255, 0.1);

      &::before {
        opacity: 1;
      }
    }
  }
}
</style>
