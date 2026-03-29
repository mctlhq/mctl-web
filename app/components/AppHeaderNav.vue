<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const sectionLinks = computed(() => [
  { label: t('nav.platform'), section: '#features' },
  { label: t('nav.how_it_works'), section: '#how-it-works' },
  { label: t('nav.pricing'), section: '#pricing' },
  { label: t('nav.contact'), section: '#contact' },
])

const pageLinks = computed(() => [
  { label: 'Docs', href: 'https://docs.mctl.ai' },
])
</script>

<template>
  <div class="app-header-nav">
    <a
      v-for="item in sectionLinks"
      :key="item.section"
      :href="item.section"
      class="app-header-nav__link"
      @click="emit('close')"
    >
      {{ item.label }}
    </a>
    <a
      v-for="item in pageLinks"
      :key="item.href"
      :href="item.href"
      target="_blank"
      rel="noopener noreferrer"
      class="app-header-nav__link"
      @click="emit('close')"
    >
      {{ item.label }}
    </a>
    <a
      href="https://github.com/mctlhq"
      target="_blank"
      rel="noopener noreferrer"
      class="nav-github"
      aria-label="GitHub"
      @click="emit('close')"
    >
      <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
      </svg>
    </a>
  </div>
</template>

<style lang="scss" scoped>
.app-header-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  &__link {
    text-decoration: none;
    color: var(--color-text-muted);
    font-size: 0.95rem;
    font-weight: 500;
    transition: color 0.3s ease;

    &:hover {
      color: var(--color-accent);
    }
  }

  @media (min-width: 768px) {
    flex-direction: row;
    gap: 28px;
  }
}
</style>
