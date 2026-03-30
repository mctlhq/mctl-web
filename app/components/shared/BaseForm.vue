<script setup lang="ts">
import BaseFormStatus from './BaseFormStatus.vue';

interface Props {
  submitText?: string
  status?: { message: string; type: 'success' | 'error' } | null
  isLoading?: boolean
  disabled?: boolean
}
defineProps<Props>();

const { t } = useI18n();

const emit = defineEmits<{
  submit: [event: SubmitEvent]
}>();

function onSubmit(event: SubmitEvent) {
  emit('submit', event)
}
</script>

<template>
  <form class="base-form" @submit.prevent="onSubmit">
    <slot />
    <footer class="base-form__footer">
      <slot name="footer">
        <BaseButton
          type="submit"
          block
          :disabled="disabled || isLoading"
        >
          <span v-if="isLoading">{{ t('js.submit.processing') }}</span>
          <span v-else>{{ submitText || 'Submit' }}</span>
        </BaseButton>
        <BaseFormStatus
          v-if="status"
          :type="status.type"
          class="base-form__status"
        >
          {{ status.message }}
        </BaseFormStatus>
      </slot>
    </footer>
  </form>
</template>

<style lang="scss" scoped>
.base-form {
  &__status {
    margin-top: 16px;
  }

  :deep(.base-form-field) {
    &:not(:last-child) {
      margin-bottom: 24px;
    }
  }
}
</style>
