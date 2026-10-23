<script setup lang="ts">
interface Props {
  tag?: string
  title?: string
  // A full-bleed section on the secondary background.
  band?: boolean
}

defineProps<Props>();
</script>

<template>
  <!-- Box, vertical rhythm and title type come from site.css
       (.mctl-site-section / __title); only the eyebrow tag and the accent
       rule under the title are mctl.ai's own. -->
  <section class="base-section mctl-site-section" :class="{ 'base-section--band': band }">
    <BaseContainer>
      <strong v-if="tag" class="base-section__tag">{{ tag }}</strong>
      <h2 v-if="title" class="base-section__title mctl-site-section__title">
        {{ title }}
      </h2>
      <slot />
    </BaseContainer>
  </section>
</template>

<style lang="scss" scoped>
.base-section {
  scroll-margin-top: var(--site-header-height, 80px);

  &--band.mctl-site-section {
    padding-top: var(--mctl-layout-section-padding);
    background-color: var(--color-bg-secondary);
  }

  &__tag {
    display: block;
    margin-bottom: 16px;

    font-family: var(--font-mono, 'JetBrains Mono', 'Fira Code', 'Courier New', monospace);
    font-size: var(--text-caption-size, 13px);
    letter-spacing: 2px;
    color: var(--color-accent);
    text-transform: uppercase;
  }

  &__title {
    position: relative;
    padding-bottom: 1.25rem;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 56px;
      height: 3px;
      border-radius: 3px;
      background: linear-gradient(90deg, var(--color-accent), transparent);
    }
  }
}
// site.css collapses the top padding between adjacent sections. That only
// reads right when both share a fill: across a band edge the title would sit
// on the colour boundary, so the padding comes back there.
.base-section--band.mctl-site-section + .mctl-site-section:not(.base-section--band) {
  padding-top: var(--mctl-layout-section-padding);
}

.base-section--band.mctl-site-section + .base-section--band.mctl-site-section {
  padding-top: 0;
}
</style>
