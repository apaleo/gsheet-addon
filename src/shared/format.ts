// Compiled using @apaleo/gsheet-addon 1.0.0 (TypeScript 4.9.5)
var exports = exports || {};
var module = module || { exports: exports };
"use strict";
exports.FormatUtility = void 0;
//import {MathUtility} from "./round";
var FormatUtility = /** @class */ (function () {
    function FormatUtility() {
    }
    FormatUtility.format = function (timeInMs) {
        if (timeInMs < 100) {
            return "".concat(timeInMs, "ms");
        }
        if (timeInMs < 1000 * 60) {
            return "".concat(MathUtility.round(timeInMs / 1000), "s");
        }
        var mins = Math.floor(timeInMs / 1000 / 60);
        var diff = timeInMs - mins * 1000 * 60;
        return diff > 0 ? "".concat(mins, "m ").concat(FormatUtility.format(diff)) : "".concat(mins, "m");
    };
    FormatUtility.formattedExecutionTime = function () {
        var spreadSheetTimezone = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
        var timezone = spreadSheetTimezone ? spreadSheetTimezone : "GMT";
        var formattedDate = Utilities.formatDate(new Date(), timezone, "EEE, d MMM yyyy, HH:mm");
        return formattedDate + " (" + timezone + ")";
    };
    return FormatUtility;
}());
exports.FormatUtility = FormatUtility;
