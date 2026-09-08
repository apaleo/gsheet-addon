// Compiled using @apaleo/gsheet-addon 1.0.0 (TypeScript 4.9.5)
var exports = exports || {};
var module = module || { exports: exports };
"use strict";
exports.DateUtility = void 0;
//import {__} from "lodash";
var DateUtility = /** @class */ (function () {
    function DateUtility() {
    }
    DateUtility.addDays = function (date, days) {
        var result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };
    DateUtility.startOf = function (date) {
        return date.toISOString().slice(0, 10) + "T00:00:00Z";
    };
    DateUtility.endOf = function (date) {
        return date.toISOString().slice(0, 10) + "T23:59:59Z";
    };
    DateUtility.getDates = function (startDate, stopDate) {
        var dateArray = [];
        var currentDate = new Date(startDate);
        var endDate = new Date(stopDate);
        while (currentDate <= endDate) {
            dateArray.push(currentDate);
            currentDate = DateUtility.addDays(currentDate, 1);
        }
        return dateArray;
    };
    DateUtility.lodash = function () {
        // @ts-ignore
        return LodashGS.load();
    };
    return DateUtility;
}());
exports.DateUtility = DateUtility;
