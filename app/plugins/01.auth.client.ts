export default defineNuxtPlugin(() => {
  const { restore, parseOAuth, isAuth } = useAuth();

  restore();

  const { error } = parseOAuth();

  if (error) {
    console.error('OAuth error:', error);
  }

  if (isAuth.value && window.location.hash === '#request-access') {
    nextTick(() => {
      setTimeout(() => {
        document.getElementById('request-access')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    });
  }
});
