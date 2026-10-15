<template>
  <div class="logo-default">
    <span class="logo-default__accent">M</span>
    <span>CTL</span>
  </div>
</template>

<style lang="scss" scoped>
.logo-default {
  display: inline-flex;
  align-items: center;
  line-height: 1;
  font-size: var(--site-wordmark-size, 24px);
  font-weight: var(--site-wordmark-weight, 800);
  color: var(--color-text);
  letter-spacing: var(--site-wordmark-tracking, 2px);

  &__accent {
    color: var(--color-accent);
    margin-right: var(--site-wordmark-accent-gap, 2px);
  }
}
</style>
