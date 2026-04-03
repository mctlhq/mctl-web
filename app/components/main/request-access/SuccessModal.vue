<script setup lang="ts">
const { t } = useI18n();

const open = defineModel<boolean>({ default: false });
</script>

<template>
  <BaseModal
    v-model="open"
    :title="t('modal.team_created')"
    align="center"
    max-width="480px"
  >
    <div class="request-access-success">
      <div class="request-access-success__steps">
        <div class="request-access-success__step">
          <span class="request-access-success__step-num">1</span>
          <p>{{ t('modal.step1') }}</p>
        </div>
        <div class="request-access-success__step">
          <span class="request-access-success__step-num">2</span>
          <div>
            <p>{{ t('modal.step2') }}</p>
            <div class="request-access-success__links">
              <a
                href="https://app.mctl.ai/"
                target="_blank"
                rel="noopener"
                class="btn btn-outline"
              >
                {{ t('modal.portal') }}
              </a>
              <a
                href="https://ops.mctl.ai/"
                target="_blank"
                rel="noopener"
                class="btn btn-outline"
              >
                {{ t('modal.argocd') }}
              </a>
              <a
                href="https://workflows.mctl.ai/"
                target="_blank"
                rel="noopener"
                class="btn btn-outline"
              >
                {{ t('modal.workflows') }}
              </a>
            </div>
          </div>
        </div>
      </div>
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
  &__steps {
    margin-bottom: 1.5rem;
    text-align: left;
  }

  &__step {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    margin-bottom: 1.25rem;

    &:last-child {
      margin-bottom: 0;
    }

    p {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.5;
      color: var(--color-text);
    }

    a {
      color: var(--color-accent);
    }
  }

  &__step-num {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-accent);
    color: var(--color-bg);
    font-weight: 700;
    font-size: 0.85rem;
  }

  &__links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 0.75rem;

    :deep(.btn) {
      font-size: 0.85rem;
      padding: 0.5rem 1rem;
    }
  }

  &__close {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .request-access-success {
    &__links {
      flex-direction: column;

      :deep(.btn) {
        width: 100%;
        box-sizing: border-box;
        text-align: center;
      }
    }

    &__step-num {
      width: 28px;
      height: 28px;
      font-size: 0.85rem;
    }
  }
}
</style>
