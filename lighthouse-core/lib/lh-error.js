/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const i18n = require('./i18n/i18n.js');

/* eslint-disable max-len */
const UIStrings = {
  /** Error message explaining that the Lighthouse run was not able to collect screenshots through Chrome.*/
  didntCollectScreenshots: `Chrome didn't collect any screenshots during the page load. Please make sure there is content visible on the page, and then try re-running Lighthouse.`,
  /** Error message explaining that the network trace was not able to be recorded for the Lighthouse run. */
  badTraceRecording: 'Something went wrong with recording the trace over your page load. Please run Lighthouse again.',
  /** Error message explaining that the page loaded too slowly to perform a Lighthouse run.  */
  pageLoadTookTooLong: 'Your page took too long to load. Please follow the opportunities in the report to reduce your page load time, and then try re-running Lighthouse.',
  /** Error message explaining that Lighthouse could not load the requested URL and the steps that might be taken to fix the unreliability. */
  pageLoadFailed: 'Lighthouse was unable to reliably load the page you requested. Make sure you are testing the correct URL and that the server is properly responding to all requests.',
  /** Error message explaining that Lighthouse could not load the requested URL and the steps that might be taken to fix the unreliability. */
  pageLoadFailedWithStatusCode: 'Lighthouse was unable to reliably load the page you requested. Make sure you are testing the correct URL and that the server is properly responding to all requests.  Status Code: {substitute}',
  /** Error message explaining that Lighthouse could not load the requested URL and the steps that might be taken to fix the unreliability. */
  pageLoadFailedWithDetails: 'Lighthouse was unable to reliably load the page you requested. Make sure you are testing the correct URL and that the server is properly responding to all requests. Detailed Error: {substitute}',
  /** Error message explaining that the credentials included in the Lighthouse run were invalid, so the URL cannot be accessed. */
  pageLoadFailedInsecure: 'The URL you have provided does not have valid security credentials. {substitute}',
  /** Error message explaining that Chrome has encountered an error during the Lighthouse run, and that Chrome should be restarted. */
  internalChromeError: 'An internal Chrome error occurred. Please restart Chrome and try re-running Lighthouse.',
  /** Error message explaining that fetching the resources of the webpage has taken longer than the maximum time. */
  requestContentTimeout: 'Fetching resource content has exceeded the allotted time',
  /** Error message explaining that the provided URL Lighthouse points to is not valid, and cannot be loaded. */
  urlInvalid: 'The URL you have provided appears to be invalid.',
  /** Error message explaining that the Chrome Devtools protocol has exceeded the maximum timeout allowed. */
  protocolTimeout: 'Waiting for DevTools protocol response has exceeded the allotted time. Method: {substitute}',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

/**
 * @typedef LighthouseErrorDefinition
 * @property {string} code
 * @property {string} message
 * @property {string} [substitute]
 * @property {RegExp} [pattern]
 * @property {boolean} [lhrRuntimeError] True if it should appear in the top-level LHR.runtimeError property.
 */

class LighthouseError extends Error {
  /**
   * @param {LighthouseErrorDefinition} errorDefinition
   * @param {Record<string, string|boolean|undefined>=} properties
   */
  constructor(errorDefinition, properties) {
    super(errorDefinition.code);
    this.name = 'LHError';
    this.code = errorDefinition.code;
    this.friendlyMessage = (errorDefinition.substitute) ?
      str_(errorDefinition.message, {'substitute': errorDefinition.substitute}) :
      str_(errorDefinition.message);
    this.lhrRuntimeError = !!errorDefinition.lhrRuntimeError;
    if (properties) Object.assign(this, properties);

    Error.captureStackTrace(this, LighthouseError);
  }

  /**
   * @param {LighthouseError} err
   * @return {LighthouseError}
   */
  static fromLighthouseError(err) {
    const {code, friendlyMessage: message, ...rest} = err;
    // Note: {...rest} convinces tsc 3.1 that it's assignable to a Record.
    return new LighthouseError({code, message}, {...rest});
  }

  /**
   * @param {string} method
   * @param {{message: string, data?: string|undefined}} protocolError
   * @return {Error|LighthouseError}
   */
  static fromProtocolMessage(method, protocolError) {
    // extract all errors with a regex pattern to match against.
    const protocolErrors = Object.values(LighthouseError.errors).filter(e => e.pattern);
    // if we find one, use the friendly LighthouseError definition
    const matchedErrorDefinition = protocolErrors.find(e => e.pattern.test(protocolError.message));
    if (matchedErrorDefinition) {
      return new LighthouseError(matchedErrorDefinition, {
        protocolMethod: method,
        protocolError: protocolError.message,
      });
    }

    // otherwise fallback to building a generic Error
    let errMsg = '(${method}): ${protocolError.message}';
    if (protocolError.data) errMsg += ' (${protocolError.data})';
    const error = new Error(`Protocol error ${errMsg}`);
    return Object.assign(error, {protocolMethod: method, protocolError: protocolError.message});
  }
}

const ERRORS = {
  // Screenshot/speedline errors
  NO_SPEEDLINE_FRAMES: {
    code: 'NO_SPEEDLINE_FRAMES',
    message: UIStrings.didntCollectScreenshots,
    lhrRuntimeError: true,
  },
  SPEEDINDEX_OF_ZERO: {
    code: 'SPEEDINDEX_OF_ZERO',
    message: UIStrings.didntCollectScreenshots,
    lhrRuntimeError: true,
  },
  NO_SCREENSHOTS: {
    code: 'NO_SCREENSHOTS',
    message: UIStrings.didntCollectScreenshots,
    lhrRuntimeError: true,
  },
  INVALID_SPEEDLINE: {
    code: 'INVALID_SPEEDLINE',
    message: UIStrings.didntCollectScreenshots,
    lhrRuntimeError: true,
  },

  // Trace parsing errors
  NO_TRACING_STARTED: {
    code: 'NO_TRACING_STARTED',
    message: UIStrings.badTraceRecording,
    lhrRuntimeError: true,
  },
  NO_NAVSTART: {
    code: 'NO_NAVSTART',
    message: UIStrings.badTraceRecording,
    lhrRuntimeError: true,
  },
  NO_FCP: {
    code: 'NO_FCP',
    message: UIStrings.badTraceRecording,
    lhrRuntimeError: true,
  },
  NO_DCL: {
    code: 'NO_DCL',
    message: UIStrings.badTraceRecording,
    lhrRuntimeError: true,
  },
  NO_FMP: {
    code: 'NO_FMP',
    message: UIStrings.badTraceRecording,
  },

  // TTI calculation failures
  FMP_TOO_LATE_FOR_FCPUI: {code: 'FMP_TOO_LATE_FOR_FCPUI', message: UIStrings.pageLoadTookTooLong},
  NO_FCPUI_IDLE_PERIOD: {code: 'NO_FCPUI_IDLE_PERIOD', message: UIStrings.pageLoadTookTooLong},
  NO_TTI_CPU_IDLE_PERIOD: {code: 'NO_TTI_CPU_IDLE_PERIOD', message: UIStrings.pageLoadTookTooLong},
  NO_TTI_NETWORK_IDLE_PERIOD: {
    code: 'NO_TTI_NETWORK_IDLE_PERIOD',
    message: UIStrings.pageLoadTookTooLong,
  },

  // Page load failures
  NO_DOCUMENT_REQUEST: {
    code: 'NO_DOCUMENT_REQUEST',
    message: UIStrings.pageLoadFailed,
    lhrRuntimeError: true,
  },
  /* Used when DevTools reports loading failed. Usually an internal (Chrome) issue. */
  FAILED_DOCUMENT_REQUEST: {
    code: 'FAILED_DOCUMENT_REQUEST',
    message: UIStrings.pageLoadFailedWithDetails,
    lhrRuntimeError: true,
    substitute: 'No Failure Description Loaded.',
  },
  /* Used when status code is 4xx or 5xx. */
  ERRORED_DOCUMENT_REQUEST: {
    code: 'ERRORED_DOCUMENT_REQUEST',
    message: UIStrings.pageLoadFailedWithStatusCode,
    lhrRuntimeError: true,
    substitute: 'No Error Code Loaded.',
  },
  /* Used when security error prevents page load. */
  INSECURE_DOCUMENT_REQUEST: {
    code: 'INSECURE_DOCUMENT_REQUEST',
    message: UIStrings.pageLoadFailedInsecure,
    lhrRuntimeError: true,
    substitute: 'No Security Descriptions Loaded.',
  },

  // Protocol internal failures
  TRACING_ALREADY_STARTED: {
    code: 'TRACING_ALREADY_STARTED',
    message: UIStrings.internalChromeError,
    pattern: /Tracing.*started/,
    lhrRuntimeError: true,
  },
  PARSING_PROBLEM: {
    code: 'PARSING_PROBLEM',
    message: UIStrings.internalChromeError,
    pattern: /Parsing problem/,
    lhrRuntimeError: true,
  },
  READ_FAILED: {
    code: 'READ_FAILED',
    message: UIStrings.internalChromeError,
    pattern: /Read failed/,
    lhrRuntimeError: true,
  },

  // URL parsing failures
  INVALID_URL: {
    code: 'INVALID_URL',
    message: UIStrings.urlInvalid,
  },

  // Protocol timeout failures
  PROTOCOL_TIMEOUT: {
    code: 'PROTOCOL_TIMEOUT',
    message: UIStrings.protocolTimeout,
    lhrRuntimeError: true,
    substitute: 'No Method Loaded.',
  },

  // Hey! When adding a new error type, update lighthouse-result.proto too.
};

/** @type {Record<keyof typeof ERRORS, LighthouseErrorDefinition>} */
LighthouseError.errors = ERRORS;
LighthouseError.NO_ERROR = 'NO_ERROR';
LighthouseError.UNKNOWN_ERROR = 'UNKNOWN_ERROR';
module.exports = LighthouseError;
module.exports.UIStrings = UIStrings;