<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <BaseSection
    id="contact"
    class="contact-section"
    band
    center
    :tag="t('contact.tag')"
    :title="t('contact.title')"
  >
    <p class="contact-section__intro mctl-site-section__lede">{{ t('contact.intro') }}</p>
    <ContactForm class="contact-section__form mctl-site-section__narrow" />
  </BaseSection>
</template>

<style lang="scss" scoped>
.contact-section {
  &__intro {
    margin-bottom: 48px;
  }
}
</style>
