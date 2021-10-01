import { getApaleoAuthService, isApaleoApp } from 'api/auth';

export function openPropertyHealthReportSidebar() {
    const service = getApaleoAuthService();

    const template = HtmlService.createTemplateFromFile("reports/property-health/sidebar/sidebar");
    template.isSignedIn = service.hasAccess();
    template.isCustomApp = !isApaleoApp();

    const sidebar = template
      .evaluate()
      .setTitle("Property Health")
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);

    SpreadsheetApp.getUi().showSidebar(sidebar);
}
