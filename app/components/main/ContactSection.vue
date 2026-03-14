<script setup lang="ts">
const { t } = useI18n()
const { submitContactForm } = useApi()

const name = ref('')
const email = ref('')
const message = ref('')
const submitting = ref(false)
const status = ref<{ message: string; type: 'success' | 'error' } | null>(null)

async function handleSubmit() {
  if (!name.value.trim() || !email.value.trim() || !message.value.trim()) {
    status.value = { message: t('js.contact.fill_all'), type: 'error' }
    return
  }

  submitting.value = true
  status.value = null

  try {
    const result = await submitContactForm({
      name: name.value.trim(),
      email: email.value.trim(),
      message: message.value.trim(),
    })

    if (result.success) {
      status.value = { message: result.message || 'Sent!', type: 'success' }
      name.value = ''
      email.value = ''
      message.value = ''
    } else {
      status.value = { message: result.message || 'Error', type: 'error' }
    }
  } catch {
    status.value = { message: t('js.contact.network_error'), type: 'error' }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="contact" id="contact">
    <div class="container">
      <p class="section-tag">{{ t('contact.tag') }}</p>
      <h2 class="section-title">{{ t('contact.title') }}</h2>
      <div class="contact-content">
        <p class="contact-intro">{{ t('contact.intro') }}</p>

        <div class="contact-form-wrapper">
          <form class="contact-form" @submit.prevent="handleSubmit">
            <div class="form-group">
              <label for="contact-name">{{ t('contact.label.name') }}</label>
              <input
                id="contact-name"
                v-model="name"
                type="text"
                required
                :placeholder="t('contact.placeholder.name')"
              >
            </div>

            <div class="form-group">
              <label for="contact-email">{{ t('contact.label.email') }}</label>
              <input
                id="contact-email"
                v-model="email"
                type="email"
                required
                :placeholder="t('contact.placeholder.email')"
              >
            </div>

            <div class="form-group">
              <label for="contact-message">{{ t('contact.label.message') }}</label>
              <textarea
                id="contact-message"
                v-model="message"
                required
                :placeholder="t('contact.placeholder.message')"
                style="width:100%;max-width:100%;height:139px;resize:none;overflow-y:auto;box-sizing:border-box"
              />
            </div>

            <button
              type="submit"
              class="btn btn-primary btn-block"
              :disabled="submitting"
            >
              <template v-if="submitting">
                <span class="terminal-prompt">$</span> {{ t('js.contact.sending') }}
              </template>
              <template v-else>
                {{ t('contact.submit') }}
              </template>
            </button>

            <div
              v-if="status"
              class="form-status"
              :class="status.type"
              role="alert"
              aria-live="assertive"
            >
              {{ status.message }}
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>
</template>
