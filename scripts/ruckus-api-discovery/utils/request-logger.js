/**
 * Request/Response Logger for Ruckus API Discovery
 *
 * Logs all HTTP requests and responses to help understand the API
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

// Create log directory if it doesn't exist
if (!fs.existsSync(config.logging.logDir)) {
  fs.mkdirSync(config.logging.logDir, { recursive: true });
}

// Log file path with timestamp
const logFilePath = path.join(
  config.logging.logDir,
  `ruckus-api-requests-${new Date().toISOString().split('T')[0]}.log`
);

/**
 * Write to log file
 */
function writeLog(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;

  // Write to file
  fs.appendFileSync(logFilePath, logMessage);

  // Also log to console
  console.log(logMessage.trim());
}

/**
 * Format headers for logging (hide sensitive data)
 */
function formatHeaders(headers) {
  const safeHeaders = { ...headers };

  // Hide sensitive headers
  if (safeHeaders['Authorization']) {
    safeHeaders['Authorization'] = '[REDACTED]';
  }
  if (safeHeaders['Cookie']) {
    safeHeaders['Cookie'] = '[COOKIES PRESENT]';
  }
  if (safeHeaders['cookie']) {
    safeHeaders['cookie'] = '[COOKIES PRESENT]';
  }

  return JSON.stringify(safeHeaders, null, 2);
}

/**
 * Format request body for logging (hide passwords)
 */
function formatBody(body) {
  if (!body) return 'No body';

  let safeBody = body;

  // If it's an object, clone and redact
  if (typeof body === 'object') {
    safeBody = { ...body };
    if (safeBody.password) safeBody.password = '[REDACTED]';
    if (safeBody.xPassword) safeBody.xPassword = '[REDACTED]';
  }

  // If it's a string, try to parse and redact
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      if (parsed.password) parsed.password = '[REDACTED]';
      if (parsed.xPassword) parsed.xPassword = '[REDACTED]';
      safeBody = JSON.stringify(parsed, null, 2);
    } catch (e) {
      // Not JSON, check for password in string
      if (body.includes('password')) {
        safeBody = '[BODY WITH PASSWORD - REDACTED]';
      } else {
        safeBody = body;
      }
    }
  }

  return typeof safeBody === 'string' ? safeBody : JSON.stringify(safeBody, null, 2);
}

/**
 * Log HTTP request
 */
function logRequest(requestConfig) {
  const separator = '='.repeat(80);

  writeLog(separator);
  writeLog('🔵 HTTP REQUEST');
  writeLog(separator);
  writeLog(`Method: ${requestConfig.method.toUpperCase()}`);
  writeLog(`URL: ${requestConfig.baseURL || ''}${requestConfig.url || ''}`);

  if (config.logging.logHeaders && requestConfig.headers) {
    writeLog(`Headers: ${formatHeaders(requestConfig.headers)}`);
  }

  if (config.logging.logBody && requestConfig.data) {
    writeLog(`Body: ${formatBody(requestConfig.data)}`);
  }

  writeLog('');
}

/**
 * Log HTTP response
 */
function logResponse(response) {
  const separator = '='.repeat(80);

  writeLog(separator);
  writeLog('🟢 HTTP RESPONSE');
  writeLog(separator);
  writeLog(`Status: ${response.status} ${response.statusText}`);
  writeLog(`URL: ${response.config.url}`);

  if (config.logging.logHeaders && response.headers) {
    writeLog(`Headers: ${formatHeaders(response.headers)}`);
  }

  if (config.logging.logBody && response.data) {
    const dataStr = typeof response.data === 'string'
      ? response.data.substring(0, 500) // Limit long responses
      : JSON.stringify(response.data, null, 2).substring(0, 500);

    writeLog(`Body: ${dataStr}${dataStr.length >= 500 ? '... [TRUNCATED]' : ''}`);
  }

  writeLog('');
}

/**
 * Log error
 */
function logError(context, error) {
  const separator = '='.repeat(80);

  writeLog(separator);
  writeLog(`🔴 ERROR: ${context}`);
  writeLog(separator);

  if (error.response) {
    // Server responded with error status
    writeLog(`Status: ${error.response.status} ${error.response.statusText}`);
    writeLog(`URL: ${error.response.config.url}`);
    writeLog(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
  } else if (error.request) {
    // Request made but no response
    writeLog(`No response received`);
    writeLog(`Request: ${JSON.stringify(error.request, null, 2).substring(0, 300)}`);
  } else {
    // Error setting up request
    writeLog(`Error: ${error.message}`);
  }

  writeLog(`Stack: ${error.stack}`);
  writeLog('');
}

/**
 * Log custom message
 */
function log(message) {
  writeLog(`ℹ️  ${message}`);
}

/**
 * Log API discovery milestone
 */
function logDiscovery(endpoint, method, description) {
  const separator = '-'.repeat(80);

  writeLog(separator);
  writeLog(`🔍 API DISCOVERY`);
  writeLog(`Endpoint: ${method} ${endpoint}`);
  writeLog(`Description: ${description}`);
  writeLog(separator);
  writeLog('');
}

module.exports = {
  logRequest,
  logResponse,
  logError,
  log,
  logDiscovery
};
