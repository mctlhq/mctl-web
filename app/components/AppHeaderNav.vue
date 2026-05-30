<script setup lang="ts">
defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const navLinks = [
  { label: 'Pain',         num: '01', href: '/#pain' },
  { label: 'Platform',     num: '02', href: '/#features' },
  { label: 'How it works', num: '03', href: '/#how-it-works' },
  { label: 'Who it\'s for', num: '04', href: '/#audience' },
  { label: 'Stack',        num: '05', href: '/#stack' },
  { label: 'Plans',        num: '06', href: '/#pricing' },
]
</script>

<template>
  <nav class="app-header-nav" :class="{ 'app-header-nav--open': open }">
    <a
      v-for="link in navLinks"
      :key="link.href"
      :href="link.href"
      class="app-header-nav__link"
      @click="emit('close')"
    >
      {{ link.label }}<sup class="app-header-nav__num">{{ link.num }}</sup>
    </a>
  </nav>
</template>

<style lang="scss" scoped>
.app-header-nav {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;

  &__link {
    text-decoration: none;
    color: var(--fg-2);
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 400;
    letter-spacing: 0.01em;
    transition: color 0.2s;
    white-space: nowrap;

    &:hover { color: var(--fg); }
  }

  &__num {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--fg-3);
    vertical-align: super;
    margin-left: 3px;
    letter-spacing: 0;
  }

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    gap: 24px;
  }
}
</style>
