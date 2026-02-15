// Form handler with Cloudflare Worker integration
(function() {
    'use strict';

    // ВАЖНО: Обнови этот URL после деплоя Cloudflare Worker!
    const FORM_API_URL = 'https://platform.mctl.me/api/submit';

    const form = document.getElementById('access-form');
    const formStatus = document.getElementById('form-status');

    // Validation regexes
    const teamNameRegex = /^[a-z0-9][a-z0-9-]{0,62}$/;
    const githubUsernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]){0,38}$/;

    // Real-time validation
    const teamInput = document.getElementById('team');
    const githubInput = document.getElementById('github');

    if (teamInput) {
        teamInput.addEventListener('input', function() {
            validateTeamName(this);
        });
    }

    if (githubInput) {
        githubInput.addEventListener('input', function() {
            validateGithubUsername(this);
        });
    }

    function validateTeamName(input) {
        const value = input.value.trim();
        if (value === '') {
            input.setCustomValidity('');
            return;
        }
        if (!teamNameRegex.test(value)) {
            input.setCustomValidity('Team name must be lowercase alphanumeric with hyphens (max 63 chars)');
        } else {
            input.setCustomValidity('');
        }
    }

    function validateGithubUsername(input) {
        const value = input.value.trim();
        if (value === '') {
            input.setCustomValidity('');
            return;
        }
        if (!githubUsernameRegex.test(value)) {
            input.setCustomValidity('Invalid GitHub username format');
        } else {
            input.setCustomValidity('');
        }
    }

    // Form submission
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;

            // Disable button and show loading
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="terminal-prompt">$</span> Submitting...';

            // Collect form data
            const formData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                github: document.getElementById('github').value.trim(),
                team: document.getElementById('team').value.trim(),
                usecase: document.getElementById('usecase').value.trim()
            };

            // Validate
            if (!teamNameRegex.test(formData.team)) {
                showStatus('❌ ERROR: Invalid team name format', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return;
            }

            if (!githubUsernameRegex.test(formData.github)) {
                showStatus('❌ ERROR: Invalid GitHub username format', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
                return;
            }

            try {
                // Send to Cloudflare Worker
                const response = await fetch(FORM_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (result.success) {
                    showStatus(result.message, 'success');
                    form.reset();
                } else {
                    showStatus('❌ ERROR: ' + result.message, 'error');
                }
            } catch (error) {
                console.error('Submission error:', error);
                showStatus('❌ ERROR: Failed to submit. Please try again.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    function showStatus(message, type) {
        formStatus.textContent = message;
        formStatus.className = `form-status ${type}`;

        // Auto-hide after 10 seconds
        setTimeout(function() {
            formStatus.style.display = 'none';
        }, 10000);
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Terminal cursor effect
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.style.caretColor = '#00f5ff';
        });
    });
})();
