import { getResponseBody } from "./utils";
import { getClient } from "./auth";
import { IdentityModels, InventoryModels, ReportsModels } from './schema';

const apaleoApiUrl = "https://api.apaleo.com";

const defaultOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions =
  {
    method: "get",
    muteHttpExceptions: true,
  };

/**
 * Returns info about current user
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

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
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

export function getGrossTransactions(
  property: string,
  startDate: string,
  endDate: string
) {
  const endpointUrl =
    apaleoApiUrl + "/reports/v0-nsfw/reports/gross-transactions";

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    ...defaultOptions,
    method: "post",
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
