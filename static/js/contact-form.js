/* jshint esversion: 8 */
'use strict';

App.ContactForm = {
    init: function() {
        if (!App.DOM.contactForm) return;

        App.DOM.contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const name    = document.getElementById('contact-name').value.trim();
            const email   = document.getElementById('contact-email').value.trim();
            const message = document.getElementById('contact-message').value.trim();

            if (!name || !email || !message) {
                App.UI.showContactStatus(window.i18n.t('js.contact.fill_all'), 'error');
                return;
            }

            const originalText = App.DOM.contactSubmitBtn.innerHTML;
            App.DOM.contactSubmitBtn.disabled = true;
            App.DOM.contactSubmitBtn.innerHTML = '<span class="terminal-prompt">$</span> ' + window.i18n.t('js.contact.sending');

            try {
                const response = await fetch('https://mctl.me/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, message }),
                });

                const result = await response.json();

                if (result.success) {
                    App.UI.showContactStatus(result.message, 'success');
                    App.DOM.contactForm.reset();
                } else {
                    App.UI.showContactStatus(result.message, 'error');
                }
            } catch (error) {
                console.error('Contact form error:', error);
                App.UI.showContactStatus(window.i18n.t('js.contact.network_error'), 'error');
            } finally {
                App.DOM.contactSubmitBtn.disabled = false;
                App.DOM.contactSubmitBtn.innerHTML = originalText;
            }
        });
    }
};
