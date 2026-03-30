<script lang="ts" setup>
import { useTemplateRef } from 'vue';
import { onClickOutside } from '@vueuse/core';

import BaseBurger from './shared/BaseBurger.vue';

const { t } = useI18n();

const target = useTemplateRef('target');

const menuOpen = ref(false);

onClickOutside(target, () => {
  menuOpen.value = false;
});

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function closeMenu() {
  menuOpen.value = false;
}
</script>

<template>
  <header
    class="app-header"
    :class="{ 'app-header--menu-open': menuOpen }"
  >
    <BaseContainer size="lg" class="app-header__container">
      <div class="app-header__left">
        <NuxtLink to="/" class="app-header__logo">
          <LogoDefault />
        </NuxtLink>
      </div>
      <div ref="target" class="app-header__right">
        <AppHeaderNav :open="menuOpen" @close="closeMenu" />
        <BaseButton
          variant="secondary"
          @click="$router.push('#request-access')"
        >
          {{ t('nav.request_access') }}
        </BaseButton>
      </div>
      <BaseBurger
        :active="menuOpen"
        class="app-header__burger"
        @click="toggleMenu"
      />
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

  &__logo {
    display: block;
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
      gap: 60px;
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

  &__burger {
    z-index: 1001;

    @media (min-width: 768px) {
      display: none;
    }
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100vh;
    background: rgba(5, 8, 22, 0.8);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--color-glass-border);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
    z-index: 1;
  }

  &--menu-open {
    .app-header__right {
      right: 0;
    }

    &::before {
      opacity: 1;
    }
  }
}
</style>
