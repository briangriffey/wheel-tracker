/**
 * Trade Entry Integration Layer
 *
 * This module connects the Trade Entry Frontend Form with the Trade Entry API Backend.
 * It provides a unified interface for submitting trades and handles the communication
 * between frontend and backend components.
 */

class TradeEntryIntegration {
  constructor(apiClient) {
    this.apiClient = apiClient;
    this.baseEndpoint = '/api/trades';
  }

  /**
   * Submit a trade entry from the frontend form to the backend API
   * @param {Object} tradeData - Trade data from the frontend form
   * @param {string} tradeData.symbol - Trading symbol/ticker
   * @param {string} tradeData.type - Trade type (e.g., 'BUY', 'SELL')
   * @param {number} tradeData.quantity - Number of units
   * @param {number} tradeData.price - Price per unit
   * @param {string} tradeData.timestamp - Trade timestamp
   * @returns {Promise<Object>} Response from the backend API
   */
  async submitTrade(tradeData) {
    try {
      // Validate trade data
      this.validateTradeData(tradeData);

      // Transform frontend data format to backend API format if needed
      const apiPayload = this.transformToApiFormat(tradeData);

      // Send to backend API
      const response = await this.apiClient.post(this.baseEndpoint, apiPayload);

      return {
        success: true,
        data: response.data,
        tradeId: response.data.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Validate trade data before submission
   * @param {Object} tradeData - Trade data to validate
   * @throws {Error} If validation fails
   */
  validateTradeData(tradeData) {
    const required = ['symbol', 'type', 'quantity', 'price'];
    const missing = required.filter(field => !tradeData[field]);

    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }

    if (tradeData.quantity <= 0) {
      throw new Error('Quantity must be positive');
    }

    if (tradeData.price < 0) {
      throw new Error('Price cannot be negative');
    }

    const validTypes = ['BUY', 'SELL'];
    if (!validTypes.includes(tradeData.type)) {
      throw new Error(`Invalid trade type. Must be one of: ${validTypes.join(', ')}`);
    }
  }

  /**
   * Transform frontend format to backend API format
   * @param {Object} frontendData - Data from frontend form
   * @returns {Object} Data formatted for backend API
   */
  transformToApiFormat(frontendData) {
    return {
      symbol: frontendData.symbol.toUpperCase(),
      type: frontendData.type,
      quantity: Number(frontendData.quantity),
      price: Number(frontendData.price),
      timestamp: frontendData.timestamp || new Date().toISOString(),
      metadata: {
        source: 'trade-entry-form',
        version: '1.0'
      }
    };
  }

  /**
   * Fetch trade history from backend
   * @param {Object} filters - Optional filters (symbol, dateRange, etc.)
   * @returns {Promise<Object>} Trade history data
   */
  async getTradeHistory(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const endpoint = queryParams
        ? `${this.baseEndpoint}?${queryParams}`
        : this.baseEndpoint;

      const response = await this.apiClient.get(endpoint);

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = TradeEntryIntegration;
