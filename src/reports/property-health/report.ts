export function generatePropertyHealthReport(
  property: string
) {
  const datasheet = SpreadsheetApp.getActiveSheet();
  datasheet.clear();
  datasheet.clearFormats();

  const firstCell = datasheet.getRange(1, 1);
  firstCell.setValue("Property Health Report").setFontSize(18);

  datasheet
    .getRange(2, 1)
    .setValue(`for property ${property} on ${(new Date()).toLocaleDateString()}`);

  datasheet.appendRow([" "]);
}
