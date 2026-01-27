// Compiled using @apaleo/gsheet-addon 1.0.0 (TypeScript 4.9.5)
var exports = exports || {};
var module = module || { exports: exports };
"use strict";
exports.getCities = exports.generateCityTaxReport = void 0;
//import {BerlinCityTaxRowItemModel, CityTax, HamburgCityTaxRowItemModel} from "./interfaces";
//import {DateUtility, FormatUtility} from "shared";
//import {BookingModels, FinanceModels} from "api/schema";
//import {APIData} from "../../api/data";
function generateCityTaxReport(city, property, startDate, endDate) {
    var transactionStartDate = DateUtility.addDays(startDate, -60);
    var transactionEndDate = DateUtility.addDays(endDate, 60);
    var transactions = getTransactions(property, transactionStartDate, transactionEndDate, startDate, endDate);
    var reservations = APIData.getReservations(property, DateUtility.addDays(startDate, -120), DateUtility.addDays(startDate, 120));
    var sheet = createSheetWithReportInfo(city, property, endDate, startDate);
    switch (city) {
        case CityTax.BERLIN:
            generateBerlinCityTax(sheet, transactions, reservations);
            break;
        case CityTax.HAMBURG:
            generateHamburgCityTax(sheet, transactions, reservations);
            break;
    }
}
exports.generateCityTaxReport = generateCityTaxReport;
function getCities() {
    return Object.keys(CityTax);
}
exports.getCities = getCities;
function generateBerlinCityTax(sheet, transactions, reservations) {
    var rows = [];
    var _ = DateUtility.lodash();
    var transactionsWithReservations = _.map(transactions, function (item) {
        return _.merge(item, _.find(reservations, function (reservation) { return reservation.id == item.reference || reservation.bookingId == item.reference; }));
    });
    var summarizedData = _(transactionsWithReservations)
        .groupBy(function (value) { var _a; return (_a = value.source) !== null && _a !== void 0 ? _a : value.channelCode; })
        .map(function (value, key) {
        var _a, _b, _c;
        var totalWithoutVat = (_a = _.sumBy(value, 'amount.amount')) !== null && _a !== void 0 ? _a : 0;
        var totalWithoutVatPercentage = 93;
        var totalWithVat = (_b = (totalWithoutVat / totalWithoutVatPercentage * 100)) !== null && _b !== void 0 ? _b : 0;
        var totalWithVatPercentage = 5;
        var revenue = (_c = (totalWithVat / totalWithVatPercentage * 100)) !== null && _c !== void 0 ? _c : 0;
        return {
            channelCode: key,
            cityTaxWithoutVat: totalWithoutVat,
            cityTaxWithVat: totalWithVat,
            netAccommodationRevenue: revenue
        };
    })
        .value();
    for (var _i = 0, summarizedData_1 = summarizedData; _i < summarizedData_1.length; _i++) {
        var item = summarizedData_1[_i];
        rows.push([item.channelCode, item.cityTaxWithoutVat, item.cityTaxWithVat, item.netAccommodationRevenue]);
    }
    //set headers
    sheet.getRange(5, 1, 1, 4)
        .setValues([['Channel Source', 'City Tax excl. VAT', 'City Tax Incl. VAT', 'Net accommodation revenue']])
        .setFontWeight("bold");
    if (rows.length <= 0)
        return;
    var numberOfCols = rows[0].length;
    //set data
    sheet
        .getRange(6, 1, rows.length, numberOfCols)
        .setValues(rows);
    //format data
    sheet.getRange(6, 2, rows.length, numberOfCols - 1)
        .setNumberFormat("0.00");
}
function generateHamburgCityTax(sheet, transactions, reservations) {
    var rows = [];
    var _ = DateUtility.lodash();
    var transactionsWithReservations = _.map(transactions, function (item) {
        return _.merge(item, _.find(reservations, function (reservation) { return reservation.id == item.reference || reservation.bookingId == item.reference; }));
    });
    var summarizedData = _(transactionsWithReservations)
        .groupBy(function (value) { return value.amount.amount / value.adults; })
        .map(function (value, key) {
        var _a;
        var amount = Number(Utilities.formatString('%1.2f', Number(key)));
        var numberOfAdults = (_a = _.sumBy(value, 'adults')) !== null && _a !== void 0 ? _a : 0;
        if (amount < 0) {
            numberOfAdults = numberOfAdults * -1;
        }
        return {
            cityTaxAmount: amount,
            correctedNumberOfGuests: numberOfAdults
        };
    })
        .groupBy(function (item) { return Math.abs(item.cityTaxAmount); })
        .map(function (value, key) {
        var amount = Number(key);
        var label = getAmountLabel(amount);
        var numberOfAdults = _.sumBy(value, 'correctedNumberOfGuests');
        return {
            cityTaxAmount: amount,
            correctedNumberOfGuests: numberOfAdults,
            label: label
        };
    })
        .sortBy('cityTaxAmount')
        .value();
    for (var _i = 0, summarizedData_2 = summarizedData; _i < summarizedData_2.length; _i++) {
        var item = summarizedData_2[_i];
        rows.push([item.cityTaxAmount, item.correctedNumberOfGuests, item.label]);
    }
    //set headers
    sheet.getRange(5, 1, 1, 3)
        .setValues([['City Tax Amount', 'Corrected # of Guests', 'Label']])
        .setFontWeight("bold");
    if (rows.length <= 0) {
        return;
    }
    var numberOfCols = rows[0].length;
    //set data
    sheet
        .getRange(6, 1, rows.length, numberOfCols)
        .setValues(rows);
    //format data
    sheet.getRange(6, 1, rows.length, 1)
        .setNumberFormat("0.00");
}
function createSheetWithReportInfo(city, property, endDate, startDate) {
    var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var newSheetName = "citytax_".concat(city, "_").concat(property, "_").concat(endDate);
    var datasheet = activeSpreadsheet.getSheetByName(newSheetName);
    if (!datasheet) {
        datasheet = activeSpreadsheet.insertSheet().setName(newSheetName);
    }
    datasheet.clear();
    datasheet.clearFormats();
    activeSpreadsheet.setActiveSheet(datasheet);
    var firstCell = datasheet.getRange(1, 1);
    firstCell.setValue("City Tax Report").setFontSize(18);
    datasheet
        .getRange(2, 1)
        .setValue("for property ".concat(property, " from ").concat(startDate, " to ").concat(endDate));
    datasheet
        .getRange(3, 1)
        .setValue("Executed: " + FormatUtility.formattedExecutionTime());
    return datasheet;
}
function getTransactions(property, transactionStartDate, transactionEndDate, startDate, endDate) {
    var transactions = APIData.getAccountTransactions(property, 'CityTax_Reduced:7.00', transactionStartDate, transactionEndDate);
    var reportDaysList = DateUtility.getDates(startDate, endDate).map(function (d) { return d.toISOString().slice(0, 10); });
    return transactions.filter(function (transaction) { return transaction.command == "PostCharge" && reportDaysList.includes(transaction.date); });
}
function getAmountLabel(amount) {
    var _a, _b;
    var data = [{ "Tax": 0, "From": 0, "To": 10, "Label": "<10 Euro" }, { "Tax": 0.5, "From": 11, "To": 25, "Label": "<25 Euro" }, { "Tax": 1, "From": 26, "To": 50, "Label": "<50 Euro" }, { "Tax": 2, "From": 51, "To": 100, "Label": "<100 Euro" }, { "Tax": 3, "From": 101, "To": 150, "Label": "<150 Euro" }, { "Tax": 4, "From": 151, "To": 200, "Label": "<200 Euro" }, { "Tax": 5, "From": 201, "To": 250, "Label": "<250 Euro" }, { "Tax": 6, "From": 251, "To": 300, "Label": "<300 Euro" }, { "Tax": 7, "From": 301, "To": 350, "Label": "<350 Euro" }, { "Tax": 8, "From": 351, "To": 400, "Label": "<400 Euro" }, { "Tax": 9, "From": 401, "To": 450, "Label": "<450 Euro" }, { "Tax": 10, "From": 451, "To": 500, "Label": "<500 Euro" }, { "Tax": 11, "From": 501, "To": 550, "Label": "<550 Euro" }, { "Tax": 12, "From": 551, "To": 600, "Label": "<600 Euro" }, { "Tax": 13, "From": 601, "To": 650, "Label": "<650 Euro" }, { "Tax": 14, "From": 651, "To": 700, "Label": "<700 Euro" }, { "Tax": 15, "From": 701, "To": 750, "Label": "<750 Euro" }, { "Tax": 16, "From": 751, "To": 800, "Label": "<800 Euro" }, { "Tax": 17, "From": 801, "To": 850, "Label": "<850 Euro" }, { "Tax": 18, "From": 851, "To": 900, "Label": "<900 Euro" }, { "Tax": 19, "From": 901, "To": 950, "Label": "<950 Euro" }, { "Tax": 20, "From": 951, "To": 1000, "Label": "<1000 Euro" }, { "Tax": 21, "From": 1001, "To": 1050, "Label": "<1050 Euro" }, { "Tax": 22, "From": 1051, "To": 1100, "Label": "<1100 Euro" }, { "Tax": 23, "From": 1101, "To": 1150, "Label": "<1150 Euro" }, { "Tax": 24, "From": 1151, "To": 1200, "Label": "<1200 Euro" }, { "Tax": 25, "From": 1201, "To": 1250, "Label": "<1250 Euro" }];
    var label = (_b = (_a = data.find(function (item) { return amount == item.Tax; })) === null || _a === void 0 ? void 0 : _a.Label) !== null && _b !== void 0 ? _b : "";
    return label;
}
