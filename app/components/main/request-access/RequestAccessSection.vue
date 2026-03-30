<script lang="ts" setup>
import GithubAuth from './GithubAuth.vue';

const { t } = useI18n();

const { user, isAuth, authData, authError, logout } = useAuth();

function handleLogin() {
  window.location.href = 'https://mctl.ai/api/github/login';
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
        :user="user"
        :auth-error="authError"
        @clickLogin="handleLogin"
        @clickLogout="logout"
      />
      <RequestAccessForm
        :disabled="!isAuth"
        :auth-data="authData"
      />
    </BaseCard>
  </BaseSection>
</template>

<style lang="scss" scoped>
.request-access {
  padding: 60px 0;
  background-color: var(--color-bg-secondary);
  text-align: center;

  &__card {
    width: 100%;
    margin: 32px auto 0;

    @media (min-width: 768px) {
      width: 600px;
    }
  }

  &__subtitle {
    margin-bottom: 20px;
    color: var(--color-text-muted);
  }
}
</style>
