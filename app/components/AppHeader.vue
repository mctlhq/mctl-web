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
        <a
          href="https://github.com/mctlhq"
          target="_blank"
          rel="noopener noreferrer"
          class="app-header__github"
          aria-label="GitHub"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836a9.59 9.59 0 012.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
        </a>
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

  &__github {
    color: var(--color-text-secondary, #8b8fa3);
    transition: color 0.2s ease;
    display: flex;
    align-items: center;

    &:hover {
      color: #fff;
    }
  }
}
</style>
