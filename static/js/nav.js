/* jshint esversion: 8 */
'use strict';

App.Nav = {
    toggle: function() {
        App.DOM.burgerMenu.classList.toggle('active');
        App.DOM.navLinks.classList.toggle('active');
        App.DOM.navOverlay.classList.toggle('active');
        const isOpen = App.DOM.navLinks.classList.contains('active');
        document.body.style.overflow = isOpen ? 'hidden' : '';
        App.DOM.burgerMenu.setAttribute('aria-expanded', isOpen);
    },

    close: function() {
        App.DOM.burgerMenu.classList.remove('active');
        App.DOM.navLinks.classList.remove('active');
        App.DOM.navOverlay.classList.remove('active');
        document.body.style.overflow = '';
        App.DOM.burgerMenu.setAttribute('aria-expanded', 'false');
    },

    init: function() {
        if (App.DOM.burgerMenu) {
            App.DOM.burgerMenu.addEventListener('click', App.Nav.toggle);
            App.DOM.burgerMenu.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    App.Nav.toggle();
                }
            });
        }

        if (App.DOM.navOverlay) {
            App.DOM.navOverlay.addEventListener('click', App.Nav.close);
        }

        document.querySelectorAll('.nav-links a').forEach(function(link) {
            link.addEventListener('click', App.Nav.close);
        });
    }
};
