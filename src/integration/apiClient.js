/**
 * API Client Configuration
 *
 * Configures the HTTP client for communicating with the backend API.
 * Handles authentication, request/response interceptors, and error handling.
 */

class ApiClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || process.env.API_BASE_URL || 'http://localhost:3001';
    this.timeout = config.timeout || 10000;
    this.authToken = null;
  }

  /**
   * Set authentication token
   * @param {string} token - JWT or API token
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Build headers for API requests
   * @returns {Object} Headers object
   */
  buildHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Make HTTP GET request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>} Response data
   */
  async get(endpoint) {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: this.buildHeaders(),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      data: await response.json(),
      status: response.status
    };
  }

  /**
   * Make HTTP POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request payload
   * @returns {Promise<Object>} Response data
   */
  async post(endpoint, data) {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.response = {
        status: response.status,
        data: await response.json().catch(() => null)
      };
      throw error;
    }

    return {
      data: await response.json(),
      status: response.status
    };
  }

  /**
   * Make HTTP PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request payload
   * @returns {Promise<Object>} Response data
   */
  async put(endpoint, data) {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: this.buildHeaders(),
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      data: await response.json(),
      status: response.status
    };
  }

  /**
   * Make HTTP DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>} Response data
   */
  async delete(endpoint) {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.buildHeaders(),
      signal: AbortSignal.timeout(this.timeout)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return {
      data: await response.json().catch(() => null),
      status: response.status
    };
  }
}

module.exports = ApiClient;
