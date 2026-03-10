/* jshint esversion: 8 */
'use strict';

App.TeamInput = {
    checkTimeout: null,

    init: function() {
        if (!App.DOM.teamInput) return;

        App.DOM.teamInput.addEventListener('input', function() {
            const pos = this.selectionStart;
            this.value = this.value.toLowerCase();
            this.setSelectionRange(pos, pos);

            const value = this.value.trim();
            App.State.teamAvailable = false;
            App.DOM.teamStatusEl.textContent = '';
            App.DOM.teamStatusEl.className = 'team-status';

            if (value === '') {
                this.setCustomValidity('');
                return;
            }

            const error = App.Validators.validate('team', value);
            this.setCustomValidity(error || '');

            if (App.TeamInput.checkTimeout) clearTimeout(App.TeamInput.checkTimeout);
            if (!error && value.length >= 2) {
                App.TeamInput.checkTimeout = setTimeout(function() {
                    App.TeamInput.checkAvailability(value);
                }, 600);
            }
        });
    },

    checkAvailability: async function(name) {
        App.DOM.teamInput.disabled = true;
        App.DOM.teamCheckSpinner.classList.add('visible');
        App.DOM.teamStatusEl.textContent = '';
        App.DOM.teamStatusEl.className = 'team-status';

        try {
            const res  = await fetch(App.CHECK_TEAM_URL + '?name=' + encodeURIComponent(name));
            const data = await res.json();

            if (data.available) {
                App.State.teamAvailable = true;
            } else {
                App.State.teamAvailable = false;
                App.DOM.teamStatusEl.textContent = window.i18n.t('js.team.taken', { name: name });
                App.DOM.teamStatusEl.className = 'team-status error';
            }
        } catch (e) {
            console.error('Team check failed:', e);
            App.State.teamAvailable = false;
            App.DOM.teamStatusEl.textContent = window.i18n.t('js.team.check_failed');
            App.DOM.teamStatusEl.className = 'team-status error';
        } finally {
            App.DOM.teamCheckSpinner.classList.remove('visible');
            App.DOM.teamInput.disabled = false;
            App.DOM.teamInput.focus();
        }
    }
};
