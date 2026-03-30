export default defineNuxtPlugin(() => {
  console.log('Initializing auth plugin');
  const { restore, parseOAuth } = useAuth();

  restore();

  const { error } = parseOAuth();

  if (error) {
    console.error('OAuth error:', error);
  }
});
