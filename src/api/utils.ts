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
    if (error.message) {
      throw new Error(error.message);
    }

    throw new Error(error);
  } catch (e) {
    Logger.log(e);
    Logger.log("Response code: " + code);

    throw e;
  }
}
