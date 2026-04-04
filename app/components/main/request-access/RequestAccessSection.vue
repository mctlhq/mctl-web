<script lang="ts" setup>
import GithubAuth from './GithubAuth.vue';

const runtimeConfig = useRuntimeConfig();

const { t } = useI18n();

const { user, authData, errorCode, logout } = useAuth();

const { baseUrlFront } = runtimeConfig.public;

const githubLoginUrl = `https://mctl.ai/api/github/login?redirect_to=${encodeURIComponent(baseUrlFront)}`;

const authError = ref<string | null>(null);

function handleLogin() {
  window.location.href = githubLoginUrl;
}

onMounted(() => {
  const code = errorCode.value;
  if (!code) return;

  const errorMessages: Record<string, string> = {
    ACCESS_DENIED: t('js.oauth.access_denied'),
    INVALID_STATE: t('js.oauth.invalid_state'),
    MISSING_PARAMS: t('js.oauth.missing_params'),
    TOKEN_EXCHANGE: t('js.oauth.token_exchange'),
    PROFILE_FETCH: t('js.oauth.profile_fetch'),
    PARSE_ERROR: t('js.oauth.parse_error'),
  };

  authError.value = errorMessages[code] ?? t('js.oauth.failed');
  setTimeout(() => {
    authError.value = null;
  }, 10000);
});
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
        class="request-access__github-auth"
        @clickLogin="handleLogin"
        @clickLogout="logout"
      />
      <RequestAccessForm
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

  &__github-auth {
    margin-bottom: 32px;
  }
}
</style>
