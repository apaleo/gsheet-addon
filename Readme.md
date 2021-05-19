# apaleo Google Sheet Add-on

A Google Sheet Add-on that creates custom reports using [apaleo API](https://api.apaleo.com/swagger/index.html).

## Reports

- Open Receivables & Liabilities Report. Area of application: Accounting. This report shows reservations with the non-zero balance on the receivables or liabilities account. This report is build on top of the list of gross transactions for all reservations in the selected property (hotel) which period of stay lies between the specified arrival (start) and departure (end) date.

![Open Receivables & Liabilities Report](./images/OpenRnLReport.png)

## Authorization

This add-on implements [OAuth 2.0 Authorization code grant flow](https://apaleo.dev/guides/start/oauth-connection/auth-code-grant) with the help of [Google OAuth2 library for Apps Script](https://github.com/googleworkspace/apps-script-oauth2) to retrieve authorization tokens to access apaleo API.

After authorization is complete the add-on asks the apaleo [apaleo Identity Server API](https://identity.apaleo.com/swagger/index.html) for the current user's profile to determine which properties the user has access to. That's why the `identity:account-users.read` scope is required.

## Requesting data

All functions to retrieve data from apaleo API are defined in the `./src/ApaleoAPI.js` file. To create a new one use `getClient` and `getResponseBody` functions that take care about all auth and response handling details for you, for example:

```js
/**
 * Retrieves Reservation by Id.
 */
function getReservationById(id) {
   const url = `${apaleoApiUrl}/booking/v1/reservations/${id}`;

   const client = getClient();

   return getResponseBody(client.fetch(url, defaultOptions));
}
```

## User interface

UI is very simple and is built using the latest version of [Vue.js](https://vuejs.org/) framework and [Vue Material](https://vuematerial.io/) components from CDN. Which means that you don't need to pre-compile anything to see changes.

This add-on also uses the [intercom.js library](https://github.com/diy/intercom.js/)
to communicate between tabs / windows. Specifically, the callback page sends a
message to the sidebar letting it know when the authorization flow has
completed, so it can start updating its contents.

# How to contribute?

We plan to gradually expand this add-on with new reports based on the customer's needs.  But nothing can stop you from forking this repo and adding your own report.

## Setup

1. Fork the project
2. `yarn`
3. ``

We assume that you know how to develop fron-end applications and you have `yarn` installed.

## How can I create my own report?

The simplest way to extend the functionality











