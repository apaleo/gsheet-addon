// Compiled using @apaleo/gsheet-addon 1.0.0 (TypeScript 4.9.5)
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var exports = exports || {};
var module = module || { exports: exports };
"use strict";
exports.generateORLReport = void 0;
//import {ReportsModels} from 'api/schema';
//import {LRReportRowItemModel, VatInfo} from './interfaces';
//import {FormatUtility, MathUtility} from "../../shared";
//import {APIData} from "../../api/data";
var REPORT_TABLE_STARTING_ROW_NUMBER = 5;
var NUMARIC_COLUMNS_COUNT = 5;
/**
 * Main function to generate "Open Receivables & Liabilities Report" (ORL Report).
 * The report is based on the gross transaction list. Check {@link https://api.apaleo-staging.com/swagger/index.html?urls.primaryName=Reports%20NSFW|Apaleo API} for references.
 * This function is triggered from the UI side (Sidebar component - SidebarScript.html):
 * @example
 * submit() {
 *      ...
 *      scriptService
 *         .generateORLReport(property, arrivalStr, departureStr, previousDatasheet, previousLineNumber)
 *
 * @param {String} property Property code
 * @param {String} startDate The start date for the gross transactions list in the YYYY-MM-DD format.
 * @param {String} endDate The end date for the gross transactions list in the YYYY-MM-DD format
 * @param previousDatasheet
 * @param previousLineNumber
 */
