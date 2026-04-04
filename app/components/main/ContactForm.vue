<script setup lang="ts">
import { useForm } from 'vee-validate';
import * as yup from 'yup';

import type { ContactFormData } from '@/types';

const { t } = useI18n();

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

const onSubmit = handleSubmit((formData) => {
  submitContactForm(formData);
});
</script>

<template>
  <BaseForm
    :submit-text="t('contact.submit')"
    :is-loading="isLoading"
    :status="error ? { message: error.message, type: 'error' } : null"
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
  </BaseForm>
</template>

<style lang="scss" scoped>
.contact-form {
  width: 100%;

  @media (min-width: 768px) {
    width: 600px;
  }
}
</style>
