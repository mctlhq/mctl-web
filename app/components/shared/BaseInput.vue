<template>
  <div
    class="base-input"
    :class="{ 'base-input--with-icon': showTrailingIcon }"
  >
    <input
      v-model="modelValue"
      :id="id"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      class="base-input__input"
      :aria-busy="state === 'loading'"
      v-bind="$attrs"
    />
    <span
      v-if="showTrailingIcon"
      class="base-input__icon"
      :class="{
        'base-input__icon--loading': state === 'loading',
        'base-input__icon--success': state === 'success',
      }"
    >
      <SpinnerIcon
        v-if="state === 'loading'"
        class="base-input__state-svg base-input__state-svg--spin"
        aria-hidden="true"
      />
      <CheckIcon
        v-else-if="state === 'success'"
        class="base-input__state-svg"
        aria-hidden="true"
      />
      <slot v-else name="icon" />
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import CheckIcon from '@/assets/icons/check.svg';
import SpinnerIcon from '@/assets/icons/spinner.svg';

export type BaseInputState = 'loading' | 'success';

interface BaseInputProps {
  id?: string
  type?: string
  placeholder?: string
  disabled?: boolean
  state?: BaseInputState
}

const props = defineProps<BaseInputProps>();

const slots = useSlots();

const showTrailingIcon = computed(
  () =>
    props.state === 'loading'
    || props.state === 'success'
    || Boolean(slots.icon),
);

const modelValue = defineModel<string | number>();
</script>

<style lang="scss" scoped>
.base-input {
  position: relative;

  &__input {
    width: 100%;
    appearance: none;
    background: var(--color-bg);
    border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
    border-radius: 6px;
    color: var(--color-text);
    font-family: var(--font-mono, 'JetBrains Mono', 'Fira Code', 'Courier New', monospace);
    font-size: 16px;
    padding: 14px;
    transition: all .3s ease;

    &:focus {
      outline: none;
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 10%, transparent);
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

    &--loading {
      color: var(--color-accent);
    }

    &--success {
      color: var(--color-success);
    }
  }

  &__state-svg {
    width: 20px;
    height: 20px;
    display: block;
  }

  &__state-svg--spin {
    animation: base-input-spin 0.8s linear infinite;
  }
}

@keyframes base-input-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
