<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section class="orchestration" id="orchestration">
    <div class="container">
      <p class="section-tag">{{ t('orch.tag') }}</p>
      <h2 class="section-title">{{ t('orch.title') }}</h2>
      <div class="diagram-container">
        <div v-reveal class="diagram-box">
          <div class="box-icon">
            <img src="/img/icon-developer.svg" alt="Developer" width="48" height="48">
          </div>
          <h4>{{ t('orch.developer.title') }}</h4>
          <p>{{ t('orch.developer.desc') }}</p>
        </div>
        <div class="diagram-connector">
          <div class="connector-line" />
          <div class="connector-arrow" />
        </div>
        <div v-reveal class="diagram-box highlight-box">
          <div class="box-icon">
            <img src="/img/icon-mctl.svg" alt="MCTL" width="48" height="48">
          </div>
          <h4>{{ t('orch.mctl.title') }}</h4>
          <p>{{ t('orch.mctl.desc') }}</p>
          <div class="box-glow" />
        </div>
        <div class="diagram-connector">
          <div class="connector-line" />
          <div class="connector-arrow" />
        </div>
        <div v-reveal class="diagram-box">
          <div class="box-icon">
            <img src="/img/icon-cloud.svg" alt="Cloud" width="48" height="48">
          </div>
          <h4>{{ t('orch.cloud.title') }}</h4>
          <p>{{ t('orch.cloud.desc') }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
