import {BerlinCityTaxRowItemModel, CityTax} from "./interfaces";
import {addDays, alert, formattedExecutionTime, getDates, lodash} from "shared";
import {getAccountTransactions, getReservations} from "api/data";
import {BookingModels, FinanceModels} from "api/schema";


export function generateCityTaxReport(city: string, property: string, startDate: string, endDate: string) {
    const cityTax = CityTax[city as keyof typeof CityTax];
    if (cityTax == CityTax.HAMBURG) {
        alert('Hamburg city tax report will be implemented soon!')
        return;
    }
    const transactionStartDate = addDays(startDate, -7);
    const transactionEndDate = addDays(endDate, 7);
    const transactions = getTransactions(property, transactionStartDate, transactionEndDate, startDate, endDate);
    const reservations = getReservations(property, transactionStartDate, transactionEndDate);

    const sheet = createSheetWithReportInfo(city, property, endDate, startDate);

    switch (cityTax) {
        case CityTax.BERLIN:
            generateBerlinCityTax(sheet, transactions, reservations);
            break;
    }
}

export function getCities() {
    return Object.keys(CityTax).filter((item) => {
        return isNaN(Number(item));
    })
}

function generateBerlinCityTax(sheet: GoogleAppsScript.Spreadsheet.Sheet, transactions: FinanceModels["AccountingTransactionModel"][], reservations: BookingModels["ReservationItemModel"][]) {
    let rows: any[][] = [];

    const _ = lodash();

    const transactionsWithReservations = _.map(transactions, function (item) {
        return _.merge(item, _.find(reservations, {'id': item.reference}));
    });
    const summarizedData = _(transactionsWithReservations)
        .groupBy(value => value.source ?? value.channelCode)
        .map((value, key) => {
            const totalWithoutVat = _.sumBy(value, 'amount.amount') ?? 0;
            const totalWithVat = (totalWithoutVat / 93 * 100) ?? 0;
            const revenue = (totalWithVat / 5 * 100) ?? 0;
            return {
                channelCode: key,
                cityTaxWithoutVat: totalWithoutVat,
                cityTaxWithVat: totalWithVat,
                netAccommodationRevenue: revenue
            } as BerlinCityTaxRowItemModel;
        })
        .value();

    for (const item of summarizedData) {
        rows.push([item.channelCode, item.cityTaxWithoutVat, item.cityTaxWithVat, item.netAccommodationRevenue]);
    }

    //set headers
    sheet.getRange(5, 1, 1, 4)
        .setValues([['Channel Source', 'City Tax excl. VAT', 'City Tax Incl. VAT', 'Net accommodation revenue']])
        .setFontWeight("bold");
    if (rows.length <= 0) return;
    const numberOfCols = rows[0].length;

    //set data
    sheet
        .getRange(6, 1, rows.length, numberOfCols)
        .setValues(rows)

    //format data
    sheet.getRange(6, 2, rows.length, numberOfCols - 1)
        .setNumberFormat("0.00");
}

function createSheetWithReportInfo(city: string, property: string, endDate: string, startDate: string) {
    const activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const newSheetName = `citytax_${city}_${property}_${endDate}`;
    let datasheet = activeSpreadsheet.getSheetByName(newSheetName);
    if (!datasheet) datasheet = activeSpreadsheet.insertSheet().setName(newSheetName);
    datasheet.clear();
    datasheet.clearFormats();
    activeSpreadsheet.setActiveSheet(datasheet);

    const firstCell = datasheet.getRange(1, 1);
    firstCell.setValue("City Tax Report").setFontSize(18);
    datasheet
        .getRange(2, 1)
        .setValue(`for property ${property} from ${startDate} to ${endDate}`);
    datasheet
        .getRange(3, 1)
        .setValue("Executed: " + formattedExecutionTime());

    return datasheet;
}

function getTransactions(property: string, transactionStartDate: Date, transactionEndDate: Date, startDate: string, endDate: string) {
    let transactions = getAccountTransactions(property, 'CityTax_Reduced:7.00', transactionStartDate, transactionEndDate);
    const reportDaysList = getDates(startDate, endDate).map(d => d.toISOString().slice(0, 10));
    return transactions.filter(transaction => transaction.command == "PostCharge" && reportDaysList.includes(transaction.date));
}