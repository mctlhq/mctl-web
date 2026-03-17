<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <BaseSection
    id="orchestration"
    class="orchestration-section"
    :tag="t('orch.tag')"
    :title="t('orch.title')"
  >
    <OrchestrationDiagram />
  </BaseSection>
</template>
