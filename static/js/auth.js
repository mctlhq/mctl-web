/* jshint esversion: 8 */
'use strict';

const _AUTH_KEY = 'mctl_auth';
const _AUTH_TTL = 8 * 60 * 60 * 1000;

function _saveAuthStorage(extra) {
    try {
        const cur = _loadAuthStorage() || {};
        localStorage.setItem(_AUTH_KEY, JSON.stringify({ ...cur, ...extra, exp: Date.now() + _AUTH_TTL }));
    } catch (e) {}
}
function _loadAuthStorage() {
    try {
        const d = JSON.parse(localStorage.getItem(_AUTH_KEY) || 'null');
        if (!d || Date.now() > d.exp) { localStorage.removeItem(_AUTH_KEY); return null; }
        return d;
    } catch (e) { return null; }
}
function _clearAuthStorage() {
    try { localStorage.removeItem(_AUTH_KEY); } catch (e) {}
}

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
            _saveAuthStorage({
                login:      App.State.githubUser.login,
                name:       App.State.githubUser.name || App.State.githubUser.login,
                email:      App.State.githubUser.email || '',
                avatar_url: App.State.githubUser.avatar_url || '',
                html_url:   App.State.githubUser.html_url || '',
                sig:        App.State.githubUser.sig || '',
            });
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

    restoreFromStorage: function() {
        const saved = _loadAuthStorage();
        if (!saved || !saved.login || !saved.sig) return;
        App.State.githubUser = saved;
        this.showGitHubProfile(saved);
        this.prefillForm(saved);
    },

    logout: function() {
        App.State.githubUser    = null;
        _clearAuthStorage();
        App.State.teamAvailable = false;
        App.DOM.githubAuthSection.style.display  = '';
        App.DOM.githubProfileSection.style.display = 'none';
        App.DOM.submitBtn.disabled = true;
        document.getElementById('github-auth-data').value = '';
        App.DOM.teamInput.value = '';
    }
};
