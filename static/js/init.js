/* jshint esversion: 8 */
'use strict';

(function() {
    function revealAnimations() {
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

        document.querySelectorAll('.reveal, .diagram-box, .feature-card').forEach(function(el) {
            el.classList.add('reveal');
            observer.observe(el);
        });
    }

    function anchorScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
            });
        });
    }

    function terminalCursor() {
        document.querySelectorAll('input:not(:disabled), textarea').forEach(function(input) {
            input.addEventListener('focus', function() {
                this.style.caretColor = '#00f5ff';
            });
        });
    }

    // Wire up all modules
    const version = (document.querySelector('meta[name="app-version"]') || {}).content || '—';
    console.log('%c MCTL v' + version + ' ', 'background:#00f5ff;color:#0a0e27;font-weight:bold;padding:2px 8px;border-radius:3px');

    const footerVersion = document.getElementById('footer-version');
    if (footerVersion) footerVersion.textContent = 'v' + version;

    App.DOM.successModalClose.addEventListener('click', App.UI.hideSuccessModal);
    document.getElementById('github-logout').addEventListener('click', function() { App.Auth.logout(); });

    App.TeamInput.init();
    App.AccessForm.init();
    App.ContactForm.init();
    App.Nav.init();

    anchorScroll();
    terminalCursor();

    document.addEventListener('DOMContentLoaded', revealAnimations);

    App.Auth.checkOAuthReturn();
})();
