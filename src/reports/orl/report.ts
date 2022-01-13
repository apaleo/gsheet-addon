import {getGrossTransactions} from 'api/data';
import {ReportsModels} from 'api/schema';
import {Clock, round} from 'shared';
import {LRReportRowItemModel, VatInfo} from './interfaces';

/**
 * Main function to generate "Open Receivables & Liabilities Report" (ORL Report).
 * The report is based on the gross transaction list. Check {@link https://api.apaleo-staging.com/swagger/index.html?urls.primaryName=Reports%20NSFW|Apaleo API} for references.
 * This function is triggered from the UI side (Sidebar component - SidebarScript.html):
 * @example
 * submit() {
 *      ...
 *      scriptService
 *         .generateORLReport(property, arrivalStr, departureStr, false)
 *
 * @param {String} property Property code
 * @param {String} startDate The start date for the gross transactions list in the YYYY-MM-DD format.
 * @param {String} endDate The end date for the gross transactions list in the YYYY-MM-DD format
 * @param {Boolean} useNegativeLiabilitiesAsReceivables If liabilities 0%/without VAT are negative, make them 0 and increase receivables instead.
 */
export function generateORLReport(
  property: string,
  startDate: string,
  endDate: string,
  useNegativeLiabilitiesAsReceivables: boolean,
) {
  const clock = new Clock();

  const data = getGrossTransactions(property, startDate, endDate);

  Logger.log(`Retrieved ${data.length} transactions - ${clock.check()}`);
  clock.set();

  const transactions = data.filter(
    (transaction) =>
      transaction.referenceType == "Guest" ||
      transaction.referenceType == "External"
  );

  const intialState: Record<string, LRReportRowItemModel> = {};
  const groupedRecords = Object.values(
    transactions.reduce((groups, transaction) => {
      const groupId = getRecordId(transaction);
      const group = groups[groupId];

      if (!group) {
        groups[groupId] = createRecordForTransaction(transaction);
      } else {
        // if it already exists
        // We just add the transaction to the list of reservation transactions
        group.transactions.push(transaction);
      }

      return groups;
    }, intialState)
  );

  const vatTypesInfo: Record<string, VatInfo> = {};
  const guestRecords = [];
  const externalRecords = [];

  const totals = {
    receivables: 0,
    liabilities: {
      total: 0,
    } as Record<string, number>,
  };

  const isZeroVat = (vatType: string) => vatType === "Without" || vatType.endsWith("-0")

  // Calculate Receivables/Liabilities for all reservations found and push them to reservation details
  for (let record of groupedRecords) {
    let receivablesTransactions = record.transactions.filter((t) => t.debitedAccount.type === "Receivables").map(t => Number(t.grossAmount));
    let liabilitiesTransactions = record.transactions.filter((t) => t.creditedAccount.type === "Liabilities").map(t => {
      const tax = t.taxes && t.taxes[0];
      const vatTypeKey = getVatTypeKey(tax);
      return {grossAmount: Number(t.grossAmount), vatTypeKey, tax}
    });

    const receivables = round(receivablesTransactions.reduce((sum, grossAmount) => sum + grossAmount, 0));

    const liabilities = liabilitiesTransactions
      .reduce(
        (info, t) => {
          const amount = t.grossAmount;

          info[t.vatTypeKey] = (info[t.vatTypeKey] || 0) + amount;
          info.total = info.total + amount;

          if (!vatTypesInfo[t.vatTypeKey]) {
            vatTypesInfo[t.vatTypeKey] = t.tax
              ? { key: t.vatTypeKey, type: t.tax.type, percent: t.tax.percent }
              : { key: t.vatTypeKey };
          }

          return info;
        },
        { total: 0 } as Record<string, number>
      );


    if (receivables || round(liabilities.total)) {
      record.receivables = receivables;
      totals.receivables = totals.receivables + receivables;

      for (let key in liabilities) {
        const amount = round(liabilities[key]);

        if (useNegativeLiabilitiesAsReceivables && isZeroVat(key) && amount < 0) {
          record.liabilities[key] = 0;
          record.receivables += -amount;
          totals.receivables += -amount;
        } else {
          record.liabilities[key] = amount;
          totals.liabilities[key] = (totals.liabilities[key] || 0) + amount;
        }
      }

      if (record.type == "Guest") {
        guestRecords.push(record);
      } else {
        externalRecords.push(record);
      }
    }
  }

  const usedVatTypes = Object.keys(totals.liabilities); // we can ignore 'total' property here
  const liabilitiesColumns = Object.values(vatTypesInfo)
    .filter((type) => usedVatTypes.indexOf(type.key) !== -1)
    .sort((a, b) => (b.percent || 0) - (a.percent || 0))
    .map((vat) => ({
      displayName: vat.type
        ? `Liab. ${vat.type} ${vat.percent || 0}%`
        : `Liab. ${vat.key}`,
      key: vat.key,
    }));

  const rows = [...guestRecords, ...externalRecords].map((r) => [
    createHyperLinkForRecord(property, r),
    r.arrival,
    r.departure,
    r.status,
    r.receivables,
    r.liabilities.total,
    ...liabilitiesColumns.map((c) => r.liabilities[c.key] || 0),
  ]);

  const totalRow = [
    "", // id
    "", // arrival
    "", // departure
    "Total", // status
    round(totals.receivables),
    round(totals.liabilities.total),
    ...liabilitiesColumns.map((c) => round(totals.liabilities[c.key])),
  ];

  // Logger.log(
  //   `Processed ${transactions.length} transactions - ${clock.check()}`
  // );

  const datasheet = SpreadsheetApp.getActiveSheet();
  datasheet.clear();
  datasheet.clearFormats();

  const firstCell = datasheet.getRange(1, 1);
  firstCell.setValue("Open Receivables & Liabilities Report").setFontSize(18);

  // Setting headers
  datasheet
    .getRange(4, 1, 1, 6 + liabilitiesColumns.length)
    .setValues([
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
  if (rows.length) {
    datasheet
      .getRange(5, 1, rows.length, 6 + liabilitiesColumns.length)
      .setValues(rows);

    datasheet.appendRow(totalRow);

    datasheet
      .getRange(5, 5, rows.length + 1, 2 + liabilitiesColumns.length)
      .setNumberFormat("0.00");
  }

  datasheet
    .getRange(2, 1)
    .setValue(`for property ${property} from ${startDate} to ${endDate}`);

  datasheet.appendRow([" "]);
  datasheet.appendRow([
    `${transactions.length} Transactions processed. Number of records with the open balance: ` +
      `total - ${rows.length}, reservations - ${guestRecords.length}, external folios - ${externalRecords.length}`,
  ]);
}

function getVatTypeKey(
  vatOrTaxInfo: ReportsModels["TaxAmountModel"] | undefined
) {
  if (vatOrTaxInfo && vatOrTaxInfo.type !== "Without") {
    const { type, percent } = vatOrTaxInfo;

    return `${type}-${percent}`;
  }

  return "Without";
}

function getRecordId(
  transaction: ReportsModels["TransactionsGrossExportListItemModel"]
) {
  return transaction.referenceType === "Guest"
    ? transaction.reservation!.id
    : transaction.reference;
}

function createRecordForTransaction(
  transaction: ReportsModels["TransactionsGrossExportListItemModel"]
): LRReportRowItemModel {
  switch (transaction.referenceType) {
    case "Guest":
      const { id, arrival, departure, status } = transaction.reservation!;

      return {
        id,
        type: "Guest",
        arrival: arrival.substr(0, 10),
        departure: departure.substr(0, 10),
        status,
        transactions: [transaction],
        receivables: 0,
        liabilities: { total: 0 },
      };
    case "External":
      return {
        id: transaction.reference,
        type: "External",
        transactions: [transaction],
        receivables: 0,
        liabilities: { total: 0 },
      };
    default:
      throw new Error(
        `Transactions with reference type ${transaction.referenceType} are not supported`
      );
  }
}

function createHyperLinkForRecord(propertyId: string, r: LRReportRowItemModel) {
  switch (r.type) {
    case "Guest":
      return `=HYPERLINK("https://app.apaleo.com/${propertyId}/reservations/${r.id}/folio"; "${r.id}")`;
    case "External":
      return `=HYPERLINK("https://app.apaleo.com/${propertyId}/finance/folios/${r.id}/general"; "${r.id}")`;
    default:
      return r.id;
  }
}
