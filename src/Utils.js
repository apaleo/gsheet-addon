function getResponseBody(response) {
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
      return JSON.parse(content);
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

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function round(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function alert(msg) {
  Browser.msgBox(msg, Browser.Buttons.OK);
}

class Clock {
  constructor() {
    this.set();
  }

  set() {
    this.start = Date.now();
  }

  check() {
    const now = Date.now();
    const diff = now - this.start;

    this.start = now;

    return format(diff);
  }
}

function format(timeInMs) {
  if (timeInMs < 100) {
    return `${timeInMs}ms`;
  } else if (timeInMs < 1000 * 60) {
    return `${round(timeInMs / 1000)}s`;
  } else {
    const mins = Math.floor(timeInMs / 1000 / 60);
    const diff = timeInMs - mins * 1000 * 60;

    return diff > 0 ? `${mins}m ${format(diff)}` : `${mins}m`;
  }
}
