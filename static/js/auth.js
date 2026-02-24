/* jshint esversion: 8 */
'use strict';

App.Auth = {
    checkOAuthReturn: function() {
        const hash      = window.location.hash;
        const urlParams = new URLSearchParams(window.location.search);

        const authError = urlParams.get('auth_error') || (hash.startsWith('#auth_error=') ? hash.substring(12) : null);
        const authData  = urlParams.get('auth')       || (hash.startsWith('#auth=')       ? hash.substring(6)  : null);

        if (authError) {
            const messages = {
                'ACCESS_DENIED': window.i18n.t('js.oauth.access_denied'),
                'INVALID_STATE': window.i18n.t('js.oauth.invalid_state'),
                'MISSING_PARAMS': window.i18n.t('js.oauth.missing_params'),
                'TOKEN_EXCHANGE': window.i18n.t('js.oauth.token_exchange'),
                'PROFILE_FETCH':  window.i18n.t('js.oauth.profile_fetch'),
            };
            App.UI.showAuthError(messages[authError] || window.i18n.t('js.oauth.failed'));
            history.replaceState(null, '', window.location.pathname);
            return;
        }

        if (!authData) return;

        try {
            const base64 = authData.replace(/-/g, '+').replace(/_/g, '/');
            const json   = atob(base64);
            App.State.githubUser = JSON.parse(json);
            this.showGitHubProfile(App.State.githubUser);
            this.prefillForm(App.State.githubUser);
        } catch (e) {
            console.error('Failed to parse GitHub auth data:', e);
            App.UI.showAuthError(window.i18n.t('js.oauth.parse_error'));
        }

        history.replaceState(null, '', window.location.pathname);
        document.getElementById('request-access').scrollIntoView({ behavior: 'smooth' });
    },

    showGitHubProfile: function(user) {
        App.DOM.githubAuthSection.style.display = 'none';
        App.DOM.githubProfileSection.style.display = 'flex';
        document.getElementById('github-avatar').src = user.avatar_url;
        document.getElementById('github-name').textContent = user.name || user.login;
        document.getElementById('github-login').textContent = user.login;
        document.getElementById('github-link').href = user.html_url;
        App.DOM.submitBtn.disabled = false;
    },

    prefillForm: function(user) {
        document.getElementById('github-auth-data').value = JSON.stringify({
            login:      user.login,
            name:       user.name || user.login,
            email:      user.email || '',
            avatar_url: user.avatar_url,
            html_url:   user.html_url,
            sig:        user.sig,
        });
    },

    logout: function() {
        App.State.githubUser    = null;
        App.State.teamAvailable = false;
        App.DOM.githubAuthSection.style.display  = '';
        App.DOM.githubProfileSection.style.display = 'none';
        App.DOM.submitBtn.disabled = true;
        document.getElementById('github-auth-data').value = '';
        App.DOM.teamInput.value = '';
    }
};
