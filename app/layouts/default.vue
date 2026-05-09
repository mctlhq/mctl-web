<template>
  <AppHeader />
  <main class="main">
    <slot />
  </main>
  <AppFooter />
</template>

<style lang="scss" scoped>
.main {
  /* 32px utility bar + 56px primary nav */
  padding: 88px 0 0;
}
</style>
