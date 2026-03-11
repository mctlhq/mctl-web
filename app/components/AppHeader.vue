<template>
  <header class="app-header">
    <div class="app-header__wrapper">
      <div class="app-header__left">
        <NuxtLink to="/" class="app-header__logo-wrapper">
          <LogoDefault />
        </NuxtLink>
      </div>
      <div class="app-header__right">
        <AppHeaderNav />
        <BaseButton
          variant="secondary"
          @click="$router.push({ hash: '#request-access' })"
        >
          Request access
        </BaseButton>
      </div>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.app-header {
  padding: 20px 0;
  background: rgba(5, 8, 22, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-glass-border);

  &__wrapper {
    width: var(--container-width);
    margin: 0 auto;

    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 40px;
  }
}
</style>
