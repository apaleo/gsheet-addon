export function toQueryParams<T extends {}>(params: T) {
  (Object.keys(params) as (keyof T)[])
      .map(key => {
          const value = `${toQueryParamValue(params[key])}`;

          return `${key}=${encodeURIComponent(value)}`;
      })
      .join('&');
  }

function toQueryParamValue<T>(value: T) {
  if (value === null || value === undefined) {
      return '';
  }

  if (typeof value === "string") {
      return value;
  }

  if (Array.isArray(value)) {
      return value.join(",");
  }

  return value;
}

export function getResponseBody<T = any>(
  response: GoogleAppsScript.URL_Fetch.HTTPResponse
): T | undefined {
  const code = response.getResponseCode();

  // No content
  if (code == 204) {
    return undefined;
  } else if (code == 403) {
    throw new Error("Access denied");
  }

  try {
    const content = response.getContentText();

    // OK
    if (code == 200) {
      return JSON.parse(content) as T;
    }

    // It's an error
    const error = JSON.parse(content);

    if (error.messages) {
      throw new Error(error.messages.join(". "));
    }
    if (error.message || error.title) {
      throw new Error(error.message || error.title);
    }

    throw new Error(error);
  } catch (e) {
    Logger.log(e);
    Logger.log("Response code: " + code);

    throw e;
  }
}
