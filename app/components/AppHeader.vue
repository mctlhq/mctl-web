<script lang="ts" setup>
import { useTemplateRef } from 'vue';
import { onClickOutside } from '@vueuse/core';
import BaseBurger from './shared/BaseBurger.vue';

const target = useTemplateRef('target');
const menuOpen = ref(false);

onClickOutside(target, () => { menuOpen.value = false; });

function toggleMenu() { menuOpen.value = !menuOpen.value; }
function closeMenu() { menuOpen.value = false; }
</script>

<template>
  <div class="site-chrome" :class="{ 'site-chrome--menu-open': menuOpen }">
    <!-- Utility bar -->
    <div class="util-bar">
      <BaseContainer size="lg" class="util-bar__inner">
        <span class="util-bar__status">
          <span class="util-bar__dot" />Status — all systems operational
        </span>
        <div class="util-bar__links">
          <a href="https://app.mctl.ai" target="_blank" rel="noopener" class="util-bar__link">app.mctl.ai</a>
          <a href="https://docs.mctl.ai" target="_blank" rel="noopener" class="util-bar__link">docs</a>
          <a href="https://docs.mctl.ai/mcp/connecting" target="_blank" rel="noopener" class="util-bar__link">MCP connector</a>
          <a href="https://github.com/mctlhq" target="_blank" rel="noopener" class="util-bar__link">
            GitHub
            <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M2 10L10 2M4 2h6v6"/>
            </svg>
          </a>
        </div>
      </BaseContainer>
    </div>

    <!-- Primary nav -->
    <header class="app-header">
      <BaseContainer size="lg" class="app-header__container">
        <NuxtLink to="/" class="app-header__brand">
          <span class="app-header__brand-mctl">MCTL</span>
          <span class="app-header__brand-slash">/</span>
          <span class="app-header__brand-sub">control plane</span>
        </NuxtLink>

        <div ref="target" class="app-header__right">
          <AppHeaderNav :open="menuOpen" @close="closeMenu" />

          <div class="app-header__actions">
            <button class="app-header__cmd" aria-label="Command palette" @click.prevent>
              <kbd>⌘K</kbd>
            </button>
            <a
              href="https://github.com/mctlhq"
              target="_blank"
              rel="noopener"
              class="app-header__github"
            >
              <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              <span>GitHub</span>
              <svg viewBox="0 0 12 12" width="9" height="9" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true" style="opacity:0.6">
                <path d="M2 10L10 2M4 2h6v6"/>
              </svg>
            </a>
            <a href="#request-access" class="app-header__cta">
              Request access →
            </a>
          </div>
        </div>

        <BaseBurger
          :active="menuOpen"
          class="app-header__burger"
          @click="toggleMenu"
        />
      </BaseContainer>
    </header>
  </div>
</template>

<style lang="scss" scoped>
/* ===== Utility bar ===== */
.util-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 110;
  height: 32px;
  background: var(--ink-3);
  border-bottom: 1px solid var(--line);

  &__inner {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-3);
    letter-spacing: 0.02em;
  }

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--ok);
    flex-shrink: 0;
  }

  &__links {
    display: flex;
    align-items: center;
    gap: 20px;

    @media (max-width: 600px) { display: none; }
  }

  &__link {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-3);
    text-decoration: none;
    letter-spacing: 0.02em;
    display: flex;
    align-items: center;
    gap: 3px;
    transition: color 0.15s;

    &:hover { color: var(--fg-2); }
  }
}

/* ===== Primary nav ===== */
.app-header {
  position: fixed;
  top: 32px;
  left: 0;
  right: 0;
  z-index: 100;
  height: 56px;
  background: color-mix(in srgb, var(--ink) 85%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--line);

  &__container {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__brand {
    display: flex;
    align-items: baseline;
    gap: 4px;
    text-decoration: none;
    flex-shrink: 0;
  }

  &__brand-mctl {
    font-family: var(--font-mono);
    font-size: 15px;
    font-weight: 600;
    color: var(--fg);
    letter-spacing: 0.04em;
  }

  &__brand-slash {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--fg-3);
  }

  &__brand-sub {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-3);
    letter-spacing: 0.04em;
  }

  &__right {
    display: flex;
    flex-direction: column;
    gap: 24px;
    padding: 5rem 2rem 2rem;
    position: fixed;
    top: 0;
    right: -100%;
    width: 70%;
    max-width: 300px;
    height: 100vh;
    background: var(--ink-2);
    border-left: 1px solid var(--line);
    transition: right 0.3s ease;
    z-index: 999;

    @media (min-width: 768px) {
      flex-direction: row;
      align-items: center;
      gap: 32px;
      padding: 0;
      position: static;
      width: auto;
      max-width: none;
      height: auto;
      background: transparent;
      border: none;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;
  }

  &__cmd {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;

    kbd {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--fg-3);
      background: var(--ink-3);
      border: 1px solid var(--line-2);
      border-radius: 4px;
      padding: 2px 6px;
      letter-spacing: 0.03em;
    }

    @media (min-width: 768px) { display: block; }
  }

  &__github {
    display: none;
    align-items: center;
    gap: 5px;
    text-decoration: none;
    color: var(--fg-2);
    font-size: 13px;
    transition: color 0.15s;

    &:hover { color: var(--fg); }

    @media (min-width: 768px) { display: flex; }
  }

  &__cta {
    display: inline-flex;
    align-items: center;
    padding: 6px 14px;
    font-size: 13px;
    font-family: var(--font-mono);
    font-weight: 500;
    color: var(--ink);
    background: var(--accent);
    text-decoration: none;
    letter-spacing: 0.01em;
    transition: background 0.15s;
    white-space: nowrap;

    &:hover { background: var(--accent-hi); }
  }

  &__burger {
    z-index: 1001;

    @media (min-width: 768px) { display: none; }
  }
}

.site-chrome--menu-open .app-header__right {
  right: 0;
}
</style>
