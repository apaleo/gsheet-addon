// Compiled using @apaleo/gsheet-addon 1.0.0 (TypeScript 4.9.5)
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var exports = exports || {};
var module = module || { exports: exports };
"use strict";
exports.getPropertyList = exports.getCurrentUserInfo = exports.APIData = void 0;
//import {IdentityModels, InventoryModels, ReportsModels, FinanceModels, BookingModels} from "./schema";
//import {DateUtility} from "../shared";
//import {Auth} from "./auth";
//import {APIUtility} from "./utils";
var apaleoApiUrl = "https://api.apaleo.com";
var defaultOptions = {
    method: "get", muteHttpExceptions: true
};
var APIData = /** @class */ (function () {
    function APIData() {
    }
    APIData.getGrossTransactions = function (property, startDate, endDate) {
        var endpointUrl = apaleoApiUrl + "/reports/v0-nsfw/reports/gross-transactions";
        var options = __assign(__assign({}, defaultOptions), { method: "post" });
        var queryParams = ["propertyId=" + property, "datefilter=" + "gte_" + startDate + "," + "lte_" + endDate,];
        var client = Auth.getClient();
        var url = endpointUrl + "?" + queryParams.join("&");
        var body = APIUtility.getResponseBody(client.fetch(url, options));
        return (body && body.transactions) || [];
    };
    APIData.getAccountTransactions = function (property, accountCode, startDate, endDate) {
        var endpointUrl = apaleoApiUrl + "/finance/v1/accounts/export";
        var options = __assign(__assign({}, defaultOptions), { method: "post" });
        var queryParams = ["propertyId=" + property, "accountNumber=" + accountCode, "from=" + DateUtility.startOf(startDate), "to=" + DateUtility.endOf(endDate)];
        var client = Auth.getClient();
        var url = endpointUrl + "?" + queryParams.join("&");
        var body = APIUtility.getResponseBody(client.fetch(url, options));
        return (body && body.transactions) || [];
    };
    APIData.getReservations = function (property, stayStartDate, stayEndDate) {
        var endpointUrl = apaleoApiUrl + "/booking/v1/reservations";
        var queryParams = ["propertyId=" + property];
        if (stayStartDate || stayEndDate) {
            queryParams.push('dateFilter=Stay');
        }
        if (stayStartDate) {
            queryParams.push('from=' + DateUtility.startOf(stayStartDate));
        }
        if (stayEndDate) {
            queryParams.push('to=' + DateUtility.endOf(stayEndDate));
        }
        var client = Auth.getClient();
        var url = endpointUrl + "?" + queryParams.join("&");
        var body = APIUtility.getResponseBody(client.fetch(url, defaultOptions));
        return (body && body.reservations) || [];
    };
    return APIData;
}());
exports.APIData = APIData;
/**
 * Returns info about current user
 */
function getCurrentUserInfo() {
    var identityUrl = "https://identity.apaleo.com";
    var client = Auth.getClient();
    var user = APIUtility.getResponseBody(client.fetch("".concat(identityUrl, "/connect/userinfo"), defaultOptions));
    if (!user || !user.sub) {
        throw new Error("User not found");
    }
    var detailsUrl = "".concat(identityUrl, "/api/v1/users/").concat(user.sub);
    var options = __assign(__assign({}, defaultOptions), { headers: {
            Accept: "application/json"
        } });
    return APIUtility.getResponseBody(client.fetch(detailsUrl, options));
}
exports.getCurrentUserInfo = getCurrentUserInfo;
function getPropertyList() {
    var url = apaleoApiUrl + "/inventory/v1/properties";
    var client = Auth.getClient();
    var body = APIUtility.getResponseBody(client.fetch(url, defaultOptions));
    return (body && body.properties) || [];
}
exports.getPropertyList = getPropertyList;
