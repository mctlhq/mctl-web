<template>
  <div class="trust-strip" aria-label="Built on technology you trust">
    <div class="trust-strip__label">
      <span class="trust-strip__lab">{{ t('v3.trust.lab') }}</span>
      <span class="trust-strip__sub">{{ t('v3.trust.sub') }}</span>
    </div>
    <div class="trust-strip__chips">
      <span v-for="chip in chips" :key="chip.label" class="trust-strip__chip" :class="{ 'trust-strip__chip--accent': chip.accent }">
        {{ chip.label }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const chips = [
  { label: 'Kubernetes',      accent: false },
  { label: 'ArgoCD',          accent: false },
  { label: 'Backstage',       accent: false },
  { label: 'Vault',           accent: false },
  { label: 'cert-manager',    accent: false },
  { label: 'Prometheus',      accent: false },
  { label: 'OpenTelemetry',   accent: false },
  { label: 'GitHub OIDC',     accent: false },
  { label: 'AWS · GCP · Azure', accent: false },
  { label: 'MCP · 39 tools',  accent: true },
]
</script>

<style lang="scss" scoped>
.trust-strip {
  display: grid;
  grid-template-columns: 1fr 2fr;
  align-items: stretch;
  border-bottom: 1px solid var(--line);
  background: var(--ink-2);

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }

  &__label {
    padding: 18px var(--pad-x, clamp(20px, 4vw, 56px));
    border-right: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;

    @media (max-width: 960px) {
      border-right: none;
      border-bottom: 1px solid var(--line);
    }
  }

  &__lab {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-3);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  &__sub {
    font-size: 13px;
    color: var(--fg-2);
    max-width: 36ch;
  }

  &__chips {
    padding: 14px var(--pad-x, clamp(20px, 4vw, 56px));
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  &__chip {
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--fg-2);
    border: 1px solid var(--line-2);
    padding: 6px 10px;
    border-radius: 4px;
    letter-spacing: 0.02em;
    display: inline-flex;
    align-items: center;
    gap: 8px;

    &::before {
      content: '';
      width: 5px;
      height: 5px;
      background: var(--fg-3);
      border-radius: 1px;
      flex-shrink: 0;
    }

    &--accent {
      color: var(--accent);
      border-color: #1d3a40;
      background: rgba(0, 229, 255, 0.04);

      &::before { background: var(--accent); }
    }
  }
}
</style>
