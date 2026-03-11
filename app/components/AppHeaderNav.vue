<script setup lang="ts">
const navConfig = [
  { name: 'Platform', path: '#platform' },
  { name: "Docs", path: "/docs" },
]
</script>

<template>
  <nav class="app-header-nav">
    <ul class="app-header-nav__list">
      <li
        v-for="item in navConfig"
        :key="item.name"
        class="app-header-nav__item"
      >
        <NuxtLink :to="item.path" class="app-header-nav__link">
          {{ item.name }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style lang="scss" scoped>
.app-header-nav {
  &__list {
    display: flex;
    gap: 40px;
  }
}
</style>
