<script setup lang="ts">
const { t } = useI18n()
const { githubUser, checkOAuthReturn, restoreFromStorage, logout, getAuthData } = useAuth()
const { teamAvailable, teamError, checking, onInput, checkAvailability } = useTeamValidation()
const { submitAccessRequest } = useApi()

const emit = defineEmits<{ success: [] }>()

const teamName = ref('')
const usecase = ref('')
const submitting = ref(false)
const formStatus = ref<{ message: string; type: 'success' | 'error' } | null>(null)
const authError = ref('')

onMounted(() => {
  restoreFromStorage()
  const result = checkOAuthReturn()
  if (result.error) {
    const errorMessages: Record<string, string> = {
      ACCESS_DENIED: t('js.oauth.access_denied'),
      INVALID_STATE: t('js.oauth.invalid_state'),
      MISSING_PARAMS: t('js.oauth.missing_params'),
      TOKEN_EXCHANGE: t('js.oauth.token_exchange'),
      PROFILE_FETCH: t('js.oauth.profile_fetch'),
      PARSE_ERROR: t('js.oauth.parse_error'),
    }
    authError.value = errorMessages[result.error] || t('js.oauth.failed')
    setTimeout(() => { authError.value = '' }, 10000)
  }
  if (githubUser.value) {
    nextTick(() => {
      document.getElementById('request-access')?.scrollIntoView({ behavior: 'smooth' })
    })
  }
})

function handleTeamInput(e: Event) {
  const input = e.target as HTMLInputElement
  const pos = input.selectionStart
  input.value = input.value.toLowerCase()
  input.setSelectionRange(pos, pos)
  teamName.value = input.value.trim()
  onInput(teamName.value)
}

function handleLogout() {
  logout()
  teamName.value = ''
  usecase.value = ''
  formStatus.value = null
}

async function handleSubmit() {
  if (!githubUser.value) {
    formStatus.value = { message: t('js.submit.github_required'), type: 'error' }
    return
  }

  const val = teamName.value.trim()
  if (!val || teamError.value) return

  if (!teamAvailable.value) {
    await checkAvailability(val)
    if (!teamAvailable.value) return
  }

  submitting.value = true
  formStatus.value = null

  try {
    const githubAuth = JSON.parse(getAuthData())
    const result = await submitAccessRequest({
      github_auth: githubAuth,
      team: val,
      usecase: usecase.value.trim(),
    })

    if (result.success) {
      emit('success')
      teamName.value = ''
      usecase.value = ''
    } else {
      formStatus.value = { message: result.message || 'Error', type: 'error' }
    }
  } catch {
    formStatus.value = { message: t('js.submit.network_error'), type: 'error' }
  } finally {
    submitting.value = false
  }
}

function handleDisabledClick() {
  if (!githubUser.value) {
    const btn = document.querySelector('.btn-github') as HTMLElement
    if (btn) {
      btn.classList.add('highlight-required')
      btn.scrollIntoView({ behavior: 'auto', block: 'center' })
      setTimeout(() => btn.classList.remove('highlight-required'), 3000)
    }
  }
}

const teamStatusText = computed(() => {
  if (!teamError.value) return ''
  if (teamError.value.startsWith('js.')) {
    return t(teamError.value, { name: teamName.value })
  }
  return teamError.value
})
</script>

<template>
  <section class="request-access" id="request-access">
    <div class="container">
      <div class="form-wrapper">
        <h2 class="section-title">{{ t('form.title') }}</h2>
        <p class="form-subtitle">{{ t('form.subtitle') }}</p>

        <!-- GitHub Auth: Not authenticated -->
        <div v-if="!githubUser" class="github-auth">
          <p class="form-description">{{ t('form.github_desc') }}</p>
          <a href="https://mctl.ai/api/github/login" class="btn-github">
            <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true">
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <span>{{ t('form.github_login') }}</span>
          </a>
          <p style="font-size:0.72rem;color:var(--color-text-muted);margin-top:0.6rem;line-height:1.5">
            Requests read-only access: your username, avatar, and verified email.<br>
            No access to your code or repositories.
          </p>
        </div>

        <!-- GitHub Auth: Authenticated -->
        <div v-else class="github-profile">
          <img :src="githubUser.avatar_url" class="github-avatar" alt="GitHub avatar">
          <div class="github-info">
            <strong>{{ githubUser.name || githubUser.login }}</strong>
            <a :href="githubUser.html_url" target="_blank" rel="noopener">@{{ githubUser.login }}</a>
          </div>
          <button type="button" class="btn-logout" :title="t('form.logout_title')" @click="handleLogout">&times;</button>
        </div>

        <!-- Auth error -->
        <div v-if="authError" class="form-status error" role="alert" aria-live="assertive">
          {{ authError }}
        </div>

        <form class="access-form" @submit.prevent="handleSubmit">
          <div class="form-group">
            <label for="team">{{ t('form.label.team') }}</label>
            <div class="team-input-wrapper">
              <input
                id="team"
                type="text"
                :value="teamName"
                :placeholder="t('form.placeholder.team')"
                :title="t('form.validation.team')"
                required
                pattern="^[a-z0-9][a-z0-9-]{0,62}$"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                @input="handleTeamInput"
              >
              <div class="input-spinner" :class="{ visible: checking }" />
            </div>
            <small class="form-help">{{ t('form.help.team') }}</small>
            <p
              class="team-status"
              :class="{ error: teamError }"
            >
              {{ teamStatusText }}
            </p>
          </div>

          <div class="form-group">
            <label for="usecase">{{ t('form.label.usecase') }}</label>
            <textarea
              id="usecase"
              v-model="usecase"
              :placeholder="t('form.placeholder.usecase')"
              style="width:100%;max-width:100%;height:120px;resize:none;overflow-y:auto;box-sizing:border-box"
            />
          </div>

          <div class="form-group">
            <button
              type="submit"
              class="btn btn-primary btn-block"
              :disabled="!githubUser || submitting"
              @click="!githubUser && handleDisabledClick()"
            >
              <template v-if="submitting">
                <span class="terminal-prompt">$</span> {{ t('js.submit.processing') }}
              </template>
              <template v-else>
                {{ t('form.submit') }}
              </template>
            </button>
          </div>

          <div
            v-if="formStatus"
            class="form-status"
            :class="formStatus.type"
            role="alert"
            aria-live="assertive"
          >
            {{ formStatus.message }}
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
