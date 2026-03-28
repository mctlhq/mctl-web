<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const router = useRouter()

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

function scrollToId(sectionId: string) {
  const section = document.getElementById(sectionId)
  if (!section) return
  const navHeight = (document.querySelector('.navbar') as HTMLElement)?.offsetHeight ?? 70
  // Scroll to the section-tag inside the section so it lands right below the navbar,
  // matching the visual position of section-tags on /mcp and /docs page heroes
  const tag = section.querySelector<HTMLElement>('.section-tag')
  const target = tag ?? section
  const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 16
  window.scrollTo({ top, behavior: 'smooth' })
}

async function scrollTo(sectionId: string) {
  emit('close')
  if (route.path === '/') {
    scrollToId(sectionId)
  } else {
    await router.push('/')
    await nextTick()
    setTimeout(() => scrollToId(sectionId), 120)
  }
}

const sectionLinks = computed(() => [
  { label: t('nav.platform'), section: 'features' },
  { label: t('nav.how_it_works'), section: 'how-it-works' },
  { label: t('nav.pricing'), section: 'pricing' },
  { label: t('nav.contact'), section: 'contact' },
])

const pageLinks = computed(() => [
  { label: 'Docs', href: 'https://docs.mctl.ai' },
])
</script>

<template>
  <div class="nav-links" :class="{ active: open }">
    <a
      v-for="item in sectionLinks"
      :key="item.section"
      href="#"
      @click.prevent="scrollTo(item.section)"
    >
      {{ item.label }}
    </a>
    <a
      v-for="item in pageLinks"
      :key="item.href"
      :href="item.href"
      target="_blank"
      rel="noopener noreferrer"
      @click="emit('close')"
    >
      {{ item.label }}
    </a>
  </div>
</template>
