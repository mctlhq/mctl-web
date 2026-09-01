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
  title,
} = defineProps<Props>();

const panelStyle = computed(() =>
  maxWidth ? { maxWidth: `min(${maxWidth}, 100%)` } : undefined,
);

const open = defineModel<boolean>({ default: false });
const panelRef = ref<HTMLElement | null>(null);
let lastActive: HTMLElement | null = null;

function close() {
  open.value = false;
}

function onOverlayClick() {
  if (closeOnOverlay) {
    close();
  }
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(): HTMLElement[] {
  const panel = panelRef.value;
  if (!panel) return [];
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null,
  );
}

// Trap Tab/Shift+Tab inside the dialog so focus cannot escape to the page
// behind the modal. With no focusable children, keep focus on the panel.
function onTab(e: KeyboardEvent) {
  const panel = panelRef.value;
  if (!panel) return;
  const els = focusables();
  if (els.length === 0) {
    e.preventDefault();
    panel.focus();
    return;
  }
  const first = els[0]!;
  const last = els[els.length - 1]!;
  const active = document.activeElement as HTMLElement | null;
  if (e.shiftKey) {
    if (active === first || active === panel) {
      e.preventDefault();
      last.focus();
    }
  } else if (active === last) {
    e.preventDefault();
    first.focus();
  }
}

// Move focus into the dialog on open and restore it to the trigger on close.
watch(open, async (isOpen) => {
  if (import.meta.server) return;
  if (isOpen) {
    lastActive = (document.activeElement as HTMLElement) ?? null;
    await nextTick();
    panelRef.value?.focus();
  } else if (lastActive) {
    lastActive.focus?.();
    lastActive = null;
  }
}, { immediate: true });
</script>

<template>
  <Teleport :to="teleportTo">
    <div
      v-if="open"
      class="base-modal"
      @click.self="onOverlayClick"
      @keydown.esc="close"
      @keydown.tab="onTab"
    >
      <div
        ref="panelRef"
        class="base-modal__panel"
        :class="{ 'base-modal__panel--align-center': align === 'center' }"
        :style="panelStyle"
        role="dialog"
        aria-modal="true"
        :aria-label="title ? undefined : 'Dialog'"
        :aria-labelledby="title ? 'base-modal-title' : undefined"
        tabindex="-1"
      >
        <header
          v-if="$slots.header || title"
          class="base-modal__header"
        >
          <slot name="header">
            <h2
              v-if="title"
              id="base-modal-title"
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
    outline: none;

    color: var(--color-text);
    background: var(--color-terminal);
    border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);

    &--align-center {
      text-align: center;
    }
  }

  &__header {
    margin-bottom: 1rem;
  }

  &__title {
    margin: 0;
    color: var(--color-text);
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
