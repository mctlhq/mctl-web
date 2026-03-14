<script setup lang="ts">
const { t } = useI18n()

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const navItems = computed(() => [
  { label: t('nav.platform'), href: '#features' },
  { label: t('nav.how_it_works'), href: '#how-it-works' },
  { label: t('nav.pricing'), href: '#pricing' },
  { label: 'MCP', href: '/mcp/', accent: true },
  { label: 'Docs', href: '/docs/' },
  { label: 'Source', href: 'https://github.com/mctlhq', external: true },
  { label: t('nav.contact'), href: '#contact' },
])
</script>

<template>
  <div class="nav-links" :class="{ active: open }">
    <a
      v-for="item in navItems"
      :key="item.href"
      :href="item.href"
      :target="item.external ? '_blank' : undefined"
      :rel="item.external ? 'noopener noreferrer' : undefined"
      :style="item.accent ? 'color: var(--color-accent)' : undefined"
      @click="emit('close')"
    >
      {{ item.label }}
    </a>
    <a
      href="#request-access"
      class="nav-cta"
      @click="emit('close')"
    >
      {{ t('nav.request_access') }}
    </a>
  </div>
</template>
