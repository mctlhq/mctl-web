<template>
  <div
    class="base-input"
    :class="{ 'base-input--with-icon': $slots.icon }"
  >
    <input
      v-model="modelValue"
      :id="id"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      class="base-input__input"
      v-bind="$attrs"
    />
    <span v-if="$slots.icon" class="base-input__icon">
      <slot name="icon" />
    </span>
  </div>
</template>

<script setup lang="ts">
interface BaseInputProps {
  id?: string
  type?: string
  placeholder?: string
  disabled?: boolean
}

defineProps<BaseInputProps>();

const modelValue = defineModel<string | number>();
</script>

<style lang="scss" scoped>
.base-input {
  position: relative;

  &__input {
    width: 100%;
    appearance: none;
    background: var(--color-bg);
    border: 1px solid rgba(0, 245, 255, .3);
    border-radius: 6px;
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: 16px;
    padding: 14px;
    transition: all .3s ease;

    &:focus {
      outline: none;
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px rgba(0, 245, 255, 0.1);
    }
  }

  &--with-icon &__input {
    padding-right: 44px;
  }

  &__icon {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted);
    line-height: 0;
  }
}
</style>
