<script lang="ts" setup>
import BaseFormStatus from '@/components/shared/BaseFormStatus.vue';
import GithubIcon from '@/assets/icons/github.svg';

import type { GitHubUser } from '@/types';

interface Props {
  user?: GitHubUser | null
  authError?: string
}
defineProps<Props>();

defineEmits<{
  clickLogin: []
  clickLogout: []
}>();

const { t } = useI18n();
</script>

<template>
  <div class="github-auth-block">
    <template v-if="!user">
      <BaseButton
        variant="secondary"
        size="lg"
        @click="$emit('clickLogin')"
      >
        <GithubIcon />
        <span>{{ t('form.github_login') }}</span>
      </BaseButton>
      <p class="github-auth-block__disclaimer">
        Requests read-only access: your username, avatar, and verified email.<br>
        No access to your code or repositories.
      </p>
    </template>
    <div v-else class="github-auth-block__user-profile">
      <img :src="user.avatar_url" class="github-auth-block__avatar" alt="GitHub avatar">
      <div class="github-auth-block__user-info">
        <strong>{{ user.name || user.login }}</strong>
        <a :href="user.html_url" target="_blank" rel="noopener">@{{ user.login }}</a>
      </div>
      <button
        type="button"
        class="github-auth-block__logout"
        :title="t('form.logout_title')"
        @click="$emit('clickLogout')"
      >
        &times;
      </button>
    </div>
    <BaseFormStatus
      v-if="authError"
      :type="'error'"
      class="github-auth-block__status"
    >
      {{ authError }}
    </BaseFormStatus>
  </div>
</template>

<style lang="scss" scoped>
.github-auth-block {
  &__disclaimer {
    margin: 10px 0 20px;

    font-size: 12px;
    line-height: 1.5;
    color: var(--color-text-muted);
  }

  &__status {
    margin-top: 12px;
  }
}
</style>
