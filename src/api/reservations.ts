import { getClient } from "./auth";
import { Booking } from "./schema";
import { getResponseBody, toQueryParams } from "./utils";

const apaleoApiUrl = "https://api.apaleo.com";

const defaultOptions: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
  method: "get",
  muteHttpExceptions: true,
};

export function getReservations(
  filter?: Booking.operations["BookingReservationsGet"]["parameters"]["query"]
) {
  const endpointUrl = apaleoApiUrl + "/booking/v1/reservations";

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    ...defaultOptions,
    method: "get",
  };

  const queryParams = filter && toQueryParams(filter);

  const client = getClient();
  const url = endpointUrl + (queryParams ? `?${queryParams}` : "");

  return getResponseBody<Booking.definitions["ReservationListModel"]>(
    client.fetch(url, options)
  );
}

export function getReservationsCount(
  filter?: Booking.operations["BookingReservations$countGet"]["parameters"]["query"]
) {
  const endpointUrl = apaleoApiUrl + "/booking/v1/reservations/$count";

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    ...defaultOptions,
    method: "get",
  };

  const queryParams = filter && toQueryParams(filter);

  const client = getClient();
  const url = endpointUrl + (queryParams ? `?${queryParams}` : "");

  const body = getResponseBody<Booking.definitions["CountModel"]>(
    client.fetch(url, options)
  );

  return body?.count;
}
