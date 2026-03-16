<script lang="ts" setup>
import GithubIcon from '@/assets/icons/github.svg';

const { t } = useI18n()

const menuOpen = ref(false)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
  document.body.style.overflow = menuOpen.value ? 'hidden' : ''
}

function closeMenu() {
  menuOpen.value = false
  document.body.style.overflow = ''
}
</script>

<template>
  <header class="app-header">
    <BaseContainer class="app-header__container">
      <div class="app-header__left">
        <NuxtLink to="/" class="app-header__logo-wrapper">
          <LogoDefault />
        </NuxtLink>
      </div>
      <div class="app-header__right">
        <AppHeaderNav :open="menuOpen" @close="closeMenu" />
        <a
          href="https://github.com/mctlhq"
          target="_blank"
          rel="noopener noreferrer"
          class="app-header__github"
          aria-label="GitHub"
        >
          <GithubIcon />
        </a>
        <BaseButton
          variant="secondary"
          @click="$router.push({ hash: '#request-access' })"
        >
          {{ t('nav.request_access') }}
        </BaseButton>
      </div>
    </BaseContainer>
  </header>
</template>

<style lang="scss" scoped>
.app-header {
  position: fixed;
  z-index: 100;
  width: 100%;
  padding: 20px 0;
  background: rgba(5, 8, 22, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-glass-border);

  &__container {
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
    display: flex;
    align-items: center;
    color: var(--color-text-muted);
    transition: color 0.2s;

    &:hover {
      color: var(--color-text);
    }
  }
}
</style>
