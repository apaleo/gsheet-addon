import { getApaleoAuthService, isApaleoApp } from 'api/auth';

export function openCityTaxSidebar() {
    const service = getApaleoAuthService();

    const template = HtmlService.createTemplateFromFile("reports/citytax/sidebar/sidebar");
    template.isSignedIn = service.hasAccess();
    template.isCustomApp = !isApaleoApp();

    const sidebar = template
      .evaluate()
      .setTitle("City Tax Report")
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);

    SpreadsheetApp.getUi().showSidebar(sidebar);
}
