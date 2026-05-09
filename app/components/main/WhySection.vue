<template>
  <section id="why-section" class="why-section">
    <BaseContainer size="lg" class="why-section__inner">
      <!-- Left column -->
      <div class="why-section__col">
        <p class="marker why-section__marker">S/01 · Why MCTL</p>
        <h2 class="why-section__heading">
          Most product teams don't have a platform problem.
          <del>They have a queue problem.</del>
          They have a <strong>queue</strong> problem.
        </h2>
        <p class="why-section__body">
          Hiring platform engineers is expensive. So is the alternative: developers waiting on a ticket
          every time they need a namespace, a domain, a secret, or a preview environment. MCTL gives you
          a production-grade platform without the headcount — <em>and</em> without the queue.
        </p>
      </div>

      <!-- Divider -->
      <div class="why-section__divider" aria-hidden="true" />

      <!-- Right column -->
      <div class="why-section__col">
        <p class="marker why-section__marker">S/01.B · Built for growing product teams</p>
        <h3 class="why-section__subheading">
          Self-service, not tickets. Isolation by default. Production-ready from day one.
        </h3>
        <p class="why-section__body">
          Every team gets its own namespace, RBAC, network policies and resource quotas — no
          shared-cluster risk. Push code, GitOps deploys. Secrets in Vault, TLS via cert-manager,
          SSO via GitHub. Security baked into every layer, not bolted on at audit time.
        </p>
      </div>
    </BaseContainer>
  </section>
</template>

<style lang="scss" scoped>
.why-section {
  padding: var(--section-py) 0;
  background: var(--ink-2);
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);

  &__inner {
    display: grid;
    grid-template-columns: 1fr 1px 1fr;
    gap: 56px;
    align-items: start;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
      gap: 40px;
    }
  }

  &__divider {
    background: var(--line);
    width: 1px;
    align-self: stretch;

    @media (max-width: 768px) { display: none; }
  }

  &__col {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  &__marker {
    color: var(--fg-3);
  }

  &__heading {
    font-family: var(--font-sans);
    font-size: clamp(20px, 2.2vw, 30px);
    font-weight: 500;
    line-height: 1.3;
    color: var(--fg);

    del {
      color: var(--fg-3);
      text-decoration: line-through;
    }

    strong {
      color: var(--accent);
      font-weight: 600;
      text-decoration: none;
    }
  }

  &__subheading {
    font-family: var(--font-sans);
    font-size: clamp(18px, 1.8vw, 24px);
    font-weight: 500;
    line-height: 1.35;
    color: var(--fg);
  }

  &__body {
    font-family: var(--font-sans);
    font-size: 15px;
    color: var(--fg-2);
    line-height: 1.7;

    em { font-style: italic; color: var(--fg); }
  }
}
</style>
