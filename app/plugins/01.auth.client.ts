import { AUTH_FLOW_PARAM } from '~/lib/zitadelSession';

export default defineNuxtPlugin(() => {
  const { restore, parseOAuth, isAuth } = useAuth();
  const { resolveFlow, endSessionQuietly, refresh, signedIn } = useSession();

  restore();

  // parseOAuth also reads `#auth_error=`, which the ZITADEL callback uses
  // too, so it runs in both flows.
  const { error, authenticated } = parseOAuth();

  if (error) {
    console.error('OAuth error:', error);
  }

  const scrollToForm = () => {
    nextTick(() => {
      setTimeout(() => {
        document.getElementById('request-access')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    });
  };

  const { flow, explicitLegacy } = resolveFlow();

  if (explicitLegacy) {
    endSessionQuietly();
  }

  if (flow === 'zitadel') {
    // The ZITADEL callback lands on `/?auth_flow=zitadel` (with `#auth_error=`
    // on failure). Only that landing scrolls to the form; a plain visit in a
    // browser that remembers the flow does not.
    const landed = new URL(window.location.href).searchParams.has(AUTH_FLOW_PARAM);
    refresh().then(() => {
      if (landed && (signedIn.value || error)) scrollToForm();
    });
    return;
  }

  // Fresh OAuth used to land on ?auth=...#request-access. Auth is now in the
  // fragment (#auth=), so after parseOAuth clears the hash we still scroll
  // to the request-access form. Direct #request-access links keep working.
  if (authenticated || (isAuth.value && window.location.hash === '#request-access')) {
    scrollToForm();
  }
});
