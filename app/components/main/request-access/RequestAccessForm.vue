<script setup lang="ts">
import { useForm } from 'vee-validate';
import * as yup from 'yup';

import type { RequestAccessFormData } from '@/types';
import { isAuthResetCode } from '~/lib/authBlob';

import SuccessModal from './SuccessModal.vue';

interface Props {
  authData?: Record<string, any> | null
  // The ZITADEL sign-in (C1b): the identity is the Worker's session cookie,
  // so `authData` is ignored and requests go to the session routes.
  sessionMode?: boolean
}
const props = defineProps<Props>();

const { t, locale } = useI18n();
const runtimeConfig = useRuntimeConfig();

const schema = yup.object({
  team: yup.string().required(t('validation.required')).max(50),
  usecase: yup.string().required(t('validation.required')).max(500),
});

const { defineField, values, errors, handleSubmit, resetForm } = useForm<RequestAccessFormData>({ validationSchema: schema });

const [team, teamProps] = defineField('team');
const [usecase, usecaseProps] = defineField('usecase');

// A 401 auth_expired / auth_format means the stored GitHub identity is no
// longer accepted (expired, or issued in a format the Worker has retired).
// Clearing it swaps the form back to the "Sign in with GitHub" state.
const { logout } = useAuth();
const session = useSession();

const { teamAvailable, teamError, checking, onInput, checkAvailability } = useTeamValidation(
  () => props.authData,
  logout,
  {
    active: () => !!props.sessionMode,
    signedIn: () => session.signedIn.value,
    onSignedOut: session.markSignedOut,
  },
);

const { submitAccessRequest, submitSessionRequest } = useApi();

const formStatus = ref<{ message: string; type: 'success' | 'error' } | null>(null);

// Verification messages live apart from formStatus so that clearing them when
// a token arrives cannot wipe an API or sign-in error.
const verificationStatus = ref<string | null>(null);
const displayStatus = computed(() =>
  verificationStatus.value
    ? { message: verificationStatus.value, type: 'error' as const }
    : formStatus.value,
);

const isSubmitting = ref(false);

const showSuccessModal = ref(false);
const acceptedTeam = ref('');
const acceptedNotice = ref<HTMLElement | null>(null);

watch(showSuccessModal, async (open) => {
  if (open || !acceptedTeam.value) return;
  await nextTick();
  // The submit button is hidden after acceptance. Restore focus to the
  // receipt unless the modal's contact link has moved it to the contact form.
  if (!document.activeElement?.closest('#contact')) acceptedNotice.value?.focus();
});

const turnstileEl = ref<HTMLElement | null>(null);
const {
  token: turnstileToken,
  loadFailed: turnstileLoadFailed,
  state: turnstileState,
  missingTokenMessageKey,
  render: renderTurnstile,
  reset: resetTurnstile,
  remove: removeTurnstile,
} = useTurnstile();

function acceptRequest(team: string) {
  acceptedTeam.value = team;
  resetForm({ values: { team: '', usecase: '' } });
  onInput('');
  formStatus.value = null;
  verificationStatus.value = null;
  removeTurnstile();
  showSuccessModal.value = true;
}

onMounted(() => {
  if (turnstileEl.value) {
    renderTurnstile(turnstileEl.value, runtimeConfig.public.turnstileSiteKey, locale.value);
  }
});

const teamFieldState = computed(() => {
  if (checking.value) {
    return 'loading' as const;
  }
  if (teamAvailable.value && values.team?.trim()) {
    return 'success' as const;
  }
  return undefined;
});

function handleTeamInput(value: string | number | undefined) {
  onInput(String(value ?? ''));
}

watch(turnstileToken, (value) => {
  if (value) verificationStatus.value = null;
});

function onRetryTurnstile() {
  verificationStatus.value = null;
  resetTurnstile();
}

