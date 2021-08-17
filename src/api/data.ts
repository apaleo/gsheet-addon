import { getClient } from "./auth";
import { definitions as IdentityModels } from "./schema/identity";
import { definitions as InventoryModels } from "./schema/inventory";
import { definitions as ReportsModels } from "./schema/reports";

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
export function getCurrentUserInfo() {
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

  return getResponseBody<IdentityModels["UserModel"]>(
    client.fetch(detailsUrl, options)
  );
}

export function getPropertyList() {
  const url = apaleoApiUrl + "/inventory/v1/properties";

  const client = getClient();
  const body = getResponseBody<InventoryModels["PropertyListModel"]>(
    client.fetch(url, defaultOptions)
  );

  return (body && body.properties) || [];
}

export function getGrossTransactions(property, startDate, endDate) {
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
  const body = getResponseBody<
    ReportsModels["TransactionsGrossExportListModel"]
  >(client.fetch(url, options));

  return (body && body.transactions) || [];
}
