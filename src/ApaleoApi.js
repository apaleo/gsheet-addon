const apaleoApiUrl = "https://api.apaleo.com";

function getApaleoAuthService() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const CLIENT_ID = scriptProperties.getProperty('CLIENT_ID');
  const CLIENT_SECRET = scriptProperties.getProperty('CLIENT_SECRET');

  return (
    OAuth2.createService("apaleoAPI")
      .setAuthorizationBaseUrl("https://identity.apaleo.com/connect/authorize")
      .setTokenUrl("https://identity.apaleo.com/connect/token")
      .setClientId(CLIENT_ID)
      .setClientSecret(CLIENT_SECRET)
      .setCallbackFunction("authCallback")
      .setScope(
        "offline_access openid profile accounting.read availability.read reports.read reservations.read identity:account-users.read"
      )
      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore(PropertiesService.getUserProperties())
      // Scripts that use the OAuth2 library heavily should enable caching on the service, so as to not exhaust their `PropertiesService` quotas.
      .setCache(CacheService.getUserCache())
      // A race condition can occur when two or more script executions are both trying to
      // refresh an expired token at the same time. To prevent this, use locking to ensure that only one execution is refreshing
      // the token at a time. To enable locking, simply add a `LockService` lock when
      // configuring the service:
      .setLock(LockService.getUserLock())
  );
}

/**
 * Callback handler that is executed after an authorization attempt.
 * @param {Object} request The results of API auth request.
 */
function authCallback(request) {
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
function getAuthorizationUrl() {
  return getApaleoAuthService().getAuthorizationUrl();
}

/**
 * Resets the API service, forcing re-authorization before
 * additional authorization-required API calls can be made.
 */
function signOut() {
  getApaleoAuthService().reset();
}

function getClient() {
  return {
    fetch(url, opt_options) {
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

const defaultOptions = {
  method: "GET",
  muteHttpExceptions: true,
};

/**
 * Returns info about current user
 * @return {Object} {
 *    account_code: "CODE",
 *    azp: "client id",
 *    name: "max.mustermann@mail.de"
 *    preferred_username: "FirstName LastName"
 *    sub: "subjectId"
 * }
 *
 */
function getCurrentUserInfo() {
  const identityUrl = "https://identity.apaleo.com";

  const client = getClient();
  const user = getResponseBody(
    client.fetch(`${identityUrl}/connect/userinfo`, defaultOptions)
  );

  if (!user || !user.sub) {
    throw new Error("User not found");
  }

  const detailsUrl = `${identityUrl}/api/v1/users/${user.sub}`;

  const options = {
    ...defaultOptions,
    headers: {
      Accept: "application/json",
    },
  };

  return getResponseBody(client.fetch(detailsUrl, options));
}

function getPropertyList() {
  const url = apaleoApiUrl + "/inventory/v1/properties";

  const client = getClient();
  const body = getResponseBody(client.fetch(url, defaultOptions));

  return (body && body.properties) || [];
}

function getGrossTransactions(property, startDate, endDate) {
  const endpointUrl = apaleoApiUrl + "/reports/v0-nsfw/reports/gross-transactions";

  const options = {
    ...defaultOptions,
    method: "POST",
  };

  const queryParams = [
    "propertyId=" + property,
    "datefilter=" + "gte_" + startDate + "," + "lte_" + endDate,
  ];

  const client = getClient();
  const url = endpointUrl + "?" + queryParams.join("&");
  const body = getResponseBody(client.fetch(url, options));

  return (body && body.transactions) || [];
}
