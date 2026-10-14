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
        <!-- The live region stays mounted and only its content changes:
             a region inserted together with its text is often not announced,
             which would leave a successful send silent for screen readers. -->
        <div class="base-form__live" aria-live="polite" aria-atomic="true">
          <BaseFormStatus
            v-if="status"
            :type="status.type"
            class="base-form__status"
          >
            {{ status.message }}
          </BaseFormStatus>
        </div>
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
