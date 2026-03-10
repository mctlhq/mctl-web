/* jshint esversion: 8 */
'use strict';

App.AccessForm = {
    init: function() {
        if (!App.DOM.form) return;

        App.DOM.form.addEventListener('submit', async function(e) {
            e.preventDefault();

            if (!App.State.githubUser) {
                App.UI.showStatus(window.i18n.t('js.submit.github_required'), 'error');
                return;
            }

            const team    = App.DOM.teamInput.value.trim();
            const usecase = document.getElementById('usecase').value.trim();

            const teamError = App.Validators.validate('team', team);
            if (teamError) {
                App.UI.showStatus(teamError, 'error');
                return;
            }

            if (!App.State.teamAvailable) {
                await App.TeamInput.checkAvailability(team);
                if (!App.State.teamAvailable) return;
            }

            const originalText = App.DOM.submitBtn.innerHTML;
            App.DOM.submitBtn.disabled = true;
            App.DOM.submitBtn.innerHTML = '<span class="terminal-prompt">$</span> ' + window.i18n.t('js.submit.processing');

            const githubAuth = JSON.parse(document.getElementById('github-auth-data').value);

            try {
                const response = await fetch(App.FORM_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        github_auth: githubAuth,
                        team:        team,
                        usecase:     usecase,
                    }),
                });

                const result = await response.json();

                if (result.success) {
                    App.UI.showSuccessModal();
                    App.DOM.teamInput.value = '';
                    document.getElementById('usecase').value = '';
                    App.State.teamAvailable = false;
                } else {
                    App.UI.showStatus(result.message, 'error');
                }
            } catch (error) {
                console.error('Submission error:', error);
                App.UI.showStatus(window.i18n.t('js.submit.network_error'), 'error');
            } finally {
                App.DOM.submitBtn.disabled = false;
                App.DOM.submitBtn.innerHTML = originalText;
            }
        });

        // Clicking a disabled submit button highlights the GitHub auth button
        App.DOM.submitBtn.addEventListener('click', function(e) {
            if (this.disabled && !App.State.githubUser) {
                e.preventDefault();
                const githubBtn = document.querySelector('.btn-github');
                if (githubBtn) {
                    githubBtn.classList.add('highlight-required');
                    githubBtn.scrollIntoView({ behavior: 'auto', block: 'center' });
                    setTimeout(function() {
                        githubBtn.classList.remove('highlight-required');
                    }, 3000);
                }
            }
        });
    }
};
