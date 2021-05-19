/**
 * Adds a custom menu with items to show the sidebar.
 * @param {Object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createAddonMenu()
    .addItem("Open Receivables & Liabilities", "openSidebar")
    .addToUi();

  if (e && e.authMode == ScriptApp.AuthMode.FULL) {
    openSidebar();
  }
}

/**
 * Runs when the add-on is installed; calls onOpen() to ensure menu creation and
 * any other initializion work is done immediately.
 * @param {Object} e The event parameter for a simple onInstall trigger.
 */
function onInstall(e) {
  onOpen(e);
}

function openSidebar() {
  const service = getApaleoAuthService();

  const template = HtmlService.createTemplateFromFile("Sidebar");
  template.isSignedIn = service.hasAccess();

  const sidebar = template
    .evaluate()
    .setTitle("Open Receivables & Liabilities")
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);

  SpreadsheetApp.getUi().showSidebar(sidebar);
}

function generateReport(property, startDate, endDate) {
  const datasheet = SpreadsheetApp.getActiveSheet();

  const firstCell = datasheet.getRange(1, 1);
  if (!firstCell.getValue()) {
    firstCell.setValue("Open Receivables & Liabilities Report").setFontSize(18);
  }

  // Clear Datasheet except headers
  if (datasheet.getLastRow() > 1) {
    const startRow = 5;
    const startColumn = 1;

    datasheet
      .getRange(
        startRow,
        startColumn,
        datasheet.getLastRow() - 1,
        datasheet.getLastColumn()
      )
      .clearContent();
  }

  const transactions = getGrossTransactions(
    property,
    startDate,
    endDate
  ).filter((transaction) => transaction.referenceType == "Guest");

  const reservationsWithTransactions = Object.values(
    transactions.reduce((reservations, transaction) => {
      // get reservation from the dictionary by id
      const reservation = reservations[transaction.reservation.id];

      if (!reservation) {
        // if it's a new reservation then we store the info about it
        const { id, arrival, departure, status } = transaction.reservation;
        reservations[id] = {
          id,
          arrival: arrival.substr(0, 10),
          departure: departure.substr(0, 10),
          status,
          // and create a list of transactions for that resevation.
          // We will use it later on to calculate OpenReceivables and OpenLiabilities
          transactions: [transaction],
        };
      } else {
        // if it already exists
        // We just add the transaction to the list of reservation transactions
        reservation.transactions.push(transaction);
      }

      return reservations;
    }, {})
  );

  // Calculate Receivables/Liabilities for all reservations found and push them to reservation details
  for (let reservation of reservationsWithTransactions) {
    reservation.receivables = round(
      reservation.transactions
        .filter((t) => t.debitedAccount.type == "Receivables")
        .reduce((sum, t) => sum + Number(t.grossAmount), 0)
    );

    reservation.liabilities = round(
      reservation.transactions
        .filter((t) => t.creditedAccount.type == "Liabilities")
        .reduce((sum, t) => sum + Number(t.grossAmount), 0)
    );
  }

  const cleanReservations = reservationsWithTransactions.filter(
    (r) => r.receivables || r.liabilities
  );

  const rows = cleanReservations.map((r) => [
    `=HYPERLINK("https://app.apaleo.com/${property}/reservations/${r.id}"; "${r.id}")`,
    r.arrival,
    r.departure,
    r.status,
    r.receivables.toFixed(2),
    r.liabilities.toFixed(2),
  ]);

  const headersRange = datasheet.getRange(4, 1, 1, 6);
  const headers = headersRange.getValues()[0];

  if (headers.some((h) => !h)) {
    headersRange
      .setValues([
        [
          "Reservation ID",
          "Arrival",
          "Departure",
          "Status",
          "Receivables",
          "Liabilities",
        ],
      ])
      .setFontWeight("bold")
      .setBorder(false, false, true, false, false, false);
  }

  if (cleanReservations.length) {
    // Push data at once into the sheet for performance reasons; Set summary at the end of the file for documentation
    datasheet.getRange(5, 1, cleanReservations.length, 6).setValues(rows);
  }

  datasheet
    .getRange(2, 1)
    .clear()
    .setValue(`for property ${property} from ${startDate} to ${endDate}`);

  datasheet.appendRow([" "]);
  datasheet.appendRow([
    `Number of reservations with calculated balances: ${reservationsWithTransactions.length}, thereof ${cleanReservations.length} with open balance.`,
  ]);
}