function generateORLReport(property, startDate, endDate, previousDatasheet, previousLineNumber) {
    // const clock = new Clock();
    // @ts-ignore
    var moment = Moment.load();
    var diffInMonths = moment(endDate).diff(moment(startDate), 'months');
    var data = [];
    for (var i = 0; i <= diffInMonths; i++) {
        var durationStart = startDate;
        var durationEnd = endDate;
        if (i > 0) {
            durationStart = moment(startDate).add(i, 'months').startOf('month').format('YYYY-MM-DD');
        }
        if (i < diffInMonths) {
            durationEnd = moment(startDate).add(i, 'months').endOf('month').format('YYYY-MM-DD');
        }
        data.push.apply(data, APIData.getGrossTransactions(property, durationStart, durationEnd));
    }
    // Logger.log(`Retrieved ${data.length} transactions - ${clock.check()}`);
    // clock.set();
    var transactions = data.filter(function (transaction) {
        return transaction.referenceType == "Guest" ||
            transaction.referenceType == "External" ||
            transaction.referenceType == "Booking";
    });
    var intialState = {};
    var groupedRecords = Object.values(transactions.reduce(function (groups, transaction) {
        var groupId = getRecordId(transaction);
        var group = groups[groupId];
        if (!group) {
            groups[groupId] = createRecordForTransaction(transaction);
        }
        else {
            // if it already exists
            // We just add the transaction to the list of reservation transactions
            group.transactions.push(transaction);
        }
        return groups;
    }, intialState));
    var vatTypesInfo = {};
    var reportRecords = [];
    var totals = {
        receivables: 0,
        liabilities: {
            total: 0
        }
    };
    // Calculate Receivables/Liabilities for all reservations found and push them to reservation details
    for (var _i = 0, groupedRecords_1 = groupedRecords; _i < groupedRecords_1.length; _i++) {
        var record = groupedRecords_1[_i];
        var receivables = MathUtility.round(record.transactions
            .filter(function (t) { return t.debitedAccount.type === "Receivables"; })
            .reduce(function (sum, t) { return sum + Number(t.grossAmount); }, 0));
        var liabilities = record.transactions
            .filter(function (t) { return t.creditedAccount.type === "Liabilities"; })
            .reduce(function (info, t) {
            var tax = t.taxes && t.taxes[0];
            var key = getVatTypeKey(tax);
            var amount = Number(t.grossAmount);
            info[key] = (info[key] || 0) + amount;
            info.total = info.total + amount;
            if (!vatTypesInfo[key]) {
                vatTypesInfo[key] = tax
                    ? { key: key, type: tax.type, percent: tax.percent }
                    : { key: key };
            }
            return info;
        }, { total: 0 });
        if (receivables || MathUtility.round(liabilities.total)) {
            record.receivables = receivables;
            totals.receivables = totals.receivables + receivables;
            for (var key in liabilities) {
                var amount = MathUtility.round(liabilities[key]);
                record.liabilities[key] = amount;
                totals.liabilities[key] = (totals.liabilities[key] || 0) + amount;
            }
            if (record.receivables + record.liabilities.total === 0)
                continue;
            reportRecords.push(record);
        }
    }
    var usedVatTypes = Object.keys(totals.liabilities); // we can ignore 'total' property here
    var liabilitiesColumns = Object.values(vatTypesInfo)
        .filter(function (type) { return usedVatTypes.indexOf(type.key) !== -1; })
        .sort(function (a, b) { return (b.percent || 0) - (a.percent || 0); })
        .map(function (vat) { return ({
        displayName: vat.type
            ? "Liab. ".concat(vat.type, " ").concat(vat.percent || 0, "%")
            : "Liab. ".concat(vat.key),
        key: vat.key
    }); });
    var rows = reportRecords
        .map(function (r) {
        return __spreadArray([
            createHyperLinkForRecord(property, r),
            r.arrival,
            r.departure,
            r.status,
            r.receivables,
            r.liabilities.total
        ], liabilitiesColumns.map(function (c) { return r.liabilities[c.key] || 0; }), true);
    });
    // Take receivables and liabilities from previous datasheet into account
    // TODO: Improve this and handle the case when there's a difference between the number of columns (liabilitiesColumns).
    if (previousLineNumber && previousDatasheet) {
        var dataRangeNotation = previousDatasheet + "!A6:I" + previousLineNumber;
        var oldDataRange = SpreadsheetApp.getActive().getRange(dataRangeNotation).getValues();
        var rowLength = rows[0].length;
        var _loop_1 = function (oldRow) {
            var existingRow = rows.find(function (row) {
                return String(row[0]).includes("/" + oldRow[0] + "/");
            });
            if (existingRow) {
                for (var i = 4; i < existingRow.length; i++) {
                    var value = existingRow.at(i);
                    if (!value)
                        continue;
                    var oldValue = oldRow.at(i);
                    if (!oldValue)
                        continue;
                    existingRow[i] = Number(value) + Number(oldValue);
                }
            }
            else {
                var arr = new Array(rowLength - 6).fill(undefined);
                rows.push(__spreadArray([
                    createHyperLinkForRecord(property, {
                        liabilities: { total: 0 },
                        receivables: 0,
                        transactions: [],
                        id: oldRow[0],
                        type: oldRow[3]
                    }),
                    oldRow[1],
                    oldRow[2],
                    oldRow[3],
                    oldRow[4],
                    oldRow[5]
                ], arr, true));
            }
            totals.receivables += oldRow[4];
            totals.liabilities.total += oldRow[5];
        };
        for (var _a = 0, oldDataRange_1 = oldDataRange; _a < oldDataRange_1.length; _a++) {
            var oldRow = oldDataRange_1[_a];
            _loop_1(oldRow);
        }
    }
    // remote empty rows
    rows = rows.filter(function (r) { return Number(r.at(4)) + Number(r.at(5)) !== 0; });
    var totalRow = __spreadArray([
        "",
        "",
        "",
        "Total",
        MathUtility.round(totals.receivables),
        MathUtility.round(totals.liabilities.total)
    ], liabilitiesColumns.map(function (c) { var _a; return MathUtility.round((_a = totals.liabilities[c.key]) !== null && _a !== void 0 ? _a : 0); }), true);
    // Logger.log(
    //   `Processed ${transactions.length} transactions - ${clock.check()}`
    // );
    var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var newSheetName = property + endDate;
    var datasheet = activeSpreadsheet.getSheetByName(newSheetName);
    if (!datasheet) {
        datasheet = activeSpreadsheet.insertSheet().setName(newSheetName);
    }
    datasheet.clear();
    datasheet.clearFormats();
    activeSpreadsheet.setActiveSheet(datasheet);
    var firstCell = datasheet.getRange(1, 1);
    firstCell.setValue("Open Receivables & Liabilities Report").setFontSize(18);
    // Setting headers
    datasheet
        .getRange(REPORT_TABLE_STARTING_ROW_NUMBER, 1, 1, 6 + liabilitiesColumns.length)
        .setValues([
        __spreadArray([
            "Reservation ID",
            "Arrival",
            "Departure",
            "Status",
            "Receivables",
            "Liabilities"
        ], liabilitiesColumns.map(function (c) { return c.displayName; }), true),
    ])
        .setFontWeight("bold")
        .setBorder(false, false, true, false, false, false);
    // Push data at once into the sheet for performance reasons; Set summary at the end of the file for documentation
    if (rows.length) {
        var range = datasheet
            .getRange(REPORT_TABLE_STARTING_ROW_NUMBER + 1, 1, rows.length, rows[0].length);
        activeSpreadsheet.setNamedRange("ORLTableData", range);
        range
            .setValues(rows);
        datasheet.appendRow(totalRow);
        datasheet
            .getRange(REPORT_TABLE_STARTING_ROW_NUMBER + 1, NUMARIC_COLUMNS_COUNT, rows.length + 1, rows[0].length - NUMARIC_COLUMNS_COUNT)
            .setNumberFormat("0.00");
    }
    datasheet
        .getRange(2, 1)
        .setValue("for property ".concat(property, " from ").concat(startDate, " to ").concat(endDate));
    datasheet
        .getRange(3, 1)
        .setValue("Executed: " + FormatUtility.formattedExecutionTime());
    datasheet.appendRow([" "]);
    datasheet.appendRow([
        "".concat(transactions.length, " Transactions processed. Number of records with the open balance: ") +
            "total - ".concat(rows.length, ", \n      reservations - ").concat(reportRecords.filter(function (r) { return r.type === "Guest"; }).length, ",\n      booking folios - ").concat(reportRecords.filter(function (r) { return r.type === "Booking"; }).length, ",\n      external folios - ").concat(reportRecords.filter(function (r) { return r.type === "External"; }).length),
    ]);
}
exports.generateORLReport = generateORLReport;
function getVatTypeKey(taxOrUndefined) {
    if (taxOrUndefined && taxOrUndefined.type !== 'Without') {
        var type = taxOrUndefined.type, percent = taxOrUndefined.percent;
        return "".concat(type, "-").concat(percent);
    }
    return 'Without';
}
function getRecordId(transaction) {
    return transaction.referenceType === "Guest"
        ? transaction.reservation.id
        : transaction.reference;
}
function createRecordForTransaction(transaction) {
    switch (transaction.referenceType) {
        case "Booking":
            return {
                id: transaction.reference,
                type: "Booking",
                transactions: [transaction],
                receivables: 0,
                liabilities: { total: 0 }
            };
        case "Guest":
            var _a = transaction.reservation, id = _a.id, arrival = _a.arrival, departure = _a.departure, status = _a.status;
            return {
                id: id,
                type: "Guest",
                arrival: arrival.substr(0, 10),
                departure: departure.substr(0, 10),
                status: status,
                transactions: [transaction],
                receivables: 0,
                liabilities: { total: 0 }
            };
        case "External":
            return {
                id: transaction.reference,
                type: "External",
                transactions: [transaction],
                receivables: 0,
                liabilities: { total: 0 }
            };
        default:
            throw new Error("Transactions with reference type ".concat(transaction.referenceType, " are not supported"));
    }
}
function createHyperLinkForRecord(propertyId, r) {
    switch (r.type) {
        case "Guest":
            return "=HYPERLINK(\"https://app.apaleo.com/".concat(propertyId, "/reservations/").concat(r.id, "/folio\"; \"").concat(r.id, "\")");
        case "Booking":
            return "=HYPERLINK(\"https://app.apaleo.com/".concat(propertyId, "/bookings/").concat(r.id, "/folio\"; \"").concat(r.id, "\")");
        case "External":
            return "=HYPERLINK(\"https://app.apaleo.com/".concat(propertyId, "/finance/folios/").concat(r.id, "/general\"; \"").concat(r.id, "\")");
        default:
            return r.id;
    }
}
