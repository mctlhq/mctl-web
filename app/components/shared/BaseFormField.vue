<template>
  <div class="base-form-field">
    <label v-if="label" :for="id" class="base-form-field__label">{{ label }}</label>
    <slot>
      <BaseInput
        v-model="modelValue"
        :id="id"
        v-bind="$attrs"
        class="base-form-field__input"
      />
    </slot>
    <small v-if="error" class="base-form-field__error">
      {{ error }}
    </small>
    <small v-else-if="info" class="base-form-field__info">
      {{ info }}
    </small>
  </div>
</template>

<script setup lang="ts">
interface BaseFormFieldProps {
  label?: string
  id?: string
  error?: string
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
    cursor: pointer;
  }

  &__input {
    width: 100%;
  }

  &__error {
    display: block;
    margin-top: 8px;

    color: var(--color-error);
    font-size: 12px;
  }

  &__info {
    display: block;
    margin-top: 8px;

    color: var(--color-text-muted);
    font-size: 12px;
  }
}
</style>
