<script lang="ts" setup>
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
  <nav class="navbar">
    <div class="container navbar-container">
      <NuxtLink to="/" class="logo">
        <LogoDefault />
      </NuxtLink>
      <div
        class="burger-menu"
        :class="{ active: menuOpen }"
        role="button"
        tabindex="0"
        :aria-label="t('nav.burger_label')"
        :aria-expanded="menuOpen"
        @click="toggleMenu"
        @keydown.enter="toggleMenu"
      >
        <span />
        <span />
        <span />
      </div>
      <AppHeaderNav :open="menuOpen" @close="closeMenu" />
      <div
        class="nav-overlay"
        :class="{ active: menuOpen }"
        @click="closeMenu"
      />
    </div>
  </nav>
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
    flex-direction: column;
    gap: 28px;
    padding: 5rem 2rem 2rem;

    position: fixed;
    top: 0;
    right: -100%;
    width: 70%;
    max-width: 300px;
    height: 100vh;

    background: var(--color-bg-secondary);
    border-left: 1px solid var(--color-glass-border);
    transition: right 0.3s ease;
    z-index: 999;

    @media (min-width: 768px) {
      flex-direction: row;
      align-items: center;
      gap: 40px;
      padding: 0;

      position: static;
      width: auto;
      max-width: none;
      height: auto;
      background: transparent;
      border: none;
    }
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
