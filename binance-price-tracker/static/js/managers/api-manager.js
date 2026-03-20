/**
 * API Manager
 * Handles all HTTP requests to Binance API and local API
 * Implements Single Responsibility Principle - only API communication
 */

import { CONFIG } from '../config.js';

export class APIManager {
  /**
   * Fetch available trading symbols from local API
   * @returns {Promise<string[]>} Array of symbol names (e.g., ['BTCUSDT', 'ETHUSDT'])
   * @throws {Error} If API request fails
   */
  static async fetchSymbols() {
    const res = await fetch(CONFIG.API_ENDPOINT);
    if (!res.ok) {
      throw new Error(`Failed to fetch symbols: HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.symbols || [];
  }

  /**
   * Fetch historical kline data from Binance API
   * @param {string} symbol - Trading pair symbol (e.g., 'BTCUSDT')
   * @returns {Promise<Array>} Array of klines [time, open, high, low, close, volume, ...]
   * @throws {Error} If API request fails
   */
  static async fetchHistoricalData(symbol) {
    const url = `/api/klines?symbol=${symbol}&interval=${CONFIG.KLINE_INTERVAL}&limit=${CONFIG.CHART_KLINES_LIMIT}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch klines for ${symbol}: HTTP ${res.status}`);
    }
    return await res.json();
  }
}
