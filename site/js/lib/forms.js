// What every form on the site shares: the e-mail check and the way it posts to its Google Apps Script.

// something@domain.tld, and nothing that could start a spreadsheet formula (=, +, -).
const EMAIL = /^[^\s@=+\-][^\s@]*@[^\s@]+\.[^\s@]{2,}$/;

export const isEmail = (value) => value.length <= 254 && EMAIL.test(value);

// Apps Script answers cross-origin with an opaque response, so the page can only know the request left, not that
// a row was written. 20 seconds without an answer counts as a failure.
export const sendToAppsScript = (endpoint, body) =>
  fetch(endpoint, { method: 'POST', mode: 'no-cors', body, signal: AbortSignal.timeout(20000) });
