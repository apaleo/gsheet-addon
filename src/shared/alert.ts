// Compiled using @apaleo/gsheet-addon 1.0.0 (TypeScript 4.9.5)
var exports = exports || {};
var module = module || { exports: exports };
"use strict";
exports.AlertUtility = exports.alert = void 0;
function alert(msg) {
    Browser.msgBox(msg, Browser.Buttons.OK);
}
exports.alert = alert;
var AlertUtility = /** @class */ (function () {
    function AlertUtility() {
    }
    AlertUtility.alert = function (msg) {
        alert(msg);
    };
    return AlertUtility;
}());
exports.AlertUtility = AlertUtility;
