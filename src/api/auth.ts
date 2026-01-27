// Compiled using @apaleo/gsheet-addon 1.0.0 (TypeScript 4.9.5)
var exports = exports || {};
var module = module || { exports: exports };
"use strict";
exports.signOut = exports.getAuthorizationUrl = exports.Auth = void 0;
var Auth = /** @class */ (function () {
    function Auth() {
    }
    Auth.isApaleoApp = function () {
        var authType = PropertiesService.getScriptProperties().getProperty("AUTH_TYPE");
        return authType === "authorization_code";
    };
    Auth.getApaleoAuthService = function () {
        var scriptProperties = PropertiesService.getScriptProperties();
        var userProperties = PropertiesService.getUserProperties();
        var properties = Auth.isApaleoApp() ? scriptProperties : userProperties;
        var CLIENT_ID = properties.getProperty("CLIENT_ID") || '';
        var CLIENT_SECRET = properties.getProperty("CLIENT_SECRET") || '';
        var service = OAuth2.createService("apaleoAPI")
            .setAuthorizationBaseUrl("https://identity.apaleo.com/connect/authorize")
            .setTokenUrl("https://identity.apaleo.com/connect/token")
            .setClientId(CLIENT_ID)
            .setClientSecret(CLIENT_SECRET)
            // Set the property store where authorized tokens should be persisted.
            .setPropertyStore(userProperties)
            // Scripts that use the OAuth2 library heavily should enable caching on the service, so as to not exhaust their `PropertiesService` quotas.
            .setCache(CacheService.getUserCache())
            // A race condition can occur when two or more script executions are both trying to
            // refresh an expired token at the same time. To prevent this, use locking to ensure that only one execution is refreshing
            // the token at a time. To enable locking, simply add a `LockService` lock when
            // configuring the service:
            .setLock(LockService.getUserLock());
        if (Auth.isApaleoApp()) {
            service
                .setScope("offline_access openid profile accounting.read availability.read reports.read reservations.read identity:account-users.read")
                .setCallbackFunction("Auth.authCallback");
        }
        else {
            service
                .setScope("accounting.read availability.read reports.read reservations.read identity:account-users.read")
                .setGrantType("client_credentials");
        }
        return service;
    };
    Auth.isOAuth2ServiceWithPrivateApi = function (service) {
        return !!service && !!service.exchangeGrant_;
    };
    /**
     * Callback handler that is executed after an authorization attempt.
     * @param {Object} request The results of API auth request.
     */
    Auth.authCallback = function (request) {
        var template = HtmlService.createTemplateFromFile("Callback");
        template.isSignedIn = false;
        template.error = null;
        var title;
        try {
            var service = Auth.getApaleoAuthService();
            var authorized = service.handleCallback(request);
            template.isSignedIn = authorized;
            title = authorized ? "Access Granted" : "Access Denied";
        }
        catch (e) {
            template.error = e;
            title = "Access Error";
        }
        template.title = title;
        return template
            .evaluate()
            .setTitle(title)
            .setSandboxMode(HtmlService.SandboxMode.IFRAME);
    };
    Auth.getClient = function () {
        return {
            fetch: function (url, opt_options) {
                var service = Auth.getApaleoAuthService();
                if (!service.hasAccess()) {
                    throw new Error("Error: Missing Apaleo authorization.");
                }
                var options = opt_options || {};
                if (!options.headers) {
                    options.headers = {};
                }
                options.headers.Authorization = "Bearer " + service.getAccessToken();
                return UrlFetchApp.fetch(url, options);
            }
        };
    };
    Auth.setClientId = function () {
        var ui = SpreadsheetApp.getUi();
        var response = ui.prompt("Authentication", "Please provide your Client ID:", ui.ButtonSet.OK_CANCEL);
        if (response.getSelectedButton() == ui.Button.OK) {
            PropertiesService.getUserProperties().setProperty("CLIENT_ID", response.getResponseText());
        }
    };
    Auth.setClientSecret = function () {
        var ui = SpreadsheetApp.getUi();
        var response = ui.prompt("Authentication", "Please provide your Client Secret:", ui.ButtonSet.OK_CANCEL);
        if (response.getSelectedButton() == ui.Button.OK) {
            PropertiesService.getUserProperties().setProperty("CLIENT_SECRET", response.getResponseText());
            var service = Auth.getApaleoAuthService();
            service.reset();
            if (Auth.isOAuth2ServiceWithPrivateApi(service)) {
                service.exchangeGrant_();
            }
        }
    };
    Auth.deleteCredential = function () {
        PropertiesService.getUserProperties()
            .deleteProperty("CLIENT_ID")
            .deleteProperty("CLIENT_SECRET");
        Auth.getApaleoAuthService().reset();
    };
    return Auth;
}());
exports.Auth = Auth;
/**
 * Builds and returns the authorization URL from the service object.
 * @return {String} The authorization URL.
 */
function getAuthorizationUrl() {
    return Auth.getApaleoAuthService().getAuthorizationUrl();
}
exports.getAuthorizationUrl = getAuthorizationUrl;
/**
 * Resets the API service, forcing re-authorization before
 * additional authorization-required API calls can be made.
 */
function signOut() {
    Auth.getApaleoAuthService().reset();
}
exports.signOut = signOut;
