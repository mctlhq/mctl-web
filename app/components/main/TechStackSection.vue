<script setup lang="ts">
const { t } = useI18n()

const logos = [
  { img: '/img/backstage-logo.svg', alt: 'Backstage', labelKey: 'tech.catalog' },
  { img: '/img/argocd-logo.svg', alt: 'ArgoCD', labelKey: 'tech.gitops' },
  { img: '/img/vault-logo.svg', alt: 'HashiCorp Vault', labelKey: 'tech.secrets' },
  { img: '/img/k3s-logo.svg', alt: 'K3s', labelKey: 'tech.runtime' },
]
</script>

<template>
  <section class="tech-stack" id="ecosystem">
    <div class="container">
      <p class="section-tag">{{ t('tech.tag') }}</p>
      <h2 class="section-title">{{ t('tech.title') }}</h2>
      <p class="section-subtitle">{{ t('tech.subtitle') }}</p>
      <div class="tech-logos">
        <div
          v-for="logo in logos"
          :key="logo.alt"
          class="tech-logo"
        >
          <img :src="logo.img" :alt="logo.alt" height="50" width="50">
          <span>{{ t(logo.labelKey) }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
