<script lang="ts" setup>
import { useTemplateRef } from 'vue';
import { onClickOutside, onKeyStroke, useMediaQuery } from '@vueuse/core';

const { t } = useI18n();
const route = useRoute();

const nav = useTemplateRef<HTMLElement>('nav');
const burger = useTemplateRef<HTMLElement>('burger');

const menuOpen = ref(false);

const sectionLinks = computed(() => [
  { label: t('nav.how_it_works'), section: '/#orchestration' },
  { label: t('nav.platform'), section: '/#features' },
  { label: t('nav.pricing'), section: '/#pricing' },
  { label: t('nav.contact'), section: '/#contact' },
]);

const pageLinks = computed(() => [
  { label: 'Docs', href: 'https://docs.mctl.ai' },
  { label: 'Alice MCP', href: 'https://alice.mctl.ai' },
  { label: 'Telegram MCP', href: 'https://tg.mctl.ai' },
]);

function toggleMenu() {
  menuOpen.value = !menuOpen.value;
}

function closeMenu(returnFocus = false) {
  if (!menuOpen.value) return;
  menuOpen.value = false;
  if (returnFocus) burger.value?.focus();
}

function requestAccess() {
  closeMenu();
  navigateTo('/#request-access');
}

// site.css owns the look (data-nav-open on the header opens the drawer up to
// 980px: seven links, the GitHub mark and the button need that much room); the behaviour is here: outside click (the scrim is the header's
// ::after, so it counts as outside the nav), Escape with focus returned to the
// burger, route change, and the viewport growing past the breakpoint.
onClickOutside(nav, () => closeMenu(), { ignore: [burger] });
onKeyStroke('Escape', () => closeMenu(true));
watch(() => route.fullPath, () => closeMenu());
const isWide = useMediaQuery('(min-width: 981px)');
watch(isWide, (wide) => {
  if (wide) closeMenu();
});
</script>

<template>
  <header
    class="app-header mctl-site-header mctl-site-header--drawer-wide"
    :data-nav-open="menuOpen ? '' : null"
  >
    <BaseContainer class="mctl-site-header__inner">
      <NuxtLink to="/" class="mctl-site-brand">
        <span class="mctl-site-brand__accent">M</span>CTL
      </NuxtLink>
      <nav
        id="site-nav"
        ref="nav"
        class="mctl-site-nav"
        :aria-label="t('nav.main_label')"
      >
        <a
          v-for="item in sectionLinks"
          :key="item.section"
          :href="item.section"
          @click="closeMenu()"
        >
          {{ item.label }}
        </a>
        <a
          v-for="item in pageLinks"
          :key="item.href"
          :href="item.href"
          target="_blank"
          rel="noopener noreferrer"
          @click="closeMenu()"
        >
          {{ item.label }}
        </a>
        <a
          href="https://github.com/mctlhq"
          target="_blank"
          rel="noopener noreferrer"
          class="nav-github"
          aria-label="GitHub"
          @click="closeMenu()"
        >
          <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </a>
        <BaseButton variant="secondary" @click="requestAccess">
          {{ t('nav.request_access') }}
        </BaseButton>
      </nav>
      <button
        ref="burger"
        class="mctl-site-burger"
        type="button"
        :aria-label="t('nav.burger_label')"
        aria-controls="site-nav"
        :aria-expanded="menuOpen"
        @click="toggleMenu"
      />
    </BaseContainer>
  </header>
</template>

<style lang="scss" scoped>
// Bar, height, blur, border, brand, nav and the burger drawer all come from
// site.css (.mctl-site-header, __inner, .mctl-site-brand, .mctl-site-nav,
// .mctl-site-burger). The local rules keep the bar above section content and
// the links on one line.
.app-header {
  // site.css's z-index would let section content with a z-index slide over the bar.
  z-index: 100;
}

// Seven links and a button: a link wraps onto two lines before the drawer
// takes over unless it is told not to.
.app-header :deep(.mctl-site-nav a) {
  white-space: nowrap;
}
</style>
