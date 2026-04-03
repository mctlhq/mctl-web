export default defineNuxtPlugin(() => {
  console.log('Initializing auth plugin');
  const { restoreFromStorage, checkOAuthReturn } = useAuth();

  restoreFromStorage();

  const { error } = checkOAuthReturn();

  if (error) {
    console.error('OAuth error:', error);
  }
});
