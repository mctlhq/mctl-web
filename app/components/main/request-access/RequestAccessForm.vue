<script setup lang="ts">
import { useForm } from 'vee-validate';
import * as yup from 'yup';

import type { RequestAccessFormData } from '@/types';

interface Props {
  disabled?: boolean
}
defineProps<Props>();

const { t } = useI18n();

const schema = yup.object({
  team: yup.string().required().max(50),
  usecase: yup.string().required().max(500),
});

const { defineField, errors, handleSubmit } = useForm<RequestAccessFormData>({ validationSchema: schema });

const [team, teamProps] = defineField('team');
const [usecase, usecaseProps] = defineField('usecase');

const onSubmit = handleSubmit((formData) => {
  console.log('Request Access Form Data:', formData);
});
</script>

<template>
  <BaseForm
    :submit-text="t('form.submit')"
    :is-loading="false"
    :status="null"
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
