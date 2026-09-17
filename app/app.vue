<script setup lang="ts">
// Without a canonical the prerendered output has none, so Google picks its own
// between `/docs` and `/docs/` (and the http variants) and reports "Duplicate
// without user-selected canonical". nginx serves the prerendered
// `docs/index.html` at the trailing-slash path, so that is the canonical form.
const route = useRoute();
const canonical = computed(() => {
  const path = route.path.endsWith('/') ? route.path : `${route.path}/`;
  return `https://mctl.ai${path}`;
});

useHead({
  link: [{ rel: 'canonical', href: canonical }],
});
</script>

<template>
  <div class="app">
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<style lang="scss">
@use "~/assets/scss/base.scss";
</style>
