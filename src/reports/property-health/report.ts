import { getReservations, getReservationsCount } from "api/reservations";

export function generatePropertyHealthReport(property: string) {
  const datasheet = SpreadsheetApp.getActiveSheet();
  datasheet.clear();
  datasheet.clearFormats();

  const firstCell = datasheet.getRange(1, 1);
  firstCell.setValue("Property Health Report").setFontSize(18);

  datasheet
    .getRange(2, 1)
    .setValue(`for property ${property} on ${new Date().toLocaleDateString()}`);

  datasheet.appendRow([" "]);

  const count = getReservationsCount({
    propertyIds: [property],
    dateFilter: "Departure",
    to: new Date().toISOString(),
    balanceFilter: [ "neq_0" ]
  });

  datasheet.appendRow([
    "Reservations with open balance and departure date in the past", count
  ]);
}
