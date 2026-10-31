<script lang="ts" setup>
import { invitationEntryView, shouldStartInvitedLogin } from '~/lib/invitationRequest';
import { SIGN_IN_ERROR_KEYS } from '~/lib/zitadelSession';

import GithubAuth from './GithubAuth.vue';

const runtimeConfig = useRuntimeConfig();
// Unknown public configuration stays on the invitation path. UI choices do not
// authorize provisioning; the Worker and identity hook remain authoritative.
const invitationOnly = ref(true);
const entry = ref<'default' | 'invitation' | 'workspace'>('default');

onMounted(async () => {
  try {
    const response = await fetch(apiUrl('/signup-status'), { cache: 'no-store', credentials: 'omit' });
    const body = response.ok ? await response.json() : null;
    if (typeof body?.invitationOnly === 'boolean') invitationOnly.value = body.invitationOnly;
  } catch { /* Keep the invitation entry when public status is unavailable. */ }
});

const { t } = useI18n();

const { profile, authData, errorCode, logout, isAuth } = useAuth();

// `?auth_flow=zitadel` (C1b): the same badge and form, fed by the Worker's
// session instead of the legacy identity. The legacy path below is unchanged.
const session = useSession();
const zitadel = computed(() => session.flow.value === 'zitadel');
const authError = ref<string | null>(null);
const entryView = computed(() => invitationEntryView({
  entry: entry.value, invitationOnly: invitationOnly.value,
  flow: zitadel.value ? 'zitadel' : 'legacy', signedIn: session.signedIn.value,
  canRequestWorkspace: session.canRequestWorkspace.value,
  legacySignedIn: isAuth.value, authError: !!authError.value,
}));
const workspaceForm = computed(() => entryView.value.workspace);
const badgeUser = computed(() => (zitadel.value ? session.profile.value : profile.value));
// The first session read establishes the identity without remounting a draft
// typed while that read was pending. Only a later observed account change
// resets the form and its account-specific acceptance receipt.
const formRevision = ref(0);
let observedIdentity: string | undefined;
watch(() => {
  if (zitadel.value && session.status.value !== 'ready') return undefined;
  return zitadel.value
    ? `zitadel:${session.view.value?.githubId || 'anonymous'}`
    : `legacy:${authData.value?.id || authData.value?.login || 'anonymous'}`;
}, (identity) => {
  if (identity === undefined) return;
  if (observedIdentity !== undefined && identity !== observedIdentity) formRevision.value++;
  observedIdentity = identity;
}, { immediate: true });
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

function showAuthError(message: string) {
  authError.value = message;
  setTimeout(() => {
    authError.value = null;
  }, 10000);
}

function handleInvitedLogin() {
  entry.value = 'workspace';
  // Invited customers use the accepted OIDC path, independently of the
  // still-restricted public default. Its callback selects the session flow.
  if (shouldStartInvitedLogin(zitadel.value ? 'zitadel' : 'legacy', session.signedIn.value, isAuth.value)) session.login();
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
    band
    :title="t('form.title')"
  >
    <BaseCard class="request-access__card mctl-site-section__narrow">
      <p class="request-access__subtitle">
        {{ t(workspaceForm ? 'form.subtitle' : 'invitation.subtitle') }}
      </p>
      <GithubAuth
        v-if="entryView.badge"
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
      <template v-if="!workspaceForm">
        <h3 class="request-access__invitation-title">{{ t('invitation.title') }}</h3>
        <InvitationRequestForm />
        <BaseButton variant="secondary" class="request-access__switch" @click="handleInvitedLogin">{{ t('invitation.invited') }}</BaseButton>
      </template>
      <template v-else>
        <RequestAccessForm
          :key="formRevision"
          :auth-data="authData"
          :session-mode="zitadel"
        />
        <BaseButton v-if="invitationOnly" variant="secondary" class="request-access__switch" @click="entry = 'invitation'">{{ t('invitation.back') }}</BaseButton>
      </template>
    </BaseCard>
  </BaseSection>
</template>

<style lang="scss" scoped>
.request-access {
  // The hero above sits on the page's grid; an opaque band starting right
  // under it reads as a hard cut, so the band's fill fades in over its first
  // 160px instead.
  &.base-section--band.mctl-site-section {
    background-color: transparent;
    background-image: linear-gradient(to bottom, transparent, var(--color-bg-secondary) 160px);
  }

  // The card is centred under the title by site.css's __narrow (600px at
  // most); its own content stays centred, as the sign-in and form flows were
  // laid out.
  &__card {
    margin-top: 32px;
    text-align: center;
  }

  &__switch { margin-top: 24px; }
  &__invitation-title { margin-bottom: 24px; }

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
