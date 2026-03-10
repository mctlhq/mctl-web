// MCTL i18n engine
// Runs before form.js; exposes window.i18n
(function () {
    'use strict';

    // ─── Domain → language config ─────────────────────────────────────────
    // Add new domains / languages here without touching anything else.
    var DOMAIN_CONFIG = {
        'mctl.ai':    { allowed: ['en', 'ru'], default: 'en' },
        'mctl.me':    { allowed: ['en', 'ru'], default: 'en' },
        'mctl.ru':    { allowed: ['ru', 'en'], default: 'ru' },
        'localhost':  { allowed: ['ru', 'en'], default: 'ru' },
        '127.0.0.1':  { allowed: ['ru', 'en'], default: 'ru' },
    };

    var STORAGE_KEY = 'mctl_lang';

    // ─── Resolve domain config ────────────────────────────────────────────
    var hostname = window.location.hostname;
    var domainCfg = DOMAIN_CONFIG[hostname];
    if (!domainCfg) {
        // Unknown domain — English only
        domainCfg = { allowed: ['en'], default: 'en' };
    }

    // ─── Detect language ──────────────────────────────────────────────────
    function detectLang() {
        // 1. Saved preference
        var saved = localStorage.getItem(STORAGE_KEY);
        if (saved && domainCfg.allowed.indexOf(saved) !== -1) return saved;

        // 2. Browser language
        var browser = (navigator.language || 'en').split('-')[0].toLowerCase();
        if (domainCfg.allowed.indexOf(browser) !== -1) return browser;

        // 3. Domain default
        return domainCfg.default;
    }

    var currentLang = detectLang();
    localStorage.setItem(STORAGE_KEY, currentLang);

    var translations = window.MCTL_TRANSLATIONS || {};

    // ─── t(): translate with optional {{var}} interpolation ──────────────
    function t(key, vars) {
        var langMap = translations[currentLang] || {};
        var fallbackMap = translations['en'] || {};
        var str = langMap[key] !== undefined ? langMap[key] : (fallbackMap[key] !== undefined ? fallbackMap[key] : key);
        if (vars) {
            str = str.replace(/\{\{(\w+)\}\}/g, function (_, k) {
                return vars[k] !== undefined ? vars[k] : '';
            });
        }
        return str;
    }

    // ─── Apply translations to DOM ────────────────────────────────────────
    function applyTranslations() {
        // data-i18n → textContent
        var textEls = document.querySelectorAll('[data-i18n]');
        for (var i = 0; i < textEls.length; i++) {
            textEls[i].textContent = t(textEls[i].getAttribute('data-i18n'));
        }

        // data-i18n-html → innerHTML (trusted translations only)
        var htmlEls = document.querySelectorAll('[data-i18n-html]');
        for (var j = 0; j < htmlEls.length; j++) {
            htmlEls[j].innerHTML = t(htmlEls[j].getAttribute('data-i18n-html'));
        }

        // data-i18n-attr → specific attributes, format: "attr:key,attr2:key2"
        var attrEls = document.querySelectorAll('[data-i18n-attr]');
        for (var k = 0; k < attrEls.length; k++) {
            var el = attrEls[k];
            var parts = el.getAttribute('data-i18n-attr').split(',');
            for (var p = 0; p < parts.length; p++) {
                var pair = parts[p].split(':');
                var attrName = pair[0].trim();
                var attrKey  = pair.slice(1).join(':').trim();
                el.setAttribute(attrName, t(attrKey));
            }
        }

        // Update <html lang>
        document.documentElement.lang = currentLang;

        // Update <title>
        var titleKey = t('meta.title');
        if (titleKey) document.title = titleKey;

        // Update meta description, OG, Twitter
        updateMeta('name', 'description', t('meta.description'));
        updateMeta('property', 'og:title', t('meta.og_title'));
        updateMeta('property', 'og:description', t('meta.og_description'));
        updateMeta('name', 'twitter:title', t('meta.tw_title'));
        updateMeta('name', 'twitter:description', t('meta.tw_description'));
    }

    function updateMeta(attrName, attrValue, content) {
        var el = document.querySelector('meta[' + attrName + '="' + attrValue + '"]');
        if (el) el.setAttribute('content', content);
    }

    // ─── Public API ───────────────────────────────────────────────────────
    window.i18n = {
        t:           t,
        currentLang: currentLang,
        allowed:     domainCfg.allowed,

        /** Manually switch language and reload translations. */
        setLang: function (lang) {
            if (domainCfg.allowed.indexOf(lang) === -1) return;
            currentLang = lang;
            window.i18n.currentLang = lang;
            localStorage.setItem(STORAGE_KEY, lang);
            applyTranslations();
        },
    };

    // Apply on DOMContentLoaded (or immediately if already loaded)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyTranslations);
    } else {
        applyTranslations();
    }
})();
