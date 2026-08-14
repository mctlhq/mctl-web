export default defineNuxtPlugin(() => {
  const { restore, parseOAuth, isAuth } = useAuth();

  restore();

  const { error, authenticated } = parseOAuth();

  if (error) {
    console.error('OAuth error:', error);
  }

  // Fresh OAuth used to land on ?auth=...#request-access. Auth is now in the
  // fragment (#auth=), so after parseOAuth clears the hash we still scroll
  // to the request-access form. Direct #request-access links keep working.
  if (authenticated || (isAuth.value && window.location.hash === '#request-access')) {
    nextTick(() => {
      setTimeout(() => {
        document.getElementById('request-access')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    });
  }
});
