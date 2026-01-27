// Compiled using @apaleo/gsheet-addon 1.0.0 (TypeScript 4.9.5)
var exports = exports || {};
var module = module || { exports: exports };
"use strict";
exports.include = void 0;
function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
exports.include = include;
