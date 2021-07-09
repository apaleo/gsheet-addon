const apaleoApiUrl = "https://api.apaleo.com";

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
  const endpointUrl =
    apaleoApiUrl + "/reports/v0-nsfw/reports/gross-transactions";

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
