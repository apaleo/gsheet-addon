// Compiled using @apaleo/gsheet-addon 1.0.0 (TypeScript 4.9.5)
var exports = exports || {};
var module = module || { exports: exports };
"use strict";
exports.Clock = void 0;
//import { format } from './format';
var Clock = /** @class */ (function () {
    function Clock(start) {
        if (start === void 0) { start = Date.now(); }
        this.start = start;
    }
    Clock.prototype.set = function () {
        this.start = Date.now();
    };
    Clock.prototype.check = function () {
        var now = Date.now();
        var diff = now - this.start;
        this.start = now;
        return (0, format_1.format)(diff);
    };
    return Clock;
}());
exports.Clock = Clock;
