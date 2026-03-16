<template>
  <div class="base-form-field">
    <label v-if="label" :for="id" class="base-form-field__label">{{ label }}</label>
    <slot>
      <BaseInput
        v-model="modelValue"
        :id="id"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        v-bind="$attrs"
        class="base-form-field__input"
      />
    </slot>
    <small v-if="info" class="base-form-field__info">
      {{ info }}
    </small>
  </div>
</template>

<script setup lang="ts">
interface BaseFormFieldProps {
  label?: string
  id?: string
  type?: string
  placeholder?: string
  disabled?: boolean
  info?: string
}

defineProps<BaseFormFieldProps>();

const modelValue = defineModel<string | number>();
</script>

<style lang="scss" scoped>
.base-form-field {
  text-align: left;

  &__label {
    display: block;
    padding-bottom: 8px;
  }

  &__input {
    width: 100%;
  }

  &__info {
    display: block;
    margin-top: 8px;

    color: var(--color-text-muted);
    font-size: 12px;
  }
}
</style>
