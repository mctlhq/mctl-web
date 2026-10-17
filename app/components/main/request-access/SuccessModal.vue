<script setup lang="ts">
defineProps<{ customer?: boolean }>();
const { t } = useI18n();

const open = defineModel<boolean>({ default: false });

// The Worker answers as soon as the provisioning workflow is submitted, not
// when it finishes, so this modal reports an accepted request and nothing
// more. It does not poll, promise a duration, or link to services the new
// account cannot sign in to yet.
//
// The scroll is done here rather than by the anchor's default action:
// BaseModal restores focus to the submit button on close, and that focus()
// scrolls the page back to the request form. Waiting a tick lets the restore
// happen first, then the contact section wins regardless of event ordering.
async function goToContact() {
  open.value = false;
  await nextTick();
  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.getElementById('user-name')?.focus({ preventScroll: true });
}
</script>

<template>
  <BaseModal
    v-model="open"
    :title="t('modal.request_accepted')"
    align="center"
    max-width="480px"
  >
    <div class="request-access-success">
      <p>{{ t('modal.provisioning') }}</p>
      <p>
        {{ t(customer ? 'modal.ready_followup' : 'modal.signin_unavailable') }}
        <a href="/#contact" @click.prevent="goToContact">{{ t('modal.contact') }}</a>
      </p>
      <button
        type="button"
        class="btn btn-primary request-access-success__close"
        @click="open = false"
      >
        {{ t('modal.close') }}
      </button>
    </div>
  </BaseModal>
</template>

<style lang="scss" scoped>
.request-access-success {
  text-align: left;

  p {
    margin: 0 0 1rem;
    font-size: var(--text-label-size, 15.2px);
    line-height: 1.5;
    color: var(--color-text);
  }

  a {
    color: var(--color-accent);
  }

  &__close {
    width: 100%;
    margin-top: 0.5rem;
  }
}
</style>
