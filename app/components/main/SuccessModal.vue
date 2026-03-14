<script setup lang="ts">
const { t } = useI18n()

const show = defineModel<boolean>({ default: false })
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Team created"
      @click.self="show = false"
    >
      <div class="modal-content success-modal-content">
        <h3>{{ t('modal.team_created') }}</h3>
        <div class="success-steps">
          <div class="success-step">
            <span class="step-number">1</span>
            <p>{{ t('modal.step1') }}</p>
          </div>
          <div class="success-step">
            <span class="step-number">2</span>
            <div>
              <p>{{ t('modal.step2') }}</p>
              <div class="success-links">
                <a href="https://app.mctl.ai/" target="_blank" rel="noopener" class="btn btn-outline">
                  {{ t('modal.portal') }}
                </a>
                <a href="https://ops.mctl.ai/" target="_blank" rel="noopener" class="btn btn-outline">
                  {{ t('modal.argocd') }}
                </a>
              </div>
            </div>
          </div>
        </div>
        <button type="button" class="btn btn-primary" @click="show = false">
          {{ t('modal.close') }}
        </button>
      </div>
    </div>
  </Teleport>
</template>
