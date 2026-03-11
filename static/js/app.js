/* jshint esversion: 8 */
// Shared namespace and API constants
window.App = window.App || {};

App.FORM_API_URL  = document.querySelector('meta[name="mctl-api-submit"]')?.content || '/api/submit';
App.CHECK_TEAM_URL = document.querySelector('meta[name="mctl-api-check-team"]')?.content || '/api/github/check-team';
