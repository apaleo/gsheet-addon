import { getApaleoAuthService, isApaleoApp } from 'api/auth';

export function openORLSidebar() {
    const service = getApaleoAuthService();

    const template = HtmlService.createTemplateFromFile("reports/orl/sidebar/sidebar");
    template.isSignedIn = service.hasAccess();
    template.isCustomApp = !isApaleoApp();

    const sidebar = template
      .evaluate()
      .setTitle("Open Receivables & Liabilities")
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);

    SpreadsheetApp.getUi().showSidebar(sidebar);
}
