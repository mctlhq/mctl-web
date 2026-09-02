<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <section class="hero-block">
    <div class="hero-block__glow"></div>
    <BaseContainer size="md">
      <div class="hero-block__intro">
        <span class="hero-block__badge">
          <span class="hero-block__badge-dot"></span>
          {{ t('hero.badge') }}
        </span>
        <h1>
          {{ t('hero.title') }}
        </h1>
        <p class="hero-block__description" v-html="t('hero.subtitle')" />
        <div class="hero-block__actions">
          <BaseButton
            size="lg"
            @click="$router.push({ hash: '#request-access' })"
          >
            {{ t('hero.cta') }}
          </BaseButton>
          <a class="hero-block__secondary" href="https://docs.mctl.ai">
            {{ t('hero.cta_secondary') }}
            <span aria-hidden="true">&#8594;</span>
          </a>
        </div>
      </div>

      <div class="hero-terminal" aria-hidden="true">
        <div class="hero-terminal__bar">
          <span class="hero-terminal__dot hero-terminal__dot--red"></span>
          <span class="hero-terminal__dot hero-terminal__dot--amber"></span>
          <span class="hero-terminal__dot hero-terminal__dot--green"></span>
          <span class="hero-terminal__title">mctl &mdash; deploy</span>
        </div>
        <div class="hero-terminal__body">
          <p class="hero-terminal__line">
            <span class="hero-terminal__prompt">$</span> git push origin main
          </p>
          <p class="hero-terminal__line hero-terminal__line--muted">
            &rarr; building image &middot; running tests &middot; generating manifests
          </p>
          <p class="hero-terminal__line hero-terminal__line--ok">
            &check; deployed to <span class="hero-terminal__accent">my-team</span> namespace
          </p>
          <p class="hero-terminal__line">
            <span class="hero-terminal__prompt">$</span> mctl ask <span class="hero-terminal__str">"roll my-app back to v1.4.2"</span>
          </p>
          <p class="hero-terminal__line hero-terminal__line--ok">
            &check; rollback live at <span class="hero-terminal__accent">app.mctl.ai</span><span class="hero-terminal__cursor"></span>
          </p>
        </div>
      </div>
    </BaseContainer>
  </section>
</template>

<style lang="scss" scoped>
.hero-block {
  position: relative;
  padding: 60px 0;
  min-height: calc(100vh - var(--header-height));
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;

  text-align: center;

  h1 {
    font-size: clamp(2.5rem, 4.5vw, 4.25rem);
  }

  &__intro {
    position: relative;
    z-index: 1;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.75rem;
    padding: 0.4rem 0.9rem;

    font-size: 0.75rem;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--color-accent);

    background: var(--color-accent-soft);
    border: 1px solid var(--color-glass-border);
    border-radius: 999px;
  }

  &__badge-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-accent);
    box-shadow: 0 0 8px var(--color-accent);
    animation: heroPulse 2s ease-in-out infinite;
  }

  &__description {
    max-width: 900px;
    margin: 0 auto 40px;
    text-align: center;
    font-size: 18px;
    color: var(--color-text-muted);
    line-height: 1.6;

    @media (min-width: 768px) {
      font-size: 24px;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 1.25rem;
  }

  &__secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;

    color: var(--color-text-muted);
    font-weight: 500;
    transition: color 0.25s ease, gap 0.25s ease;

    span {
      transition: transform 0.25s ease;
    }

    &:hover {
      color: var(--color-accent);

      span {
        transform: translateX(4px);
      }
    }
  }

  &__glow {
    position: absolute;
    top: 18%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 70vw;
    height: 70vw;
    max-width: 900px;
    max-height: 900px;
    // Quiet ambient wash — restrained per the design system's hairline language.
    background: radial-gradient(circle, color-mix(in srgb, var(--color-accent) 5%, transparent) 0%, transparent 65%);
    z-index: 0;
    pointer-events: none;
  }
}

// Terminal mockup — gives the hero a concrete focal point and shows
// the core "push / ask AI / live" loop in the product's own voice.
.hero-terminal {
  position: relative;
  z-index: 1;
  max-width: 640px;
  margin: 4rem auto 0;

  text-align: left;
  background: var(--color-terminal);
  border: 1px solid var(--color-glass-border);
  border-radius: 12px;
  overflow: hidden;
  backdrop-filter: blur(8px);
  box-shadow: var(--shadow-card-hover);

  &__bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.03);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  &__dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;

    &--red { background: #ff5f56; }
    &--amber { background: #ffbd2e; }
    &--green { background: #27c93f; }
  }

  &__title {
    margin-left: auto;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    letter-spacing: 0.5px;
  }

  &__body {
    padding: 1.5rem 1.5rem 1.75rem;
    // Body inherits the page's display face (Onest via CDN); force mono so
    // the terminal reads as a terminal.
    font-family: var(--font-mono, 'JetBrains Mono', 'Fira Code', 'Courier New', monospace);
    font-size: 0.85rem;
    line-height: 1.9;

    @media (max-width: 480px) {
      font-size: 0.72rem;
    }
  }

  &__line {
    margin: 0;

    &--muted { color: var(--color-text-muted); }
    &--ok { color: var(--color-success); }
  }

  &__prompt { color: var(--color-accent); }
  &__accent { color: var(--color-accent); }
  &__str { color: var(--syntax-string, #e08b5a); }

  &__cursor {
    display: inline-block;
    width: 8px;
    height: 1em;
    margin-left: 4px;
    vertical-align: text-bottom;
    background: var(--color-accent);
    animation: heroBlink 1.1s step-end infinite;
  }
}

@keyframes heroPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.85); }
}

@keyframes heroBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .hero-block__badge-dot,
  .hero-terminal__cursor { animation: none; }
}
</style>
