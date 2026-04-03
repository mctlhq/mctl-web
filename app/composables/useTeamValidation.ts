import { ref } from 'vue'

const TEAM_REGEX = /^[a-z0-9][a-z0-9-]{0,62}$/
const CHECK_TEAM_URL = 'https://mctl.ai/api/github/check-team'

export function useTeamValidation() {
  const teamAvailable = ref(false)
  const teamError = ref('')
  const checking = ref(false)
  let checkTimeout: ReturnType<typeof setTimeout> | null = null

  function validate(value: string): string | null {
    if (!value) return null
    if (!TEAM_REGEX.test(value)) {
      return 'Team name must be lowercase alphanumeric with hyphens (max 63 chars)'
    }
    return null
  }

  function onInput(value: string) {
    teamAvailable.value = false
    teamError.value = ''

    if (!value) return

    const error = validate(value)
    if (error) {
      teamError.value = error
      return
    }

    if (checkTimeout) clearTimeout(checkTimeout)
    if (value.length >= 2) {
      checkTimeout = setTimeout(() => {
        checkAvailability(value)
      }, 600)
    }
  }

  async function checkAvailability(name: string) {
    checking.value = true
    teamError.value = ''

    try {
      const res = await fetch(`${CHECK_TEAM_URL}?name=${encodeURIComponent(name)}`)
      const data = await res.json()

      if (data.available) {
        teamAvailable.value = true
      } else {
        teamAvailable.value = false
        // It will be beter to use codes instead of parsing error message
        if (data.error === 'Invalid team name format') {
          teamError.value = `js.team.wrong-format`
        } else {
          teamError.value = `js.team.taken`
        }
      }
    } catch {
      teamAvailable.value = false
      teamError.value = 'js.team.check_failed'
    } finally {
      checking.value = false
    }
  }

  return {
    teamAvailable,
    teamError,
    checking,
    validate,
    onInput,
    checkAvailability,
  }
}
