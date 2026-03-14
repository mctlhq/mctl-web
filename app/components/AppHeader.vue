<script setup lang="ts">
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
        <span class="logo-m">M</span>CTL
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
  width: 100%;
  padding: 20px 0;
  background: rgba(5, 8, 22, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-glass-border);
}
</style>
