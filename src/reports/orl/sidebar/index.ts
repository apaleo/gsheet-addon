// Compiled using @apaleo/gsheet-addon 1.0.0 (TypeScript 4.9.5)
var exports = exports || {};
var module = module || { exports: exports };
"use strict";
exports.ORLReport = void 0;
//import {Auth} from 'api/auth';
var ORLReport = /** @class */ (function () {
    function ORLReport() {
    }
    ORLReport.openSidebar = function () {
        var service = Auth.getApaleoAuthService();
        var template = HtmlService.createTemplateFromFile("reports/orl/sidebar/sidebar");
        template.isSignedIn = service.hasAccess();
        template.isCustomApp = !Auth.isApaleoApp();
        var sidebar = template
            .evaluate()
            .setTitle("Open Receivables & Liabilities")
            .setSandboxMode(HtmlService.SandboxMode.IFRAME);
        SpreadsheetApp.getUi().showSidebar(sidebar);
    };
    return ORLReport;
}());
exports.ORLReport = ORLReport;
