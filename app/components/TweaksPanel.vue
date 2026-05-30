<script setup lang="ts">
const open = ref(false)

const accents = [
  { key: 'cyan',      label: 'Cyan',      color: '#00e5ff' },
  { key: 'lime',      label: 'Acid lime', color: '#bdf24a' },
  { key: 'vermilion', label: 'Vermilion', color: '#ff5a36' },
  { key: 'lilac',     label: 'Lilac',     color: '#b07aff' },
]

const surfaces = [
  { key: 'dark',  label: 'Engineering (dark)' },
  { key: 'light', label: 'Editorial (paper)' },
]

const voices = [
  { key: 'eng',      label: 'Eng' },
  { key: 'bold',     label: 'Bold' },
  { key: 'editorial', label: 'Editorial' },
]

const headlines = [
  'Auto',
  'The platform team you didn\'t have to hire',
  'Production Kubernetes, day one',
  'kubectl is the fallback now',
  'Run Kubernetes like a 100-person platform team',
  'The platform team is now an agent',
  'Ship code. Sleep through the night.',
  'Kubernetes, finally civilized',
]

const activeAccent   = ref('cyan')
const activeSurface  = ref('dark')
const activeHeadline = inject('tweaks-headline', ref(5))
const activeVoice    = inject('tweaks-voice', ref('eng'))

const LS_KEY = 'mctl-tweaks'

onMounted(() => {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? '{}')
    if (saved.accent)   { activeAccent.value  = saved.accent;  applyAccent(saved.accent) }
    if (saved.surface)  { activeSurface.value = saved.surface; applySurface(saved.surface) }
    if (saved.voice)    activeVoice.value    = saved.voice
    if (saved.headline != null) activeHeadline.value = saved.headline
  } catch { /* ignore */ }
})

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify({
    accent: activeAccent.value,
    surface: activeSurface.value,
    voice: activeVoice.value,
    headline: activeHeadline.value,
  }))
}

function applyAccent(key: string) {
  document.documentElement.removeAttribute('data-accent')
  if (key !== 'cyan') document.documentElement.setAttribute('data-accent', key)
  activeAccent.value = key
  save()
}

function applySurface(key: string) {
  if (key === 'light') document.documentElement.setAttribute('data-surface', 'light')
  else document.documentElement.removeAttribute('data-surface')
  activeSurface.value = key
  save()
}

function setVoice(key: string) {
  activeVoice.value = key
  save()
}

function setHeadline(idx: number) {
  activeHeadline.value = idx === 0 ? (activeVoice.value === 'bold' ? 6 : 0) : idx - 1
  save()
}
</script>

<template>
  <div class="tweaks" :class="{ 'tweaks--open': open }">
    <!-- Toggle button -->
    <button class="tweaks__toggle" :aria-expanded="open" @click="open = !open">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <circle cx="8" cy="4" r="1.5"/>
        <circle cx="8" cy="12" r="1.5"/>
        <line x1="1" y1="4" x2="5.5" y2="4"/>
        <line x1="10.5" y1="4" x2="15" y2="4"/>
        <line x1="1" y1="12" x2="5.5" y2="12"/>
        <line x1="10.5" y1="12" x2="15" y2="12"/>
      </svg>
      Tweaks
    </button>

    <!-- Panel -->
    <div v-if="open" class="tweaks__panel">
      <div class="tweaks__row">
        <span class="tweaks__label marker">Accent</span>
        <div class="tweaks__options">
          <button
            v-for="a in accents"
            :key="a.key"
            class="tweaks__swatch"
            :class="{ 'tweaks__swatch--active': activeAccent === a.key }"
            :title="a.label"
            :style="{ '--sw': a.color }"
            @click="applyAccent(a.key)"
          >
            <span class="tweaks__swatch-dot" />
            {{ a.label }}
          </button>
        </div>
      </div>

      <div class="tweaks__row">
        <span class="tweaks__label marker">Surface</span>
        <div class="tweaks__options">
          <button
            v-for="s in surfaces"
            :key="s.key"
            class="tweaks__opt"
            :class="{ 'tweaks__opt--active': activeSurface === s.key }"
            @click="applySurface(s.key)"
          >{{ s.label }}</button>
        </div>
      </div>

      <div class="tweaks__row">
        <span class="tweaks__label marker">Lede voice</span>
        <div class="tweaks__options">
          <button
            v-for="v in voices"
            :key="v.key"
            class="tweaks__opt"
            :class="{ 'tweaks__opt--active': activeVoice === v.key }"
            @click="setVoice(v.key)"
          >{{ v.label }}</button>
        </div>
      </div>

      <div class="tweaks__row">
        <span class="tweaks__label marker">Headline</span>
        <div class="tweaks__options tweaks__options--col">
          <button
            v-for="(h, i) in headlines"
            :key="i"
            class="tweaks__opt tweaks__opt--hl"
            :class="{ 'tweaks__opt--active': activeHeadline === (i === 0 ? activeHeadline : i - 1) && i !== 0 || i === 0 }"
            @click="setHeadline(i)"
          >{{ h }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.tweaks {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;

  &__toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--fg-2);
    background: var(--ink-3);
    border: 1px solid var(--line-2);
    cursor: pointer;
    transition: all 0.15s;

    &:hover { color: var(--fg); border-color: var(--accent); }
  }

  &__panel {
    width: 300px;
    background: var(--ink-2);
    border: 1px solid var(--line-2);
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__row {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__label { color: var(--fg-3); }

  &__options {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    &--col { flex-direction: column; }
  }

  &__opt {
    padding: 4px 10px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-3);
    background: var(--ink-3);
    border: 1px solid var(--line);
    cursor: pointer;
    text-align: left;
    transition: all 0.1s;

    &:hover { color: var(--fg-2); border-color: var(--line-2); }

    &--active {
      color: var(--accent);
      border-color: var(--accent);
      background: color-mix(in srgb, var(--accent) 8%, transparent);
    }

    &--hl {
      font-size: 11px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  &__swatch {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-3);
    background: var(--ink-3);
    border: 1px solid var(--line);
    cursor: pointer;
    transition: all 0.1s;

    &:hover { color: var(--fg-2); }

    &--active {
      color: var(--sw);
      border-color: var(--sw);
      background: color-mix(in srgb, var(--sw) 8%, transparent);
    }

    &-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--sw);
      flex-shrink: 0;
    }
  }
}
</style>
