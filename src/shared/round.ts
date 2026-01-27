// Compiled using @apaleo/gsheet-addon 1.0.0 (TypeScript 4.9.5)
var exports = exports || {};
var module = module || { exports: exports };
"use strict";
exports.MathUtility = void 0;
var MathUtility = /** @class */ (function () {
    function MathUtility() {
    }
    MathUtility.round = function (num) {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    };
    return MathUtility;
}());
exports.MathUtility = MathUtility;
