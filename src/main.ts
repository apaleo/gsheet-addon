// Compiled using @apaleo/gsheet-addon 1.0.0 (TypeScript 4.9.5)
var exports = exports || {};
var module = module || { exports: exports };
"use strict";
exports.onOpen = exports.onInstall = void 0;
//import {Auth} from "./api/auth";
//import {ORLReport} from "./reports/orl/sidebar";
/**
 * Runs when the add-on is installed; calls onOpen() to ensure menu creation and
 * any other initializion work is done immediately.
 * @param {Object} e The event parameter for a simple onInstall trigger.
 */
function onInstall(e) {
    onOpen(e);
}
exports.onInstall = onInstall;
/**
 * Adds a custom menu with items to show the sidebar.
 * @param {Object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
    var ui = SpreadsheetApp.getUi();
    var menu = ui.createAddonMenu();
    var authMode = e && e.authMode;
    // if we have permissions to read the document properties
    // and make a call to isApaleoApp function
    if (authMode !== ScriptApp.AuthMode.NONE && !Auth.isApaleoApp()) {
        menu
            .addSubMenu(ui
            .createMenu("Authentication")
            .addItem("Set Client ID", "setClientId")
            .addItem("Set Client Secret", "setClientSecret")
            .addItem("Delete all credentials", "deleteCredential"))
            .addSeparator();
    }
    menu.addItem("Open Receivables & Liabilities", "ORLReport.openSidebar").addToUi();
    menu.addItem("City Tax Report", "CityTaxReport.openSidebar").addToUi();
    if (authMode == ScriptApp.AuthMode.FULL) {
        ORLReport.openSidebar();
    }
}
exports.onOpen = onOpen;
