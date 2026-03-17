<script setup lang="ts">
interface Props {
  tag?: string
  title?: string
}

defineProps<Props>();
</script>

<template>
  <section class="base-section">
    <BaseContainer>
      <strong v-if="tag" class="base-section__tag">{{ tag }}</strong>
      <h2 v-if="title" class="base-section__title">
        {{ title }}
      </h2>
      <slot />
    </BaseContainer>
  </section>
</template>

<style lang="scss" scoped>
.base-section {
  padding: 60px 0;

  &__tag {
    display: block;
    margin-bottom: 16px;

    text-align: center;
    font-size: .8rem;
    letter-spacing: 2px;
    color: var(--color-accent);
    text-transform: uppercase;
  }

  &__title {
    margin-bottom: 48px;
    text-align: center;
    letter-spacing: -1px;
  }
}
</style>
