/**
 * Market Data Manager
 * Manages application state for market data
 * Implements Single Responsibility - only state management
 * Acts as a store for price and change data
 */

export class MarketDataManager {
  /**
   * Initialize market data store with symbols
   * Structure: { 'BTCUSDT': { price: 0, change: 0 }, ... }
   */
  constructor() {
    this.data = {};
  }

  /**
   * Initialize data structure for given symbols
   * @param {string[]} symbols - Array of symbol names
   */
  initialize(symbols) {
    symbols.forEach(sym => {
      this.data[sym] = { price: 0, change: 0 };
    });
  }

  /**
   * Update price and change for a specific symbol
   * @param {string} symbol - Trading pair symbol
   * @param {number} price - Current price
   * @param {number} change - 24h change percentage
   * @returns {boolean} Success status
   */
  update(symbol, price, change) {
    if (!(symbol in this.data)) {
      console.warn(`Symbol ${symbol} not found in market data`);
      return false;
    }
    this.data[symbol].price = price;
    this.data[symbol].change = change;
    return true;
  }

  /**
   * Retrieve market data for a symbol
   * @param {string} symbol - Trading pair symbol
   * @returns {Object|null} Market data { price, change } or null if not found
   */
  get(symbol) {
    return this.data[symbol] || null;
  }

  /**
   * Get all tracked symbols
   * @returns {string[]} Array of symbol names
   */
  getSymbols() {
    return Object.keys(this.data);
  }
}
