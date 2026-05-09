<template>
  <footer class="app-footer">
    <BaseContainer size="lg" class="app-footer__inner">
      <!-- Brand + tagline -->
      <div class="app-footer__brand">
        <span class="app-footer__brand-name">MCTL</span>
        <p class="app-footer__tagline">Self-service Kubernetes for growing product teams.</p>
      </div>

      <!-- Link columns -->
      <nav class="app-footer__cols">
        <div class="app-footer__col">
          <p class="app-footer__col-head marker">Platform</p>
          <ul class="app-footer__list">
            <li><a href="#features" class="app-footer__link">Production-ready platform</a></li>
            <li><a href="#features" class="app-footer__link">GitOps delivery</a></li>
            <li><a href="#features" class="app-footer__link">Self-service catalog</a></li>
            <li><a href="#features" class="app-footer__link">AI-native operations</a></li>
            <li><a href="#stack" class="app-footer__link">Tech stack</a></li>
          </ul>
        </div>

        <div class="app-footer__col">
          <p class="app-footer__col-head marker">Resources</p>
          <ul class="app-footer__list">
            <li><a href="https://docs.mctl.ai" target="_blank" rel="noopener" class="app-footer__link">Documentation</a></li>
            <li><a href="https://docs.mctl.ai/mcp/connecting" target="_blank" rel="noopener" class="app-footer__link">MCP connector</a></li>
            <li><a href="https://ops.mctl.ai" target="_blank" rel="noopener" class="app-footer__link">Status — ops.mctl.ai</a></li>
            <li><a href="https://github.com/mctlhq" target="_blank" rel="noopener" class="app-footer__link">GitHub — mctlhq</a></li>
          </ul>
        </div>

        <div class="app-footer__col">
          <p class="app-footer__col-head marker">Company</p>
          <ul class="app-footer__list">
            <li><a href="#pricing" class="app-footer__link">Plans</a></li>
            <li><a href="#audience" class="app-footer__link">Who it's for</a></li>
            <li><a href="#contact" class="app-footer__link">Contact</a></li>
            <li><NuxtLink to="/privacy" class="app-footer__link">Privacy policy</NuxtLink></li>
          </ul>
        </div>
      </nav>
    </BaseContainer>

    <!-- Foot meta -->
    <div class="app-footer__meta">
      <BaseContainer size="lg" class="app-footer__meta-inner">
        <div class="app-footer__meta-urls">
          <a href="https://app.mctl.ai" target="_blank" rel="noopener" class="app-footer__meta-link">app.mctl.ai</a>
          <span class="app-footer__meta-sep">·</span>
          <a href="https://ops.mctl.ai" target="_blank" rel="noopener" class="app-footer__meta-link">ops.mctl.ai</a>
          <span class="app-footer__meta-sep">·</span>
          <a href="https://workflows.mctl.ai" target="_blank" rel="noopener" class="app-footer__meta-link">workflows.mctl.ai</a>
          <span class="app-footer__meta-sep">·</span>
          <a href="https://docs.mctl.ai" target="_blank" rel="noopener" class="app-footer__meta-link">docs.mctl.ai</a>
        </div>
        <div class="app-footer__meta-right">
          <span class="app-footer__meta-tag">EN</span>
          <span class="app-footer__meta-sep">·</span>
          <span class="app-footer__meta-tag">invite-only beta</span>
          <span class="app-footer__meta-sep">·</span>
          <span class="app-footer__meta-copy">© 2026 MCTL</span>
        </div>
      </BaseContainer>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
.app-footer {
  background: var(--ink-2);
  border-top: 1px solid var(--line);

  &__inner {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 64px;
    padding-top: 56px;
    padding-bottom: 56px;
    align-items: start;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: 40px;
    }
  }

  &__brand {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__brand-name {
    font-family: var(--font-mono);
    font-size: 16px;
    font-weight: 600;
    color: var(--fg);
    letter-spacing: 0.06em;
  }

  &__tagline {
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--fg-3);
    line-height: 1.55;
    max-width: 220px;
  }

  &__cols {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;

    @media (max-width: 640px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  &__col {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  &__col-head {
    color: var(--fg-3);
    margin-bottom: 4px;
  }

  &__list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__link {
    font-family: var(--font-sans);
    font-size: 13px;
    color: var(--fg-2);
    text-decoration: none;
    transition: color 0.15s;

    &:hover { color: var(--fg); }
  }

  /* Foot meta strip */
  &__meta {
    border-top: 1px solid var(--line);
    padding: 16px 0;
  }

  &__meta-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
  }

  &__meta-urls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__meta-link {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-3);
    text-decoration: none;
    transition: color 0.15s;

    &:hover { color: var(--fg-2); }
  }

  &__meta-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__meta-tag,
  &__meta-copy {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-3);
  }

  &__meta-sep {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--line-2);
  }
}
</style>
