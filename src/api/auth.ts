export function isApaleoApp() {
  const authType =
    PropertiesService.getScriptProperties().getProperty("AUTH_TYPE");

  return authType === "authorization_code";
}

declare const OAuth2: GoogleAppsScriptOAuth2.OAuth2;

interface OAuth2ServiceWithPrivateApi extends GoogleAppsScriptOAuth2.OAuth2Service {
  exchangeGrant_(): void;
}

function isOAuth2ServiceWithPrivateApi(service: GoogleAppsScriptOAuth2.OAuth2Service): service is OAuth2ServiceWithPrivateApi {
  return !!service && !!(service as OAuth2ServiceWithPrivateApi).exchangeGrant_;
}


export function getApaleoAuthService() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const userProperties = PropertiesService.getUserProperties();

  const properties = isApaleoApp() ? scriptProperties : userProperties;

  const CLIENT_ID = properties.getProperty("CLIENT_ID") || '';
  const CLIENT_SECRET = properties.getProperty("CLIENT_SECRET") || '';

  const service = OAuth2.createService("apaleoAPI")
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

  if (isApaleoApp()) {
    service
      .setScope(
        "offline_access openid profile accounting.read availability.read reports.read reservations.read identity:account-users.read"
      )
      .setCallbackFunction("authCallback");
  } else {
    service
      .setScope(
        "accounting.read availability.read reports.read reservations.read identity:account-users.read"
      )
      .setGrantType("client_credentials");
  }

  return service;
}

/**
 * Callback handler that is executed after an authorization attempt.
 * @param {Object} request The results of API auth request.
 */
export function authCallback(request: {}) {
  var template = HtmlService.createTemplateFromFile("Callback");
  template.isSignedIn = false;
  template.error = null;
  var title;
  try {
    var service = getApaleoAuthService();
    var authorized = service.handleCallback(request);
    template.isSignedIn = authorized;
    title = authorized ? "Access Granted" : "Access Denied";
  } catch (e) {
    template.error = e;
    title = "Access Error";
  }
  template.title = title;

  return template
    .evaluate()
    .setTitle(title)
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

/**
 * Builds and returns the authorization URL from the service object.
 * @return {String} The authorization URL.
 */
export function getAuthorizationUrl() {
  return getApaleoAuthService().getAuthorizationUrl();
}

/**
 * Resets the API service, forcing re-authorization before
 * additional authorization-required API calls can be made.
 */
export function signOut() {
  getApaleoAuthService().reset();
}

export function getClient() {
  return {
    fetch(url: string, opt_options?: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions) {
      var service = getApaleoAuthService();
      if (!service.hasAccess()) {
        throw new Error("Error: Missing Apaleo authorization.");
      }

      const options = opt_options || {};
      if (!options.headers) {
        options.headers = {};
      }

      options.headers.Authorization = "Bearer " + service.getAccessToken();

      return UrlFetchApp.fetch(url, options);
    },
  };
}

export function setClientId() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.prompt(
    "Authentication",
    "Please provide your Client ID:",
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() == ui.Button.OK) {
    PropertiesService.getUserProperties().setProperty(
      "CLIENT_ID",
      response.getResponseText()
    );
  }
}

export function setClientSecret() {
  const ui = SpreadsheetApp.getUi();

  const response = ui.prompt(
    "Authentication",
    "Please provide your Client Secret:",
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() == ui.Button.OK) {
    PropertiesService.getUserProperties().setProperty(
      "CLIENT_SECRET",
      response.getResponseText()
    );
    const service = getApaleoAuthService();
    service.reset();

    if (isOAuth2ServiceWithPrivateApi(service)) {
      service.exchangeGrant_();
    }
  }
}

export function deleteCredential() {
  PropertiesService.getUserProperties()
    .deleteProperty("CLIENT_ID")
    .deleteProperty("CLIENT_SECRET");
  getApaleoAuthService().reset();
}
