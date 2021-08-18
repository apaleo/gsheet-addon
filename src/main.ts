import { openORLSidebar  } from 'reports/orl/sidebar';
import { isApaleoApp } from "./api/auth";

/**
 * Runs when the add-on is installed; calls onOpen() to ensure menu creation and
 * any other initializion work is done immediately.
 * @param {Object} e The event parameter for a simple onInstall trigger.
 */
 export function onInstall(e: GoogleAppsScript.Events.AppsScriptEvent) {
  onOpen(e);
}

/**
 * Adds a custom menu with items to show the sidebar.
 * @param {Object} e The event parameter for a simple onOpen trigger.
 */
export function onOpen(e: GoogleAppsScript.Events.AppsScriptEvent) {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createAddonMenu();
  const authMode = e && e.authMode;

  // if we have permissions to read the document properties
  // and make a call to isApaleoApp function
  if (authMode !== ScriptApp.AuthMode.NONE && !isApaleoApp()) {
    menu
      .addSubMenu(
        ui
          .createMenu("Authentication")
          .addItem("Set Client ID", "setClientId")
          .addItem("Set Client Secret", "setClientSecret")
          .addItem("Delete all credentials", "deleteCredential")
      )
      .addSeparator();
  }

  menu.addItem("Open Receivables & Liabilities", "openORLSidebar").addToUi();

  if (authMode == ScriptApp.AuthMode.FULL) {
    openORLSidebar();
  }
}

