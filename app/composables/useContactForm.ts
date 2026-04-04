export function useContactForm() {
  const isLoading = ref(false);
  const error = ref<Error | null>(null);

  const { submitContactForm: submitContactFormApi } = useApi();

  async function submitContactForm(formData: { name: string; email: string; message: string }) {
    try {
      error.value = null;
      isLoading.value = true;

      const result = await submitContactFormApi(formData);

      if (!result.success) {
        error.value = new Error(result.message || 'Failed to send message');
      }
    } catch (err) {
      error.value = err as Error;

      console.error('Error submitting contact form:', err);
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
