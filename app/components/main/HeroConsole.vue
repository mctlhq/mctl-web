<template>
  <div class="hero-console">
    <!-- Tab bar (decorative — the console is a static mockup) -->
    <div class="hero-console__tabs" aria-hidden="true">
      <span class="hero-console__tab hero-console__tab--active">~/checkout-web</span>
      <span class="hero-console__tab">~/payments-api</span>
      <span class="hero-console__tab hero-console__tab--add">+</span>
    </div>

    <!-- Team header -->
    <div class="hero-console__topbar">
      <span class="hero-console__topbar-item">team: <strong>team/checkout</strong></span>
      <span class="hero-console__topbar-sep">·</span>
      <span class="hero-console__topbar-item">ns: <strong>checkout</strong></span>
    </div>

    <!-- Chat -->
    <div class="hero-console__chat">
      <div class="hero-console__msg hero-console__msg--you">
        <span class="hero-console__msg-from">you →</span>
        <span>ship checkout-web. attach postgres, TLS on checkout.acme.dev, preview env for PR #214.</span>
      </div>
      <div class="hero-console__msg hero-console__msg--mctl">
        <span class="hero-console__msg-from">mctl →</span>
        <span>2 PRs on <code>team/checkout-gitops</code>. Vault refs only. ArgoCD syncs on merge.</span>
      </div>
      <div class="hero-console__msg hero-console__msg--you">
        <span class="hero-console__msg-from">you →</span>
        <span>scale payments-api 6–12 for the sale. rollback if p99 &gt; 400 ms.</span>
      </div>
      <div class="hero-console__msg hero-console__msg--mctl">
        <span class="hero-console__msg-from">mctl →</span>
        <span>window 12:00–18:00, gate on p99. <em>mctl-agent</em> on AlertManager — fix PR if SLOs trip.</span>
      </div>
    </div>

    <!-- Run log -->
    <div class="hero-console__log">
      <div class="hero-console__log-row">
        <span class="hero-console__log-time">12:04:11</span>
        <span class="hero-console__log-dot hero-console__log-dot--ok" />
        <span class="hero-console__log-text">service <strong>checkout-web</strong> from <em>node-api</em> template</span>
        <span class="hero-console__log-tag">catalog</span>
      </div>
      <div class="hero-console__log-row">
        <span class="hero-console__log-time">12:04:13</span>
        <span class="hero-console__log-dot hero-console__log-dot--ok" />
        <span class="hero-console__log-text">postgres <strong>checkout-db</strong> · 1 vCPU · backups on</span>
        <span class="hero-console__log-tag">crunchy-pg</span>
      </div>
      <div class="hero-console__log-row">
        <span class="hero-console__log-time">12:04:14</span>
        <span class="hero-console__log-dot hero-console__log-dot--ok" />
        <span class="hero-console__log-text">vault path <strong>kv/team/checkout/db</strong> · cert-manager TLS</span>
        <span class="hero-console__log-tag">vault · cm</span>
      </div>
      <div class="hero-console__log-row">
        <span class="hero-console__log-time">12:04:15</span>
        <span class="hero-console__log-dot hero-console__log-dot--warn" />
        <span class="hero-console__log-text">preview env <strong>pr-214.checkout.dev</strong> · 7-day TTL</span>
        <span class="hero-console__log-tag">policy/auto</span>
      </div>
      <div class="hero-console__log-row">
        <span class="hero-console__log-time">12:04:16</span>
        <span class="hero-console__log-dot hero-console__log-dot--ok" />
        <span class="hero-console__log-text">argocd sync queued — merge to apply</span>
        <span class="hero-console__log-tag">ops.mctl.ai</span>
      </div>
    </div>

    <!-- Input strip -->
    <div class="hero-console__input">
      <span class="hero-console__input-prompt">say what you need · or use</span>
      <span class="hero-console__input-cmds">/deploy /scale /rollback /preview</span>
      <span class="hero-console__input-badge">2 PRs · audited</span>
    </div>

    <!-- Side meta panels -->
    <div class="hero-console__meta">
      <div class="hero-console__meta-item">
        <span class="hero-console__meta-key">workspace</span>
        <span class="hero-console__meta-val">team/checkout — namespace + RBAC + quotas</span>
      </div>
      <div class="hero-console__meta-item">
        <span class="hero-console__meta-key">desired state</span>
        <span class="hero-console__meta-val">git@team/checkout-gitops — argocd reconciles</span>
      </div>
      <div class="hero-console__meta-item">
        <span class="hero-console__meta-key">secrets</span>
        <span class="hero-console__meta-val">vault · kv/team/checkout — references, never values</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.hero-console {
  background: var(--ink-3);
  border: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.5;

  &__tabs {
    display: flex;
    border-bottom: 1px solid var(--line);
    background: var(--ink-2);
  }

  &__tab {
    padding: 8px 14px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-3);
    background: none;
    border: none;
    border-right: 1px solid var(--line);
    cursor: pointer;
    transition: color 0.15s;

    &--active {
      color: var(--fg);
      background: var(--ink-3);
      border-bottom: 1px solid var(--ink-3);
      margin-bottom: -1px;
    }

    &--add { color: var(--fg-3); }
    &:hover:not(&--active) { color: var(--fg-2); }
  }

  &__topbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-bottom: 1px solid var(--line);
    background: var(--ink-2);

    &-item {
      font-size: 11px;
      color: var(--fg-3);

      strong { color: var(--fg-2); font-weight: 500; }
    }

    &-sep { color: var(--line-2); }
  }

  &__chat {
    padding: 14px;
    border-bottom: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__msg {
    display: flex;
    gap: 8px;
    font-size: 12px;
    line-height: 1.55;

    &-from {
      flex-shrink: 0;
      font-weight: 600;
    }

    &--you &-from { color: var(--accent); }
    &--mctl &-from { color: var(--fg-2); }
    &--you span:last-child { color: var(--fg-2); }
    &--mctl span:last-child { color: var(--fg); }

    code {
      color: var(--syn-key);
      background: none;
    }

    em { font-style: italic; color: var(--fg-2); }
  }

  &__log {
    padding: 10px 14px;
    border-bottom: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  &__log-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
  }

  &__log-time {
    color: var(--fg-3);
    min-width: 58px;
    flex-shrink: 0;
  }

  &__log-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;

    &--ok   { background: var(--ok); }
    &--warn { background: var(--warn); }
    &--bad  { background: var(--bad); }
  }

  &__log-text {
    color: var(--fg-2);
    flex: 1;

    strong { color: var(--fg); font-weight: 500; }
    em { color: var(--fg-3); font-style: normal; }
  }

  &__log-tag {
    font-size: 10px;
    color: var(--fg-3);
    background: var(--ink-2);
    border: 1px solid var(--line);
    padding: 1px 6px;
    border-radius: 2px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__input {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 8px 14px;
    border-bottom: 1px solid var(--line);

    &-prompt { font-size: 11px; color: var(--fg-3); }
    &-cmds   { font-size: 11px; color: var(--accent); }
    &-badge  {
      margin-left: auto;
      font-size: 10px;
      color: var(--ok);
      background: color-mix(in srgb, var(--ok) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--ok) 30%, transparent);
      padding: 2px 8px;
      border-radius: 2px;
    }
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  &__meta-item {
    display: flex;
    gap: 12px;
    padding: 7px 14px;
    border-top: 1px solid var(--line);

    &:first-child { border-top: none; }
  }

  &__meta-key {
    font-size: 10px;
    color: var(--fg-3);
    min-width: 76px;
    flex-shrink: 0;
    padding-top: 1px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  &__meta-val {
    font-size: 11px;
    color: var(--fg-2);
    line-height: 1.45;
  }
}
</style>
