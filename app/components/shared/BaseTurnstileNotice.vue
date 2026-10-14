<script setup lang="ts">
import type { TurnstileState } from '@/composables/useTurnstile';

// A widget that never loaded is reported by the form's own status line on
// submit (js.submit.verification_unavailable); this notice covers only a
// challenge that loaded and then expired or failed.
interface Props {
  state: TurnstileState
}
const props = defineProps<Props>();

const emit = defineEmits<{
  retry: []
}>();

const { t } = useI18n();

const message = computed(() => {
  if (props.state === 'expired') return t('js.turnstile.expired');
  if (props.state === 'error') return t('js.turnstile.error');
  return '';
});
</script>

<template>
  <!-- Always mounted so the live region exists before its text changes;
       screen readers skip regions that are inserted together with content. -->
  <div class="turnstile-notice" role="status" aria-live="polite">
    <template v-if="message">
      <span>{{ message }}</span>
      <button
        v-if="state === 'error'"
        type="button"
        class="turnstile-notice__retry"
        @click="emit('retry')"
      >
        {{ t('js.turnstile.retry') }}
      </button>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.turnstile-notice {
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text-muted);

  &:not(:empty) {
    margin-top: 8px;
  }

  &__retry {
    margin-left: 8px;
    padding: 0;
    font: inherit;
    color: var(--color-accent);
    background: none;
    border: 0;
    text-decoration: underline;
    cursor: pointer;
  }
}
</style>
