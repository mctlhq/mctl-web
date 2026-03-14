const FORM_API_URL = 'https://mctl.ai/api/submit'
const CONTACT_API_URL = 'https://mctl.ai/api/contact'

interface SubmitResult {
  success: boolean
  message?: string
}

export function useApi() {
  async function submitAccessRequest(payload: {
    github_auth: object
    team: string
    usecase: string
  }): Promise<SubmitResult> {
    const response = await fetch(FORM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return response.json()
  }

  async function submitContactForm(payload: {
    name: string
    email: string
    message: string
  }): Promise<SubmitResult> {
    const response = await fetch(CONTACT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return response.json()
  }

  return {
    submitAccessRequest,
    submitContactForm,
  }
}
