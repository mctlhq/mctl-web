<script setup lang="ts">
import DeveloperIcon from '@/assets/icons/developer.svg';
import MctlIcon from '@/assets/icons/mctl.svg';
import CloudIcon from '@/assets/icons/cloud.svg';

const { t } = useI18n();
</script>

<template>
  <div class="orchestration-diagram">
    <BaseCard v-reveal class="orchestration-diagram__box">
      <DeveloperIcon class="orchestration-diagram__box-icon" />
      <strong class="orchestration-diagram__box-title">{{ t('orch.developer.title') }}</strong>
      <p class="orchestration-diagram__box-description">{{ t('orch.developer.desc') }}</p>
    </BaseCard>
    <div class="diagram-connector">
      <div class="diagram-connector__line" />
      <div class="diagram-connector__arrow" />
    </div>
    <BaseCard v-reveal class="orchestration-diagram__box" highlighted>
      <MctlIcon class="orchestration-diagram__box-icon" />
      <strong class="orchestration-diagram__box-title">{{ t('orch.mctl.title') }}</strong>
      <p class="orchestration-diagram__box-description">{{ t('orch.mctl.desc') }}</p>
      <div class="orchestration-diagram__box-glow" />
    </BaseCard>
    <div class="diagram-connector">
      <div class="diagram-connector__line" />
      <div class="diagram-connector__arrow" />
    </div>
    <BaseCard v-reveal class="orchestration-diagram__box">
      <CloudIcon class="orchestration-diagram__box-icon" />
      <strong class="orchestration-diagram__box-title">{{ t('orch.cloud.title') }}</strong>
      <p class="orchestration-diagram__box-description">{{ t('orch.cloud.desc') }}</p>
    </BaseCard>
  </div>
</template>

<style lang="scss" scoped>
.orchestration-diagram {
  margin-top: 80px;

  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;

  text-align: center;

  &__box {
    --card-padding: 40px 32px;
    width: clamp(200px, 15vw, 260px);
    position: relative;

    &:hover {
      .orchestration-diagram__box-icon {
        transform: scale(1.2);
      }
    }
  }

  &__box-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 150%;
    height: 150%;
    background: radial-gradient(circle, color-mix(in srgb, var(--color-accent) 5%, transparent) 0%, transparent 70%);
    z-index: -1;
  }

  &__box-icon {
    display: block;
    margin: 0 auto 16px;
    color: var(--color-accent);
    transition: all .3s ease;
  }

  &__box-title {
    margin-bottom: 0.5rem;
    font-size: 1.25rem;
    color: var(--color-text);
  }

  &__box-description {
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }
}

.diagram-connector {
  flex: 1;
  max-width: 100px;
  min-width: 40px;
  display: flex;
  align-items: center;
  position: relative;

  &__line {
    height: 2px;
    background: linear-gradient(90deg, var(--color-glass-border), var(--color-accent), var(--color-glass-border));
    width: 100%;
  }

  &__arrow {
    position: absolute;
    right: 0;
    width: 10px;
    height: 10px;
    border-top: 2px solid var(--color-accent);
    border-right: 2px solid var(--color-accent);
    transform: rotate(45deg);
  }
}

@media (max-width: 768px) {
  .orchestration-diagram {
    flex-direction: column;
    align-items: center;
    gap: 2rem;

    &__box {
      width: 100%;
      max-width: 300px;
    }
  }

  .diagram-connector {
    transform: rotate(90deg);
    height: 40px;
    min-width: auto;
    max-width: none;
    width: 2px;
  }
}
</style>
