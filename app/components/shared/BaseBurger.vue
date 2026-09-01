<script setup lang="ts">
defineProps<{
  active?: boolean
}>();

const { t } = useI18n()
</script>

<template>
  <button
    class="base-burger"
    :class="{ 'base-burger--active': active }"
    role="button"
    :aria-label="t('nav.burger_label')"
    :aria-expanded="active"
  >
    <span></span>
    <span></span>
    <span></span>
  </button>
</template>

<style lang="scss" scoped>
.base-burger {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 24px;
  height: 18px;

  color: var(--color-text);
  border: none;
  background-color: transparent;
  cursor: pointer;

  span {
    display: block;
    height: 3px;
    background-color: currentColor;
    border-radius: 2px;
    transition: all 0.3s ease;
  }

  &--active {
    span:nth-child(1) {
      transform: translateY(7.5px) rotate(45deg);
    }
    span:nth-child(2) {
      opacity: 0;
    }
    span:nth-child(3) {
      transform: translateY(-7.5px) rotate(-45deg);
    }
  }
}
</style>
