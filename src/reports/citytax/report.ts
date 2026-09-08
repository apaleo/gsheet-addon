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
    .groupBy(function (value) {
      return value.amount.amount / value.adults;
    })
    .map(function (value, key) {
      var _a;
      var amount = Number(Utilities.formatString("%1.2f", Number(key)));
      var numberOfAdults =
        (_a = _.sumBy(value, "adults")) !== null && _a !== void 0 ? _a : 0;
      if (amount < 0) {
        numberOfAdults = numberOfAdults * -1;
      }
      return {
        cityTaxAmount: amount,
        correctedNumberOfGuests: numberOfAdults,
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

function getAmountLabel(amount) {
  var _a, _b;
  var data = [
    { Tax: 0, From: 0, To: 10, Label: "<10 Euro" },
    { Tax: 0.5, From: 11, To: 25, Label: "<25 Euro" },
    { Tax: 1, From: 26, To: 50, Label: "<50 Euro" },
    { Tax: 2, From: 51, To: 100, Label: "<100 Euro" },
    { Tax: 3, From: 101, To: 150, Label: "<150 Euro" },
    { Tax: 4, From: 151, To: 200, Label: "<200 Euro" },
    { Tax: 5, From: 201, To: 250, Label: "<250 Euro" },
    { Tax: 6, From: 251, To: 300, Label: "<300 Euro" },
    { Tax: 7, From: 301, To: 350, Label: "<350 Euro" },
    { Tax: 8, From: 351, To: 400, Label: "<400 Euro" },
    { Tax: 9, From: 401, To: 450, Label: "<450 Euro" },
    { Tax: 10, From: 451, To: 500, Label: "<500 Euro" },
    { Tax: 11, From: 501, To: 550, Label: "<550 Euro" },
    { Tax: 12, From: 551, To: 600, Label: "<600 Euro" },
    { Tax: 13, From: 601, To: 650, Label: "<650 Euro" },
    { Tax: 14, From: 651, To: 700, Label: "<700 Euro" },
    { Tax: 15, From: 701, To: 750, Label: "<750 Euro" },
    { Tax: 16, From: 751, To: 800, Label: "<800 Euro" },
    { Tax: 17, From: 801, To: 850, Label: "<850 Euro" },
    { Tax: 18, From: 851, To: 900, Label: "<900 Euro" },
    { Tax: 19, From: 901, To: 950, Label: "<950 Euro" },
    { Tax: 20, From: 951, To: 1000, Label: "<1000 Euro" },
    { Tax: 21, From: 1001, To: 1050, Label: "<1050 Euro" },
    { Tax: 22, From: 1051, To: 1100, Label: "<1100 Euro" },
    { Tax: 23, From: 1101, To: 1150, Label: "<1150 Euro" },
    { Tax: 24, From: 1151, To: 1200, Label: "<1200 Euro" },
    { Tax: 25, From: 1201, To: 1250, Label: "<1250 Euro" },
  ];
  var label =
    (_b =
      (_a = data.find(function (item) {
        return amount == item.Tax;
      })) === null || _a === void 0
        ? void 0
        : _a.Label) !== null && _b !== void 0
      ? _b
      : "";
  return label;
}
