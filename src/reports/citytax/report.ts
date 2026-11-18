// Compiled using @apaleo/gsheet-addon 1.0.0 (TypeScript 4.9.5)
var exports = exports || {};
var module = module || { exports: exports };
("use strict");
exports.getCities = exports.generateCityTaxReport = void 0;
//import {BerlinCityTaxRowItemModel, CityTax, HamburgCityTaxRowItemModel} from "./interfaces";
//import {DateUtility, FormatUtility} from "shared";
//import {BookingModels, FinanceModels} from "api/schema";
//import {APIData} from "../../api/data";
function generateCityTaxReport(city, property, startDate, endDate) {
  var transactionStartDate = DateUtility.addDays(startDate, -1);
  var transactionEndDate = DateUtility.addDays(endDate, 1);
  var transactions = getTransactions(
    property,
    transactionStartDate,
    transactionEndDate,
    startDate,
    endDate,
  );
  var cityTaxConfigs = APIData.getCityTaxConfigurations(property);

  const revenueTransactions =
    city === CityTax.BERLIN
      ? getRevenueTransactions(property, startDate, endDate)
      : [];
  var reservations = APIData.getReservations(
    property,
    DateUtility.addDays(startDate, -1),
    DateUtility.addDays(endDate, 1),
  );
  var sheet = createSheetWithReportInfo(city, property, endDate, startDate);
  switch (city) {
    case CityTax.BERLIN:
      generateBerlinCityTax(
        sheet,
        transactions,
        reservations,
        revenueTransactions,
        cityTaxConfigs,
      );
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
function generateBerlinCityTax(
  sheet,
  transactions,
  reservations,
  revenueTransactions,
  cityTaxConfigs,
) {
  var rows = [];
  var _ = DateUtility.lodash();
  var transactionsWithReservations = _.map(transactions, function (item) {
    return _.merge(
      item,
      _.find(reservations, function (reservation) {
        return (
          reservation.id == item.reference ||
          reservation.bookingId == item.reference
        );
      }),
    );
  });
  const revenueByChannel = _(revenueTransactions)
    .map((item) => {
      const reservation = _.find(reservations, function (reservation) {
        return (
          reservation.id == item.reference ||
          reservation.bookingId == item.reference
        );
      });
      return _.merge(item, reservation);
    })
    .groupBy((value) => value.source ?? value.channelCode)
    .mapValues((transactions) => _.sumBy(transactions, "netAmount"))
    .value();

  var channelKeysFromCityTax = _(transactionsWithReservations)
    .map(function (v) {
      var _a;
      return (_a = v.source) !== null && _a !== void 0 ? _a : v.channelCode;
    })
    .filter(Boolean)
    .uniq()
    .value();
  var channelKeysFromRevenue = _.keys(revenueByChannel);
  var allChannelKeys = _.uniq(
    _.concat(channelKeysFromCityTax, channelKeysFromRevenue),
  );

  var summarizedData = _.map(allChannelKeys, function (key) {
    var value = _.filter(transactionsWithReservations, function (v) {
      var _a;
      return (
        ((_a = v.source) !== null && _a !== void 0 ? _a : v.channelCode) === key
      );
    });
    var totalWithoutVat = _.sumBy(value, "amount.amount") ?? 0;
    var vatPercent = 7;
    var totalWithVat = totalWithoutVat * (1 + vatPercent / 100) ?? 0;
    var revenue = revenueByChannel[key] ?? 0;
    return {
      channelCode: key,
      cityTaxWithoutVat: totalWithoutVat,
      cityTaxWithVat: totalWithVat,
      netAccommodationRevenue: revenue,
    };
  });
  for (
    var _i = 0, summarizedData_1 = summarizedData;
    _i < summarizedData_1.length;
    _i++
  ) {
    var item = summarizedData_1[_i];
    rows.push([
      item.channelCode,
      item.cityTaxWithoutVat,
      item.cityTaxWithVat,
      item.netAccommodationRevenue,
    ]);
  }
  //set headers
  sheet
    .getRange(5, 1, 1, 4)
    .setValues([
      [
        "Channel Source",
        "City Tax excl. VAT",
        "City Tax Incl. VAT",
        "Net accommodation revenue",
      ],
    ])
    .setFontWeight("bold");

  var vatLabels = { Reduced: "7%", Normal: "19%", Without: "0%", Null: "0%" };
  var includedRates = _.uniq(
    _.map(cityTaxConfigs, function (c) {
      var type = c.vatType || "Without";
      return vatLabels[type] || type;
    }),
  );

  var noteLines = [
    "Net accommodation revenue includes only room-revenue postings taxed at the same VAT rate(s) as this property's configured city tax: " +
      includedRates.join(", ") +
      ".",
    "Revenue posted at other VAT rates (e.g. VAT-exempt long stays, or non-accommodation charges like cleaning fees) is excluded",
    "and will not match totals in the revenue report.",
  ];
  if (rows.length <= 0) {
    var noteStartRow = 8; // header row 5, two empty rows (6,7), note starts at 8
    for (var n = 0; n < noteLines.length; n++) {
      sheet.getRange(noteStartRow + n, 1).setValue(noteLines[n]);
    }
    return;
  }

  var numberOfCols = rows[0].length;
  //set data
  sheet.getRange(6, 1, rows.length, numberOfCols).setValues(rows);
  //format data
  sheet.getRange(6, 2, rows.length, numberOfCols - 1).setNumberFormat("0.00");

  sheet.appendRow([" "]);
  sheet.appendRow([" "]);
  for (var n = 0; n < noteLines.length; n++) {
    sheet.appendRow([noteLines[n]]);
  }
}

function generateHamburgCityTax(sheet, transactions, reservations) {
  var rows = [];
  var _ = DateUtility.lodash();
  var transactionsWithReservations = _.map(transactions, function (item) {
    return _.merge(
      item,
      _.find(reservations, function (reservation) {
        return (
          reservation.id == item.reference ||
          reservation.bookingId == item.reference
        );
      }),
    );
  });
  var summarizedData = _(transactionsWithReservations)
    .map(function (value) {
      // CHANGED: guests = adults + children, and the bracket is found from the charge (see helper below)
      var guests =
        (value.adults || 0) +
        (value.childrenAges ? value.childrenAges.length : 0);
      var split = getHamburgBracketAndGuests(value.amount.amount, guests);
      return {
        cityTaxAmount: split.bracket,
        correctedNumberOfGuests:
          value.amount.amount < 0 ? split.guests * -1 : split.guests,
      };
    })
    .groupBy(function (item) {
      return Math.abs(item.cityTaxAmount);
    })
    .map(function (value, key) {
      var amount = Number(key);
      var label = getAmountLabel(amount);
      var numberOfAdults = _.sumBy(value, "correctedNumberOfGuests");
      return {
        cityTaxAmount: amount,
        correctedNumberOfGuests: numberOfAdults,
        label: label,
      };
    })
    .sortBy("cityTaxAmount")
    .value();
  for (
    var _i = 0, summarizedData_2 = summarizedData;
    _i < summarizedData_2.length;
    _i++
  ) {
    var item = summarizedData_2[_i];
    rows.push([item.cityTaxAmount, item.correctedNumberOfGuests, item.label]);
  }
  //set headers
  sheet
    .getRange(5, 1, 1, 3)
    .setValues([["City Tax Amount", "Corrected # of Guests", "Label"]])
    .setFontWeight("bold");
  if (rows.length <= 0) {
    return;
  }
  var numberOfCols = rows[0].length;
  //set data
  sheet.getRange(6, 1, rows.length, numberOfCols).setValues(rows);
  //format data
  sheet.getRange(6, 1, rows.length, 1).setNumberFormat("0.00");
}
function createSheetWithReportInfo(city, property, endDate, startDate) {
  var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var newSheetName = "citytax_"
    .concat(city, "_")
    .concat(property, "_")
    .concat(endDate);
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
    .setValue(
      "for property "
        .concat(property, " from ")
        .concat(startDate, " to ")
        .concat(endDate),
    );
  datasheet
    .getRange(3, 1)
    .setValue("Executed: " + FormatUtility.formattedExecutionTime());
  return datasheet;
}
function getTransactions(
  property,
  transactionStartDate,
  transactionEndDate,
  startDate,
  endDate,
) {
  // Get city tax configurations for this property
  var cityTaxConfigs = APIData.getCityTaxConfigurations(property);
  var allTransactions = [];
  // For each city tax configuration, get the corresponding transactions
  for (
    var _i = 0, cityTaxConfigs_1 = cityTaxConfigs;
    _i < cityTaxConfigs_1.length;
    _i++
  ) {
    var config = cityTaxConfigs_1[_i];
    // Determine VAT type and percentage
    var vatType = config.vatType || "Without";
    var percentage = 0;
    // Map VAT type to percentage
    switch (vatType) {
      case "Reduced":
        percentage = 7;
        break;
      case "Normal":
        percentage = 19;
        break;
      case "Without":
      case "Null":
      default:
        percentage = 0;
        break;
    }
    // Construct account number
    var accountNumber = "CityTax_"
      .concat(vatType, ":")
      .concat(percentage.toFixed(2));
    // Get transactions for this account
    var transactions = APIData.getAccountTransactions(
      property,
      accountNumber,
      transactionStartDate,
      transactionEndDate,
    );
    // Add to all transactions
    if (transactions && transactions.length > 0) {
      allTransactions = allTransactions.concat(transactions);
    }
  }
  var reportDaysList = DateUtility.getDates(startDate, endDate).map(function (
    d,
  ) {
    return d.toISOString().slice(0, 10);
  });
  Logger.log(reportDaysList);
  if (reportDaysList.indexOf(endDate) === -1) reportDaysList.push(endDate);

  return allTransactions.filter(function (transaction) {
    return (
      transaction.command == "PostCharge" &&
      reportDaysList.includes(transaction.date)
    );
  });
}

function getRevenueTransactions(property, startDate, endDate) {
  var cityTaxConfigs = APIData.getCityTaxConfigurations(property);
  var allTransactions = [];

  var transactions = APIData.getGrossTransactions(property, startDate, endDate);
  var reportDaysList = DateUtility.getDates(startDate, endDate).map(function (
    d,
  ) {
    return d.toISOString().slice(0, 10);
  });
  if (reportDaysList.indexOf(endDate) === -1) reportDaysList.push(endDate);

  for (var _i = 0; _i < cityTaxConfigs.length; _i++) {
    var config = cityTaxConfigs[_i];
    var vatType = config.vatType || "Without";
    var percentage = 0;
    switch (vatType) {
      case "Reduced":
        percentage = 7;
        break;
      case "Normal":
        percentage = 19;
        break;
      default:
        percentage = 0;
        break;
    }

    // Derive percentage from config but accept any VAT type name in the account number
    // (subledger writes "Null" while config returns "Without" for 0% VAT)
    var accountPattern = new RegExp(
      "^RevenueAccommodation_([A-Za-z0-9]+-)?[A-Za-z]+:" +
        percentage.toFixed(2) +
        "$",
    );

    var filtered = transactions.filter(function (t) {
      return (
        t.command === "PostCharge" &&
        reportDaysList.includes(t.date) &&
        accountPattern.test(t.creditedAccount.number)
      );
    });

    allTransactions = allTransactions.concat(filtered);
  }

  return allTransactions;
}

// NEW: Hamburg brackets are always 0, 1.20, 2.40, 3.60 ... (1.20 per started 50 EUR of net price per person).
// A charge = bracket x number of taxed persons. Try the most guests first; the first guest count
// where charge / guests is a valid bracket wins.
function getHamburgBracketAndGuests(charge, guests) {
  var amount = Math.abs(charge);
  var maxGuests = Math.max(guests, 1);
  for (var k = maxGuests; k >= 1; k--) {
    var steps = amount / k / 1.2;
    if (Math.abs(steps - Math.round(steps)) < 0.01) {
      return {
        bracket: Number((Math.round(steps) * 1.2).toFixed(2)),
        guests: k,
      };
    }
  }
  // no valid bracket found: keep the old behaviour so the row is visible, label says "Check manually"
  return {
    bracket: Number((amount / maxGuests).toFixed(2)),
    guests: maxGuests,
  };
}

function getAmountLabel(amount) {
  if (amount === 0) return "up to 10 Euro";
  var steps = amount / 1.2;
  if (Math.abs(steps - Math.round(steps)) > 0.01) return "Check manually";
  if (Math.round(steps) === 1) return "10 to 50 Euro";
  return "up to " + Math.round(steps) * 50 + " Euro";
}
