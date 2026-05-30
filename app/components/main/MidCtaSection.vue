<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="mid-cta" aria-label="Talk to us">
    <p class="mid-cta__text">
      {{ t('v3.midcta.text') }}
      <em>{{ t('v3.midcta.em') }}</em>
    </p>
    <div class="mid-cta__actions">
      <a href="#cta" class="mid-cta__btn mid-cta__btn--primary">
        {{ t('v3.midcta.demo') }} <span class="mid-cta__arrow">→</span>
      </a>
      <a href="#contact" class="mid-cta__btn">{{ t('v3.midcta.engineer') }}</a>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.mid-cta {
  padding: 28px clamp(20px, 4vw, 56px);
  border-bottom: 1px solid var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
  background: var(--ink-2);

  @media (max-width: 680px) {
    flex-direction: column;
    align-items: flex-start;
  }

  &__text {
    margin: 0;
    font-size: 18px;
    letter-spacing: -0.005em;
    color: var(--fg);
    max-width: 60ch;
    line-height: 1.35;

    em {
      font-style: normal;
      color: var(--fg-3);
    }
  }

  &__actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 14px;
    border: 1px solid var(--line-2);
    border-radius: 6px;
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.02em;
    color: var(--fg);
    background: transparent;
    text-decoration: none;
    transition: border-color 0.15s, background 0.15s, color 0.15s;

    &:hover {
      border-color: var(--fg-3);
      background: var(--ink-3);
    }

    &--primary {
      background: var(--accent);
      color: var(--ink);
      border-color: var(--accent);
      font-weight: 600;

      &:hover {
        background: var(--accent-hi);
        border-color: var(--accent-hi);
        color: var(--ink);
      }
    }
  }

  &__arrow { transition: transform 0.2s; }
  &__btn:hover &__arrow { transform: translateX(2px); }
}
</style>
