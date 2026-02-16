// mctl.me landing page - GitHub OAuth + form handler
(function() {
    'use strict';

    const FORM_API_URL = 'https://platform.mctl.me/api/submit';
    const CHECK_TEAM_URL = 'https://platform.mctl.me/api/github/check-team';

    // ─── Extensible validators ───────────────────────────────────────────────
    const validators = {
        team: {
            regex: /^[a-z0-9][a-z0-9-]{0,62}$/,
            message: 'Team name must be lowercase alphanumeric with hyphens (max 63 chars)'
        }
    };

    function validate(fieldName, value) {
        const v = validators[fieldName];
        if (!v) return null;
        if (v.regex && !v.regex.test(value)) return v.message;
        if (v.minLength && value.length < v.minLength) return v.message;
        if (v.custom && !v.custom(value)) return v.message;
        return null;
    }

    // ─── State ───────────────────────────────────────────────────────────────
    let githubUser = null;
    let teamAvailable = false;

    // ─── DOM refs ────────────────────────────────────────────────────────────
    const form = document.getElementById('access-form');
    const formStatus = document.getElementById('form-status');
    const submitBtn = document.getElementById('submit-btn');
    const githubAuthSection = document.getElementById('github-auth');
    const githubProfileSection = document.getElementById('github-profile');
    const authErrorEl = document.getElementById('auth-error');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const teamInput = document.getElementById('team');

    // Modal refs
    const modal = document.getElementById('team-check-modal');
    const modalSpinner = document.getElementById('modal-spinner');
    const modalMessage = document.getElementById('modal-message');
    const modalClose = document.getElementById('modal-close');

    // ─── OAuth: check URL hash on page load ──────────────────────────────────

    function checkOAuthReturn() {
        const hash = window.location.hash;

        // Handle OAuth errors
        if (hash.startsWith('#auth_error=')) {
            const errorCode = hash.substring(12);
            const messages = {
                'ACCESS_DENIED': 'GitHub authorization was cancelled.',
                'INVALID_STATE': 'Session expired. Please try again.',
                'MISSING_PARAMS': 'Invalid OAuth response. Please try again.',
                'TOKEN_EXCHANGE': 'Failed to authenticate with GitHub. Please try again.',
                'PROFILE_FETCH': 'Could not fetch GitHub profile. Please try again.',
            };
            showAuthError(messages[errorCode] || 'Authentication failed. Please try again.');
            history.replaceState(null, '', window.location.pathname + window.location.search);
            // Scroll to form section
            setTimeout(function() {
                document.getElementById('request-access').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
            return;
        }

        // Handle successful auth
        if (!hash.startsWith('#auth=')) return;

        try {
            const encoded = hash.substring(6);
            const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
            const json = atob(base64);
            githubUser = JSON.parse(json);
            showGitHubProfile(githubUser);
            prefillForm(githubUser);
        } catch (e) {
            console.error('Failed to parse GitHub auth data:', e);
            showAuthError('Failed to process authentication. Please try again.');
        }

        // Clean URL hash and scroll to form
        history.replaceState(null, '', window.location.pathname + window.location.search);
        setTimeout(function() {
            document.getElementById('request-access').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    function showAuthError(message) {
        authErrorEl.textContent = message;
        authErrorEl.style.display = 'block';
        setTimeout(function() { authErrorEl.style.display = 'none'; }, 10000);
    }

    function showGitHubProfile(user) {
        githubAuthSection.style.display = 'none';
        githubProfileSection.style.display = 'flex';
        document.getElementById('github-avatar').src = user.avatar_url;
        document.getElementById('github-name').textContent = user.name || user.login;
        document.getElementById('github-login').textContent = user.login;
        document.getElementById('github-link').href = user.html_url;
        submitBtn.disabled = false;
    }

    function prefillForm(user) {
        if (user.name) {
            nameInput.value = user.name;
        }
        if (user.email) {
            emailInput.value = user.email;
        }
        document.getElementById('github-auth-data').value = JSON.stringify({
            login: user.login,
            name: user.name,
            email: user.email,
            avatar_url: user.avatar_url,
            html_url: user.html_url,
            sig: user.sig,
        });
    }

    // ─── Logout ──────────────────────────────────────────────────────────────

    function logout() {
        githubUser = null;
        teamAvailable = false;
        githubAuthSection.style.display = '';
        githubProfileSection.style.display = 'none';
        submitBtn.disabled = true;
        nameInput.value = '';
        emailInput.value = '';
        document.getElementById('github-auth-data').value = '';
        teamInput.value = '';
    }

    document.getElementById('github-logout').addEventListener('click', logout);

    // ─── Team input: auto-lowercase + validation ─────────────────────────────

    let checkTeamTimeout = null;

    if (teamInput) {
        // Force lowercase on every keystroke
        teamInput.addEventListener('input', function() {
            const pos = this.selectionStart;
            this.value = this.value.toLowerCase();
            this.setSelectionRange(pos, pos);

            const value = this.value.trim();
            teamAvailable = false;

            if (value === '') {
                this.setCustomValidity('');
                return;
            }
            const error = validate('team', value);
            this.setCustomValidity(error || '');

            // Debounce team check
            if (checkTeamTimeout) clearTimeout(checkTeamTimeout);
            if (!error && value.length >= 2) {
                checkTeamTimeout = setTimeout(function() {
                    checkTeamAvailability(value);
                }, 600);
            }
        });
    }

    // ─── Modal for team check ────────────────────────────────────────────────

    function showModal(message, showSpinner, showClose) {
        modalMessage.textContent = message;
        modalSpinner.style.display = showSpinner ? 'block' : 'none';
        modalClose.style.display = showClose ? 'inline-flex' : 'none';
        modal.style.display = 'flex';
    }

    function hideModal() {
        modal.style.display = 'none';
    }

    modalClose.addEventListener('click', hideModal);

    async function checkTeamAvailability(name) {
        showModal('Checking team availability...', true, false);

        try {
            const res = await fetch(CHECK_TEAM_URL + '?name=' + encodeURIComponent(name));
            const data = await res.json();

            if (data.available) {
                teamAvailable = true;
                hideModal();
            } else {
                teamAvailable = false;
                showModal('Team "' + name + '" already exists. Choose a different name.', false, true);
            }
        } catch (e) {
            console.error('Team check failed:', e);
            teamAvailable = false;
            showModal('Failed to check team. Try again.', false, true);
        }
    }

    // ─── Form submission ─────────────────────────────────────────────────────

    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            if (!githubUser) {
                showStatus('Sign in with GitHub first.', 'error');
                return;
            }

            const team = teamInput.value.trim();
            const usecase = document.getElementById('usecase').value.trim();

            // Validate team
            const teamError = validate('team', team);
            if (teamError) {
                showStatus(teamError, 'error');
                return;
            }

            // Check team availability if not already checked
            if (!teamAvailable) {
                await checkTeamAvailability(team);
                if (!teamAvailable) return;
            }

            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="terminal-prompt">$</span> Processing...';

            // Build payload
            const githubAuth = JSON.parse(document.getElementById('github-auth-data').value);
            githubAuth.name = nameInput.value.trim();
            githubAuth.email = emailInput.value.trim();

            try {
                const response = await fetch(FORM_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        github_auth: githubAuth,
                        team: team,
                        usecase: usecase,
                    }),
                });

                const result = await response.json();

                if (result.success) {
                    showStatus(result.message, 'success');
                    teamInput.value = '';
                    document.getElementById('usecase').value = '';
                    teamAvailable = false;
                } else {
                    showStatus(result.message, 'error');
                }
            } catch (error) {
                console.error('Submission error:', error);
                showStatus('Network error. Please try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    function showStatus(message, type) {
        formStatus.textContent = message;
        formStatus.className = 'form-status ' + type;
        setTimeout(function() {
            formStatus.className = 'form-status';
            formStatus.textContent = '';
        }, 10000);
    }

    // ─── Smooth scroll for anchor links ──────────────────────────────────────

    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            var target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ─── Terminal cursor effect ──────────────────────────────────────────────

    document.querySelectorAll('input:not(:disabled), textarea').forEach(function(input) {
        input.addEventListener('focus', function() {
            this.style.caretColor = '#00f5ff';
        });
    });

    // ─── Init ────────────────────────────────────────────────────────────────
    checkOAuthReturn();
})();
