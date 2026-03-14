<script setup lang="ts">
const { t } = useI18n()

const steps = [
  { num: 1, titleKey: 'how.step1.title', descKey: 'how.step1.desc', codeKey: 'how.step1.code' },
  { num: 2, titleKey: 'how.step2.title', descKey: 'how.step2.desc', codeKey: 'how.step2.code' },
  { num: 3, titleKey: 'how.step3.title', descKey: 'how.step3.desc', codeKey: 'how.step3.code' },
]
</script>

<template>
  <section class="how-it-works" id="how-it-works">
    <div class="container">
      <p class="section-tag">{{ t('how.tag') }}</p>
      <h2 class="section-title">{{ t('how.title') }}</h2>
      <div class="workflow-steps">
        <div
          v-for="step in steps"
          :key="step.num"
          v-reveal
          class="workflow-step"
        >
          <div class="step-number">{{ step.num }}</div>
          <div class="step-content">
            <h3>{{ t(step.titleKey) }}</h3>
            <p>{{ t(step.descKey) }}</p>
            <pre class="code-block">{{ t(step.codeKey) }}</pre>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
