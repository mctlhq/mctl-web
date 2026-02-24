/* jshint esversion: 8 */
'use strict';

App.UI = {
    showSuccessModal: function() {
        App.DOM.successModal.style.display = 'flex';
    },

    hideSuccessModal: function() {
        App.DOM.successModal.style.display = 'none';
    },

    showStatus: function(message, type) {
        App.DOM.formStatus.textContent = message;
        App.DOM.formStatus.className = 'form-status ' + type;
        setTimeout(function() {
            App.DOM.formStatus.className = 'form-status';
            App.DOM.formStatus.textContent = '';
        }, 10000);
    },

    showContactStatus: function(message, type) {
        App.DOM.contactStatus.textContent = message;
        App.DOM.contactStatus.className = 'form-status ' + type;
        setTimeout(function() {
            App.DOM.contactStatus.className = 'form-status';
            App.DOM.contactStatus.textContent = '';
        }, 10000);
    },

    showAuthError: function(message) {
        App.DOM.authErrorEl.textContent = message;
        App.DOM.authErrorEl.style.display = 'block';
        setTimeout(function() { App.DOM.authErrorEl.style.display = 'none'; }, 10000);
    }
};
