/**
 * Integration Module Entry Point
 *
 * Exports the main integration components and provides a factory
 * function for creating configured integration instances.
 */

const ApiClient = require('./apiClient');
const TradeEntryIntegration = require('./tradeEntryIntegration');

/**
 * Create a configured trade entry integration instance
 * @param {Object} config - Configuration options
 * @param {string} config.apiBaseURL - Base URL for the backend API
 * @param {number} config.timeout - Request timeout in milliseconds
 * @param {string} config.authToken - Optional authentication token
 * @returns {TradeEntryIntegration} Configured integration instance
 */
function createTradeEntryIntegration(config = {}) {
  const apiClient = new ApiClient({
    baseURL: config.apiBaseURL,
    timeout: config.timeout
  });

  if (config.authToken) {
    apiClient.setAuthToken(config.authToken);
  }

  return new TradeEntryIntegration(apiClient);
}

module.exports = {
  ApiClient,
  TradeEntryIntegration,
  createTradeEntryIntegration
};
