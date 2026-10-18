<script lang="ts" setup>
import { useForm } from 'vee-validate';
import * as yup from 'yup';
import { invitationReceipt } from '~/lib/invitationRequest';
import { SESSION_REQUEST_HEADERS } from '~/lib/zitadelSession';

const { t, locale } = useI18n();
const config = useRuntimeConfig();
const schema = yup.object({
  name: yup.string().required().max(100),
  email: yup.string().required().email().max(254),
  github: yup.string().matches(/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/, { excludeEmptyString: true }),
  project: yup.string().required().max(1000),
});
const { defineField, errors, handleSubmit, resetForm } = useForm({ validationSchema: schema });
const [name, nameProps] = defineField('name');
const [email, emailProps] = defineField('email');
const [github, githubProps] = defineField('github');
const [project, projectProps] = defineField('project');
const element = ref<HTMLElement | null>(null);
const receipt = ref('');
const submitting = ref(false);
const message = ref<string | null>(null);
const verificationMessage = ref<string | null>(null);
const challenge = useTurnstile();
const status = computed(() => {
  const text = verificationMessage.value || message.value;
  return text ? { message: text, type: 'error' as const } : null;
});
onMounted(() => {
  if (element.value) challenge.render(element.value, config.public.turnstileSiteKey, locale.value);
});
watch(challenge.token, value => { if (value) verificationMessage.value = null; });
watch(challenge.state, value => { if (value !== 'pending') verificationMessage.value = null; });
function retryChallenge() { verificationMessage.value = null; challenge.reset(); }
const submit = handleSubmit(async values => {
  if (submitting.value || receipt.value) return;
  verificationMessage.value = null;
  if (!challenge.token.value) {
    const key = challenge.missingTokenMessageKey();
    verificationMessage.value = key ? t(key) : null;
    return;
  }
  submitting.value = true;
  message.value = null;
  try {
    const response = await fetch(apiUrl('/access-requests'), {
      method: 'POST', credentials: 'omit',
      headers: { 'Content-Type': 'application/json', ...SESSION_REQUEST_HEADERS },
      body: JSON.stringify({ ...values, turnstile_token: challenge.token.value }),
    });
    const body = await response.json().catch(() => null);
    const id = invitationReceipt(response.status, body);
    if (id) {
      receipt.value = id;
      resetForm();
      challenge.remove();
    } else {
      message.value = t(response.status === 429 ? 'invitation.rate_limited'
        : body?.code === 'verification_failed' ? 'js.submit.verification_unavailable'
        : 'invitation.failed');
    }
  } catch { message.value = t('invitation.failed'); }
  finally { submitting.value = false; if (!receipt.value) challenge.reset(); }
});
</script>

<template>
  <div v-if="receipt" class="invitation-receipt" role="status" aria-live="polite">
    <h3>{{ t('invitation.saved_title') }}</h3>
    <p>{{ t('invitation.saved_detail') }}</p>
    <p class="invitation-receipt__reference">{{ t('invitation.reference') }} <code>{{ receipt }}</code></p>
  </div>
  <BaseForm v-else :submit-text="t('invitation.submit')" :is-loading="submitting" :status="status" @submit="submit">
    <BaseFormField id="invitation-name" v-model.trim="name" v-bind="nameProps" :label="t('contact.label.name')" :error="errors.name" autocomplete="name" />
    <BaseFormField id="invitation-email" v-model.trim="email" v-bind="emailProps" :label="t('contact.label.email')" :error="errors.email" type="email" autocomplete="email" />
    <BaseFormField id="invitation-github" v-model.trim="github" v-bind="githubProps" :label="t('invitation.github')" :error="errors.github" placeholder="octocat" autocomplete="off" />
    <BaseFormField id="invitation-project" :label="t('form.label.usecase')" :error="errors.project">
      <BaseTextarea id="invitation-project" v-model.trim="project" v-bind="projectProps" :placeholder="t('form.placeholder.usecase')" />
    </BaseFormField>
    <p class="invitation-privacy">{{ t('invitation.privacy') }} <NuxtLink to="/privacy">{{ t('footer.privacy') }}</NuxtLink></p>
    <div ref="element" />
    <BaseTurnstileNotice :state="challenge.state.value" @retry="retryChallenge" />
  </BaseForm>
</template>

<style lang="scss" scoped>
.invitation-privacy { color: var(--color-text-muted); font-size: 14px; margin-top: 16px; }
.invitation-receipt { text-align: left; padding: 24px; border: 1px solid var(--color-accent); border-radius: 8px; }
.invitation-receipt p { margin-top: 16px; }
.invitation-receipt__reference { overflow-wrap: anywhere; font-size: 14px; }
</style>
