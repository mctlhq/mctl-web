<script setup lang="ts">
import { useForm } from 'vee-validate';
import * as yup from 'yup';

import type { RequestAccessFormData } from '@/types';

interface Props {
  disabled?: boolean
  authData?: Record<string, any> | null
}
const { authData } = defineProps<Props>();

const { t } = useI18n();

const schema = yup.object({
  team: yup.string().required().max(50),
  usecase: yup.string().required().max(500),
});

const { defineField, values, errors, handleSubmit } = useForm<RequestAccessFormData>({ validationSchema: schema });

const [team, teamProps] = defineField('team');
const [usecase, usecaseProps] = defineField('usecase');

const { teamAvailable, teamError, checking, onInput, checkAvailability } = useTeamValidation();

const { submitAccessRequest } = useApi();

const formStatus = ref<{ message: string; type: 'success' | 'error' } | null>(null);

const isSubmitting = ref(false);

function handleTeamInput() {
  onInput(values.team);
}

const onSubmit = handleSubmit(async (formData) => {
  console.log('Request Access Form Data:', formData);
  if (!authData) {
    formStatus.value = { message: t('js.submit.github_required'), type: 'error' };
    return;
  }

  if (!teamAvailable.value) {
    await checkAvailability(formData.team);
    if (!teamAvailable.value) return;
  }

  try {
    isSubmitting.value = true;

    const result = await submitAccessRequest({
      github_auth: authData,
      team: formData.team,
      usecase: formData.usecase,
    })

    if (!result.success) {
      formStatus.value = { message: result.message || 'Error', type: 'error' }
    }
  } catch {
    formStatus.value = { message: t('js.submit.network_error'), type: 'error' }
  } finally {
    isSubmitting.value = false
  }
});
</script>

<template>
  <BaseForm
    :submit-text="t('form.submit')"
    :is-loading="isSubmitting"
    :status="formStatus"
    :disabled="disabled"
    class="request-access-form"
    @submit="onSubmit"
  >
    <BaseFormField
      v-model.trim="team"
      v-bind="teamProps"
      :label="t('form.label.team')"
      :placeholder="t('form.placeholder.team')"
      :info="t('form.help.team')"
      :error="errors.team"
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
  </BaseForm>
</template>
