<script lang="ts" setup>
import GithubAuth from './GithubAuth.vue';

const { t } = useI18n();

const { githubUser, checkOAuthReturn, restoreFromStorage, logout, getAuthData } = useAuth();

function handleLogin() {
  window.location.href = 'https://mctl.ai/api/github/login';
}

async function init() {
  restoreFromStorage();
  const result = checkOAuthReturn();
}
</script>

<template>
  <BaseSection
    id="request-access"
    class="request-access"
    :title="t('form.title')"
  >
    <BaseCard class="request-access__card">
      <p class="request-access__subtitle">
        {{ t('form.subtitle') }}
      </p>
      <GithubAuth
        :user="githubUser"
        @clickLogin="handleLogin"
        @clickLogout="logout"
      />
      <RequestAccessForm :disabled="!githubUser" />
    </BaseCard>
  </BaseSection>
</template>

<style lang="scss" scoped>
.request-access {
  padding: 60px 0;
  background-color: var(--color-bg-secondary);
  text-align: center;

  &__card {
    width: 600px;
    margin: 32px auto 0;
  }

  &__subtitle {
    margin-bottom: 20px;
    color: var(--color-text-muted);
  }
}
</style>
