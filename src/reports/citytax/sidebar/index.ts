// Compiled using @apaleo/gsheet-addon 1.0.0 (TypeScript 4.9.5)
var exports = exports || {};
var module = module || { exports: exports };
"use strict";
exports.CityTaxReport = void 0;
//import {Auth} from 'api/auth';
var CityTaxReport = /** @class */ (function () {
    function CityTaxReport() {
    }
    CityTaxReport.openSidebar = function () {
        var service = Auth.getApaleoAuthService();
        var template = HtmlService.createTemplateFromFile("reports/citytax/sidebar/sidebar");
        template.isSignedIn = service.hasAccess();
        template.isCustomApp = !Auth.isApaleoApp();
        var sidebar = template
            .evaluate()
            .setTitle("City Tax Report")
            .setSandboxMode(HtmlService.SandboxMode.IFRAME);
        SpreadsheetApp.getUi().showSidebar(sidebar);
    };
    return CityTaxReport;
}());
exports.CityTaxReport = CityTaxReport;
