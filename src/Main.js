/**
 * Adds a custom menu with items to show the sidebar.
 * @param {Object} e The event parameter for a simple onOpen trigger.
 */
function onOpen(e) {
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

  menu.addItem("Open Receivables & Liabilities", "openSidebar").addToUi();

  if (authMode == ScriptApp.AuthMode.FULL) {
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
  template.isCustomApp = !isApaleoApp();

  const sidebar = template
    .evaluate()
    .setTitle("Open Receivables & Liabilities")
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);

  SpreadsheetApp.getUi().showSidebar(sidebar);
}

/**
 * Main function to generate "Open Receivables & Liabilities Report" (ORL Report).
 * The report is based on the gross transaction list. Check {@link https://api.apaleo-staging.com/swagger/index.html?urls.primaryName=Reports%20NSFW|Apaleo API} for references.
 * This function is triggered from the UI side (Sidebar component - SidebarScript.html):
 * @example
 * submit() {
 *      ...
 *      scriptService
 *         .generateORLReport(property, arrivalStr, departureStr)
 *
 * @param {String} property Property code
 * @param {String} startDate The start date for the gross transactions list in the YYYY-MM-DD format.
 * @param {String} endDate The end date for the gross transactions list in the YYYY-MM-DD format
 */
function generateORLReport(property, startDate, endDate) {
  const clock = new Clock();

  const data = getGrossTransactions(property, startDate, endDate);

  Logger.log(`Retrieved ${data.length} transactions - ${clock.check()}`);
  clock.set();

  const transactions = data.filter(
    (transaction) => transaction.referenceType == "Guest"
  );
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

  const vatTypesInfo = {};
  const targetReservations = [];
  const totals = {
    receivables: 0,
    liabilities: {}
  };

  // Calculate Receivables/Liabilities for all reservations found and push them to reservation details
  for (let reservation of reservationsWithTransactions) {
    const receivables = round(
      reservation.transactions
        .filter((t) => t.debitedAccount.type === "Receivables")
        .reduce((sum, t) => sum + Number(t.grossAmount), 0)
    );

    const liabilities = reservation.transactions
      .filter((t) => t.creditedAccount.type === "Liabilities")
      .reduce(
        (info, t) => {
          const tax = t.taxes && t.taxes[0];
          const key = getVatTypeKey(tax);
          const amount = Number(t.grossAmount);

          info[key] = (info[key] || 0) + amount;
          info.total = info.total + amount;

          if (!vatTypesInfo[key]) {
            vatTypesInfo[key] = tax
              ? { key, type: tax.type, percent: tax.percent }
              : { key };
          }

          return info;
        },
        { total: 0 }
      );

    if (receivables || round(liabilities.total)) {
      reservation.receivables = receivables;
      totals.receivables = totals.receivables + receivables;

      reservation.liabilities = {};

      for (let key in liabilities) {
        const amount = round(liabilities[key]);

        reservation.liabilities[key] = amount;
        totals.liabilities[key] = (totals.liabilities[key] || 0) + amount;
      }

      targetReservations.push(reservation);
    }
  }

  const usedVatTypes = Object.keys(totals.liabilities); // we can ignore 'total' property here
  const liabilitiesColumns = Object.values(vatTypesInfo)
    .filter(type => usedVatTypes.indexOf(type.key) !== -1)
    .sort((a, b) => a.percent - b.percent)
    .map((vat) => ({
      displayName: vat.type
        ? `Liab. ${vat.type} ${vat.percent || 0}%`
        : `Liab. ${vat.key}`,
      key: vat.key,
    }));

  const rows = targetReservations.map((r) => [
    `=HYPERLINK("https://app.apaleo.com/${property}/reservations/${r.id}/folio"; "${r.id}")`,
    r.arrival,
    r.departure,
    r.status,
    r.receivables,
    r.liabilities.total,
    ...liabilitiesColumns.map((c) => r.liabilities[c.key] || 0),
  ]);
  const totalRow = [
    '', // id
    '', // arrival
    '', // departure
    'Total', // status
    round(totals.receivables),
    round(totals.liabilities.total),
    ...liabilitiesColumns.map((c) => round(totals.liabilities[c.key])),
  ];

  Logger.log(
    `Processed ${transactions.length} transactions - ${clock.check()}`
  );

  const datasheet = SpreadsheetApp.getActiveSheet();
  datasheet.clear();
  datasheet.clearFormats();

  const firstCell = datasheet.getRange(1, 1);
  firstCell.setValue("Open Receivables & Liabilities Report").setFontSize(18);

  // Setting headers
  datasheet.getRange(
    4,
    1,
    1,
    6 + liabilitiesColumns.length
  ).setValues([
      [
        "Reservation ID",
        "Arrival",
        "Departure",
        "Status",
        "Receivables",
        "Liabilities",
        ...liabilitiesColumns.map((c) => c.displayName),
      ],
    ])
    .setFontWeight("bold")
    .setBorder(false, false, true, false, false, false);

    // Push data at once into the sheet for performance reasons; Set summary at the end of the file for documentation
  if (targetReservations.length) {
    datasheet
      .getRange(5, 1, targetReservations.length, 6 + liabilitiesColumns.length)
      .setValues(rows);

    datasheet.appendRow(totalRow);

    datasheet
      .getRange(5, 5, targetReservations.length + 1, 2 + liabilitiesColumns.length)
      .setNumberFormat("0.00");
  }

  datasheet
    .getRange(2, 1)
    .setValue(`for property ${property} from ${startDate} to ${endDate}`);

  datasheet.appendRow([" "]);
  datasheet.appendRow([
    `Number of reservations with calculated balances: ${reservationsWithTransactions.length}, thereof ${targetReservations.length} with open balance. ${transactions.length} Transactions.`,
  ]);
}

function getVatTypeKey(vatOrTaxInfo) {
  if (vatOrTaxInfo && vatOrTaxInfo.type !== "Without") {
    const { type, percent } = vatOrTaxInfo;

    return `${type}-${percent}`;
  }

  return "Without";
}
