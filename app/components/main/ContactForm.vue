<script setup lang="ts">
import { useForm } from 'vee-validate';
import * as yup from 'yup';

import type { ContactFormData } from '@/types';

const { t } = useI18n();
const runtimeConfig = useRuntimeConfig();

const schema = yup.object({
  name: yup.string().required().max(50),
  email: yup.string().required().email(),
  message: yup.string().required().max(500),
});

const { defineField, errors, handleSubmit } = useForm<ContactFormData>({ validationSchema: schema });

const [name, nameProps] = defineField('name');
const [email, emailProps] = defineField('email');
const [message, messageProps] = defineField('message');

const { submitContactForm, isLoading, error } = useContactForm();

const turnstileEl = ref<HTMLElement | null>(null);
const {
  token: turnstileToken,
  loadFailed: turnstileLoadFailed,
  render: renderTurnstile,
  reset: resetTurnstile,
} = useTurnstile();

const turnstileStatus = ref<string | null>(null);

// The submit error and the verification message share one status slot, so a
// stale "complete the challenge" line cannot sit next to a fresh API error.
const formStatus = computed(() => {
  if (turnstileStatus.value) return { message: turnstileStatus.value, type: 'error' as const };
  if (error.value) return { message: error.value.message, type: 'error' as const };
  return null;
});

onMounted(() => {
  if (turnstileEl.value) {
    renderTurnstile(turnstileEl.value, runtimeConfig.public.turnstileSiteKey);
  }
});

const onSubmit = handleSubmit(async (formData) => {
  // Gate, don't replace: existing validation/submit logic is unchanged,
  // this just requires a Turnstile token before calling the API.
  // Say so rather than returning silently — the token is absent whenever the
  // widget is still loading, has expired, or errored, and a submit button
  // that does nothing at all is indistinguishable from a broken form.
  if (!turnstileToken.value) {
    // Distinguish "you haven't solved it yet" from "it will never load":
    // the second is not something the user can fix by trying again, and
    // telling them to complete a challenge that isn't on screen is worse
    // than saying nothing.
    turnstileStatus.value = turnstileLoadFailed.value
      ? t('js.submit.verification_unavailable')
      : t('js.submit.verification_required');
    return;
  }

  turnstileStatus.value = null;

  try {
    await submitContactForm({ ...formData, turnstile_token: turnstileToken.value });
  } finally {
    // Turnstile tokens are single-use; siteverify consumes one on success
    // too, and this form stays mounted after a successful send, so the
    // widget must reset after every attempt that may have reached
    // siteverify — not only on failure.
    resetTurnstile();
  }
});
</script>

<template>
  <BaseForm
    :submit-text="t('contact.submit')"
    :is-loading="isLoading"
    :status="formStatus"
    class="contact-form"
    @submit="onSubmit"
  >
    <BaseFormField
      v-model.trim="name"
      v-bind="nameProps"
      :label="t('contact.label.name')"
      :placeholder="t('contact.placeholder.name')"
      :error="errors.name"
      id="user-name"
    />

    <BaseFormField
      v-model.trim="email"
      v-bind="emailProps"
      :label="t('contact.label.email')"
      :placeholder="t('contact.placeholder.email')"
      :error="errors.email"
      id="user-email"
    />

    <BaseFormField
      :label="t('contact.label.message')"
      :error="errors.message"
      id="user-message"
    >
      <BaseTextarea
        v-model.trim="message"
        v-bind="messageProps"
        :placeholder="t('contact.placeholder.message')"
        id="user-message"
      />
    </BaseFormField>

    <div ref="turnstileEl" class="contact-form__turnstile" />
  </BaseForm>
</template>

<style lang="scss" scoped>
.contact-form {
  width: 100%;

  @media (min-width: 768px) {
    width: 600px;
  }

  &__turnstile {
    margin-top: 16px;
  }
}
</style>
