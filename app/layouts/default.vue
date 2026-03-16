<template>
  <AppHeader />
  <main class="main">
    <slot />
  </main>
  <AppFooter />
</template>

<style lang="scss" scoped>
.main {
  padding: 80px 0 0;
}
</style>
