<script setup lang="ts">
const { t } = useI18n()

const steps = [
  { num: 1, titleKey: 'how.step1.title', descKey: 'how.step1.desc', codeKey: 'how.step1.code' },
  { num: 2, titleKey: 'how.step2.title', descKey: 'how.step2.desc', codeKey: 'how.step2.code' },
  { num: 3, titleKey: 'how.step3.title', descKey: 'how.step3.desc', codeKey: 'how.step3.code' },
]
</script>

<template>
  <BaseSection
    id="how-to-start"
    class="how-to-start"
    :tag="t('how.tag')"
    :title="t('how.title')"
  >
    <ul class="how-to-start__list mctl-site-grid">
      <li
        v-for="step in steps"
        :key="step.num"
        class="how-to-start__list-item"
      >
        <BaseCard class="how-to-start__card">
          <span class="how-to-start__card-number">{{ step.num }}</span>
          <h3 class="how-to-start__card-title">{{ t(step.titleKey) }}</h3>
          <p class="how-to-start__card-description">{{ t(step.descKey) }}</p>
          <pre class="how-to-start__card-substeps">{{ t(step.codeKey) }}</pre>
        </BaseCard>
      </li>
    </ul>
  </BaseSection>
</template>

<style lang="scss" scoped>
.how-to-start {
  &__card {
    height: 100%;
    text-align: center;

    &:hover {
      border-color: var(--color-accent);
    }
  }

  &__card-number {
    margin: 0 auto 48px;
    width: 70px;
    height: 70px;
    background: var(--color-accent);
    color: var(--color-bg);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--mctl-typography-font-size-3xl, 32px);
    font-weight: var(--mctl-typography-font-weight-extrabold, 800);
    box-shadow: var(--shadow-sm, 0 4px 12px rgba(0, 0, 0, 0.2));
  }

  &__card-description {
    color: var(--color-text-muted);
    line-height: 1.6;
    margin-bottom: 16px;
  }

  &__card-substeps {
    font-family: var(--font-mono, 'JetBrains Mono', 'Fira Code', 'Courier New', monospace);
    font-size: var(--text-micro-size, 12px);
    background: var(--color-bg);
    padding: 0.75rem;
    border-radius: 10px;
    border: 1px solid var(--surface-line, #1f242b);
    color: var(--color-accent);
    line-height: 1.6;
    white-space: pre-wrap;
  }
}
</style>
