/* jshint esversion: 8 */
'use strict';

App.Validators = {
    rules: {
        team: {
            regex: /^[a-z0-9][a-z0-9-]{0,62}$/,
            message: 'Team name must be lowercase alphanumeric with hyphens (max 63 chars)'
        }
    },

    validate: function(fieldName, value) {
        const v = this.rules[fieldName];
        if (!v) return null;
        if (v.regex && !v.regex.test(value)) return v.message;
        if (v.minLength && value.length < v.minLength) return v.message;
        if (v.custom && !v.custom(value)) return v.message;
        return null;
    }
};
