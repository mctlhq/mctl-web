<template>
  <div class="base-card">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.base-card {
  background: var(--color-terminal);
  padding: 20px 32px;
  border-radius: 8px;
  border: 1px solid rgba(0, 245, 255, 0.2);
}
</style>