const onSubmit = handleSubmit(async (formData) => {
  if (isSubmitting.value || acceptedTeam.value) return;
  // Every attempt starts with a clean verification line, so an earlier
  // "still verifying" cannot mask a sign-in or availability error below.
  verificationStatus.value = null;

  if (props.sessionMode ? !session.signedIn.value : !props.authData) {
    const key = props.sessionMode ? 'js.session.sign_in_required' : 'js.submit.github_required';
    formStatus.value = { message: t(key), type: 'error' };
    return;
  }

  if (!teamAvailable.value) {
    await checkAvailability(formData.team);
    if (!teamAvailable.value) return;
  }

  if (!turnstileToken.value) {
    // See ContactForm: expired and failed challenges are explained by
    // BaseTurnstileNotice; only "still verifying" and "never loaded" get a
    // status line.
    formStatus.value = null;
    const key = missingTokenMessageKey();
    verificationStatus.value = key ? t(key) : null;
    return;
  }

  try {
    isSubmitting.value = true;

    if (props.sessionMode) {
      const outcome = await submitSessionRequest({
        team: formData.team,
        usecase: formData.usecase,
        turnstile_token: turnstileToken.value,
      });
      if (outcome.ok) {
        acceptRequest(formData.team);
        return;
      }
      if (outcome.signedOut) session.markSignedOut();
      const message = outcome.key
        ? t(outcome.key, { name: formData.team })
        : outcome.message || t('js.submit.request_failed');
      formStatus.value = { message, type: 'error' };
      return;
    }

    const result = await submitAccessRequest({
      github_auth: props.authData,
      team: formData.team,
      usecase: formData.usecase,
      turnstile_token: turnstileToken.value,
    })

    if (result.success) {
      acceptRequest(formData.team);
    } else if (result.status === 401 && isAuthResetCode(result.code)) {
      formStatus.value = { message: t('js.auth.expired'), type: 'error' };
      logout();
    } else {
      formStatus.value = { message: result.message || t('js.submit.request_failed'), type: 'error' };
    }
  } catch {
    formStatus.value = { message: t('js.submit.network_error'), type: 'error' }
  } finally {
    isSubmitting.value = false
    // Turnstile tokens are single-use; siteverify consumes one on success
    // too, and this form stays mounted after a successful send, so the
    // widget must reset after every attempt that may have reached
    // siteverify — not only on failure.
    if (!acceptedTeam.value) resetTurnstile()
  }
});
</script>

<template>
  <div aria-live="polite" aria-atomic="true">
    <section
      v-if="acceptedTeam"
      ref="acceptedNotice"
      class="request-access-form__accepted"
      tabindex="-1"
      :aria-label="t('form.accepted_title')"
    >
      <h3>{{ t('form.accepted_title') }}</h3>
      <p>{{ t('form.accepted_detail', { name: acceptedTeam }) }}</p>
      <a href="/#contact">{{ t('modal.contact') }}</a>
    </section>
  </div>
  <BaseForm
    v-show="!acceptedTeam"
    :submit-text="t('form.submit')"
    :is-loading="isSubmitting"
    :status="displayStatus"
    class="request-access-form"
    @submit="onSubmit"
  >
    <BaseFormField
      v-model.trim="team"
      v-bind="teamProps"
      :label="t('form.label.team')"
      :placeholder="t('form.placeholder.team')"
      :info="t('form.help.team')"
      :error="errors.team || teamError ? (teamError ? t(teamError, { name: values.team }) : errors.team) : ''"
      :state="teamFieldState"
      id="team"
      @update:model-value="handleTeamInput"
    />

    <BaseFormField
      :label="t('form.label.usecase')"
      :error="errors.usecase"
      id="usecase"
    >
      <BaseTextarea
        v-model.trim="usecase"
        v-bind="usecaseProps"
        :placeholder="t('form.placeholder.usecase')"
        id="usecase"
      />
    </BaseFormField>

    <div ref="turnstileEl" class="request-access-form__turnstile" />
    <BaseTurnstileNotice
      :state="turnstileState"
      @retry="onRetryTurnstile"
    />
  </BaseForm>

  <SuccessModal v-model="showSuccessModal" />
</template>

<style lang="scss" scoped>
.request-access-form {
  &__accepted {
    padding: 24px;
    border: 1px solid var(--color-line-strong);
    border-radius: 12px;
    text-align: left;

    h3 { margin: 0 0 12px; }
    p { margin: 0 0 16px; }
  }

  &__turnstile {
    margin-top: 16px;
  }
}
</style>
