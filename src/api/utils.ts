// Compiled using @apaleo/gsheet-addon 1.0.0 (TypeScript 4.9.5)
var exports = exports || {};
var module = module || { exports: exports };
"use strict";
exports.APIUtility = void 0;
var APIUtility = /** @class */ (function () {
    function APIUtility() {
    }
    APIUtility.getResponseBody = function (response) {
        var code = response.getResponseCode();
        // No content
        if (code == 204) {
            return undefined;
        }
        else if (code == 403) {
            throw new Error("Access denied");
        }
        try {
            var content = response.getContentText();
            // OK
            if (code == 200) {
                return JSON.parse(content);
            }
            // It's an error
            var error = JSON.parse(content);
            if (error.messages) {
                throw new Error(error.messages.join(". "));
            }
            if (error.message) {
                throw new Error(error.message);
            }
            throw new Error(error);
        }
        catch (e) {
            Logger.log(e);
            Logger.log("Response code: " + code);
            throw e;
        }
    };
    return APIUtility;
}());
exports.APIUtility = APIUtility;
