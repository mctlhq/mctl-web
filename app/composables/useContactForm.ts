export function useContactForm() {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const { submitContactForm: submitContactFormApi } = useApi();

  // Resolves to true only when the Worker accepted the message (2xx and
  // `success: true`, see useApi). The caller clears the form on true and
  // keeps the user's text on false so nothing typed is lost to an error.
  async function submitContactForm(
    formData: { name: string; email: string; message: string; turnstile_token: string },
    messages: { failed: string; network: string },
  ): Promise<boolean> {
    try {
      error.value = null;
      isLoading.value = true;

      const result = await submitContactFormApi(formData);

      if (!result.success) {
        error.value = new Error(result.message || messages.failed);
        return false;
      }
      return true;
    } catch (err) {
      error.value = new Error(messages.network);

      console.error('Error submitting contact form:', err);
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  return {
    submitContactForm,
    isLoading,
    error,
  };
}
