<template>
  <div class="base-textarea">
    <textarea
      v-model="modelValue"
      :id="id"
      :placeholder="placeholder"
      :disabled="disabled"
      rows="4"
      class="base-textarea__input"
      v-bind="$attrs"
    />
  </div>
</template>

<script setup lang="ts">
interface BaseTextareaProps {
  id?: string
  placeholder?: string
  disabled?: boolean
}

const props = defineProps<BaseTextareaProps>();

const modelValue = defineModel<string | number>();
</script>

<style lang="scss" scoped>
.base-textarea {
  position: relative;

  &__input {
    width: 100%;
    appearance: none;
    background: var(--color-bg);
    border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
    border-radius: 6px;
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: 16px;
    padding: 14px;
    transition: all .3s ease;
    resize: none;

    &:focus {
      outline: none;
      border-color: var(--color-accent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 10%, transparent);
    }
  }
}
</style>
