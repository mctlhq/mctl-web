<script lang="ts" setup>
import { SIGN_IN_ERROR_KEYS } from '~/lib/zitadelSession';

import GithubAuth from './GithubAuth.vue';

const runtimeConfig = useRuntimeConfig();

const { t } = useI18n();

const { profile, authData, errorCode, logout } = useAuth();

// `?auth_flow=zitadel` (C1b): the same badge and form, fed by the Worker's
// session instead of the legacy identity. The legacy path below is unchanged.
const session = useSession();
const zitadel = computed(() => session.flow.value === 'zitadel');
const badgeUser = computed(() => (zitadel.value ? session.profile.value : profile.value));
// The badge stays mounted (the prerendered HTML has it, and the hydrating
// render must match) but is hidden, keeping its height, until the session
// answer arrives, so a signed-in visitor does not see "Sign in" first.
const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});
const badgePending = computed(() => mounted.value && zitadel.value && session.status.value === 'unknown');
const sessionNotice = computed(() => {
  if (!zitadel.value) return null;
  if (session.status.value === 'unavailable') return t('js.session.unavailable');
  if (session.signedIn.value && !session.canRequestWorkspace.value) return t('js.session.not_in_test_group');
  return null;
});

const { baseUrlFront } = runtimeConfig.public;

const githubLoginUrl = `${apiUrl('/github/login')}?redirect_to=${encodeURIComponent(baseUrlFront)}`;

const authError = ref<string | null>(null);

function showAuthError(message: string) {
  authError.value = message;
  setTimeout(() => {
    authError.value = null;
  }, 10000);
}

function handleLogin() {
  if (zitadel.value) {
    session.login();
    return;
  }
  window.location.href = githubLoginUrl;
}

async function handleLogout() {
  if (zitadel.value) {
    const key = await session.logout();
    if (key) showAuthError(t(key));
    return;
  }
  logout();
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
    EMAIL_UNVERIFIED: t('js.oauth.email_unverified'),
  };

  const sessionKey = zitadel.value ? SIGN_IN_ERROR_KEYS[code] : undefined;
  showAuthError(sessionKey ? t(sessionKey) : (errorMessages[code] ?? t('js.oauth.failed')));
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
        :user="badgeUser"
        :auth-error="authError"
        class="request-access__github-auth"
        :class="{ 'request-access__github-auth--pending': badgePending }"
        @clickLogin="handleLogin"
        @clickLogout="handleLogout"
      />
      <p
        v-if="sessionNotice"
        class="request-access__notice"
        role="status"
      >
        {{ sessionNotice }}
      </p>
      <RequestAccessForm
        :auth-data="authData"
        :session-mode="zitadel"
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

    &--pending {
      visibility: hidden;
    }
  }

  &__notice {
    margin: -16px 0 24px;
    color: var(--color-text-muted);
    font-size: 14px;
  }
}
</style>
