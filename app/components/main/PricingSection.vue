<script setup lang="ts">
const plans = [
  {
    title: 'Starter',
    desc: 'For individuals and small experiments.',
    features: [
      '1 team',
      '2 services',
      'Standard templates',
      'Shared infrastructure',
      'Community support',
      'Community MCP access',
    ],
    featured: false,
  },
  {
    title: 'Professional',
    badge: 'Popular',
    desc: 'For growing engineering teams.',
    features: [
      'Unlimited teams',
      'Custom templates',
      'Dedicated namespaces',
      'Priority support',
      'SLA guarantee',
      'Full MCP toolset (39 tools)',
    ],
    featured: true,
  },
  {
    title: 'Enterprise',
    desc: 'For organizations at scale.',
    features: [
      'White-label platform',
      'Dedicated infrastructure',
      'Custom integrations',
      'Dedicated support engineer',
      'Enterprise SLA',
      'Custom MCP integrations',
    ],
    featured: false,
  },
]
</script>

<template>
  <section id="pricing" class="pricing-section">
    <BaseContainer size="lg">
      <div class="pricing-section__head">
        <p class="marker pricing-section__marker">S/07 · Plans</p>
        <h2 class="pricing-section__title">
          Plans that fit your stage.
          <em>Talk to us — we'll size it together.</em>
        </h2>
      </div>

      <div class="pricing-section__grid">
        <div
          v-for="plan in plans"
          :key="plan.title"
          class="plan-card"
          :class="{ 'plan-card--featured': plan.featured }"
        >
          <div class="plan-card__head">
            <h3 class="plan-card__title">{{ plan.title }}</h3>
            <span v-if="plan.badge" class="plan-card__badge">{{ plan.badge }}</span>
          </div>
          <p class="plan-card__desc">{{ plan.desc }}</p>
          <ul class="plan-card__features">
            <li
              v-for="feat in plan.features"
              :key="feat"
              class="plan-card__feature"
            >
              <span class="plan-card__check" aria-hidden="true">✓</span>
              {{ feat }}
            </li>
          </ul>
          <a href="#contact" class="plan-card__cta">Contact us</a>
        </div>
      </div>

      <p class="pricing-section__note marker">
        All plans — no public pricing. Talk to us and we'll find the right fit.
      </p>
    </BaseContainer>
  </section>
</template>

<style lang="scss" scoped>
.pricing-section {
  padding: var(--section-py) 0;
  background: var(--ink);
  border-top: 1px solid var(--line);

  &__head {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 56px;
  }

  &__marker { color: var(--fg-3); }

  &__title {
    font-family: var(--font-sans);
    font-size: clamp(22px, 2.8vw, 40px);
    font-weight: 500;
    line-height: 1.2;
    color: var(--fg);
    max-width: 560px;

    em {
      font-family: var(--font-serif);
      font-style: italic;
      font-weight: 400;
      color: var(--fg-2);
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;

    @media (min-width: 640px) { grid-template-columns: repeat(3, 1fr); }
  }

  &__note {
    margin-top: 32px;
    color: var(--fg-3);
  }
}

.plan-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 32px 28px;
  border: 1px solid var(--line);
  margin: -1px 0 0 -1px;

  &--featured {
    background: var(--ink-2);
    border-color: var(--accent);
    position: relative;
    z-index: 1;
  }

  &__head {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__title {
    font-family: var(--font-sans);
    font-size: 18px;
    font-weight: 600;
    color: var(--fg);
  }

  &__badge {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 500;
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
    padding: 2px 8px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  &__desc {
    font-family: var(--font-sans);
    font-size: 14px;
    color: var(--fg-2);
    line-height: 1.6;
  }

  &__features {
    display: flex;
    flex-direction: column;
    gap: 10px;
    flex: 1;
    list-style: none;
  }

  &__feature {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-family: var(--font-sans);
    font-size: 14px;
    color: var(--fg-2);
    line-height: 1.5;
  }

  &__check {
    color: var(--ok);
    font-size: 12px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  &__cta {
    display: block;
    text-align: center;
    padding: 10px 20px;
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    border: 1px solid var(--line-2);
    color: var(--fg-2);
    transition: all 0.15s;
    margin-top: auto;

    &:hover {
      border-color: var(--accent);
      color: var(--accent);
    }

    .plan-card--featured & {
      background: var(--accent);
      border-color: var(--accent);
      color: var(--ink);
      font-weight: 600;

      &:hover { background: var(--accent-hi); border-color: var(--accent-hi); }
    }
  }

  &__custom {
    margin-top: 2.5rem;
    text-align: center;
    color: var(--color-text-muted);
    font-size: 0.95rem;
  }

  &__custom-link {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-left: 0.5rem;

    color: var(--color-accent);
    font-weight: 500;
    transition: gap 0.25s ease;

    span { transition: transform 0.25s ease; }

    &:hover span { transform: translateX(4px); }
  }

  @media (max-width: 600px) {
    &__custom-link {
      margin-left: 0;
      margin-top: 0.25rem;
    }
  }
}
</style>
