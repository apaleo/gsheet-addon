import {getResponseBody} from "./utils";
import {getClient} from "./auth";
import {IdentityModels, InventoryModels, ReportsModels, FinanceModels, BookingModels} from "./schema";

const apaleoApiUrl = "https://api.apaleo.com";

const defaultOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: "get", muteHttpExceptions: true,
};

/**
 * Returns info about current user
 */
export function getCurrentUserInfo() {
    const identityUrl = "https://identity.apaleo.com";

    const client = getClient();
    const user = getResponseBody(client.fetch(`${identityUrl}/connect/userinfo`, defaultOptions));

    if (!user || !user.sub) {
        throw new Error("User not found");
    }

    const detailsUrl = `${identityUrl}/api/v1/users/${user.sub}`;

    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        ...defaultOptions, headers: {
            Accept: "application/json",
        },
    };

    return getResponseBody<IdentityModels["UserModel"]>(client.fetch(detailsUrl, options));
}

export function getPropertyList() {
    const url = apaleoApiUrl + "/inventory/v1/properties";

    const client = getClient();
    const body = getResponseBody<InventoryModels["PropertyListModel"]>(client.fetch(url, defaultOptions));

    return (body && body.properties) || [];
}

export function getAccountTransactions(property: string, accountCode: string, startDate: Date, endDate: Date) {
    const endpointUrl = apaleoApiUrl + "/finance/v1/accounts/export";

    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        ...defaultOptions, method: "post",
    };

    const queryParams = ["propertyId=" + property, "accountNumber=" + accountCode, "from=" + startDate.toISOString().slice(0, 10) + "T00:00:00Z", "to=" + endDate.toISOString().slice(0, 10) + "T23:59:59Z",];

    const client = getClient();
    const url = endpointUrl + "?" + queryParams.join("&");
    const body = getResponseBody<FinanceModels["AccountingTransactionListModel"]>(client.fetch(url, options));

    return (body && body.transactions) || [];
}

export function getReservations(property: string, stayStartDate?: Date, stayEndDate?: Date) {
    const endpointUrl = apaleoApiUrl + "/booking/v1/reservations";

    const queryParams = ["propertyId=" + property];
    if (stayStartDate || stayEndDate) queryParams.push('dateFilter=Stay');
    if (stayStartDate) queryParams.push('from=' + stayStartDate.toISOString().slice(0, 10) + "T00:00:00Z");
    if (stayEndDate) queryParams.push('to=' + stayEndDate.toISOString().slice(0, 10) + "T23:59:59Z");
    const client = getClient();
    const url = endpointUrl + "?" + queryParams.join("&");
    const body = getResponseBody<BookingModels["ReservationListModel"]>(client.fetch(url, defaultOptions));

    return (body && body.reservations) || [];
}

export function getGrossTransactions(property: string, startDate: string, endDate: string) {
    const endpointUrl = apaleoApiUrl + "/reports/v0-nsfw/reports/gross-transactions";

    const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
        ...defaultOptions, method: "post",
    };

    const queryParams = ["propertyId=" + property, "datefilter=" + "gte_" + startDate + "," + "lte_" + endDate,];

    const client = getClient();
    const url = endpointUrl + "?" + queryParams.join("&");
    const body = getResponseBody<ReportsModels["TransactionsGrossExportListModel"]>(client.fetch(url, options));

    return (body && body.transactions) || [];
}
