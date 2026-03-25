<script setup lang="ts">
interface Props {
  submitText?: string
  status?: { message: string; type: 'success' | 'error' } | null
  isLoading?: boolean
}

defineProps<Props>();

const emit = defineEmits<{
  submit: [event: SubmitEvent]
}>()

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
          :disabled="isLoading"
        >
          {{ submitText || 'Submit' }}
        </BaseButton>
        <div
          v-if="status"
          class="base-form__status"
          :class="`base-form__status--type--${status.type}`"
          role="alert"
          aria-live="assertive"
        >
          {{ status.message }}
        </div>
      </slot>
    </footer>
  </form>
</template>

<style lang="scss" scoped>
.base-form {
  :deep(.base-form-field) {
    &:not(:last-child) {
      margin-bottom: 24px;
    }
  }
}
</style>
