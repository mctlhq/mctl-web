<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <BaseSection
    id="contact"
    class="contact-section"
    :tag="t('contact.tag')"
    :title="t('contact.title')"
  >
    <p class="contact-section__intro">{{ t('contact.intro') }}</p>
    <ContactForm class="contact-section__form" />
  </BaseSection>
</template>

<style lang="scss" scoped>
.contact-section {
  background-color: var(--color-bg-secondary);

  &__intro {
    margin-bottom: 48px;

    color: var(--color-text-muted);
    font-size: 1.1rem;
    line-height: 1.7;
    text-align: center;
  }

  &__form {
    margin: 0 auto;
  }
}
</style>
