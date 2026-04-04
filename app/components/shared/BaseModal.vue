<script setup lang="ts">
interface Props {
  title?: string;
  /** CSS length for panel `max-width`, e.g. `480px` */
  maxWidth?: string;
  closeOnOverlay?: boolean;
  teleportTo?: string | HTMLElement;
  align?: 'start' | 'center';
}

const {
  closeOnOverlay = true,
  teleportTo = 'body',
  align = 'start',
  maxWidth,
} = defineProps<Props>();

const panelStyle = computed(() =>
  maxWidth ? { maxWidth: `min(${maxWidth}, 100%)` } : undefined,
);

const open = defineModel<boolean>({ default: false });

function close() {
  open.value = false;
}

function onOverlayClick() {
  if (closeOnOverlay) {
    close();
  }
}
</script>

<template>
  <Teleport :to="teleportTo">
    <div
      v-if="open"
      class="base-modal"
      @click.self="onOverlayClick"
    >
      <div
        class="base-modal__panel"
        :class="{ 'base-modal__panel--align-center': align === 'center' }"
        :style="panelStyle"
      >
        <header
          v-if="$slots.header || title"
          class="base-modal__header"
        >
          <slot name="header">
            <h2
              v-if="title"
              class="base-modal__title"
            >
              {{ title }}
            </h2>
          </slot>
        </header>
        <div class="base-modal__body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
.base-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  box-sizing: border-box;

  background: rgba(0, 0, 0, 0.75);

  &__panel {
    box-sizing: border-box;
    width: 100%;
    max-width: min(400px, 100%);
    padding: 2rem;
    border-radius: 8px;
    text-align: start;

    color: var(--color-text);
    background: var(--color-terminal);
    border: 1px solid rgba(0, 245, 255, 0.3);

    &--align-center {
      text-align: center;
    }
  }

  &__header {
    margin-bottom: 1rem;
  }

  &__title {
    margin: 0;
    color: #fff;
    font-size: 1.25rem;
    font-weight: 600;
    line-height: 1.3;
  }

  &__body {
    &:empty {
      display: none;
    }

    :deep(p) {
      margin: 0 0 1rem;
      font-size: 0.95rem;
      line-height: 1.5;
      color: var(--color-text);

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}
</style>
