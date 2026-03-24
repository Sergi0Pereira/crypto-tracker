/**
 * Application Configuration
 * Centralized configuration and constants for the entire application
 * Follows DRY principle - single source of truth for all magic values
 */

export const CONFIG = {
  // API Endpoints
  API_ENDPOINT: '/api/symbols',
  BINANCE_API: 'https://api.binance.com/api/v3',
  BINANCE_WS: 'wss://stream.binance.com:9443/stream',
  
  // Chart Settings
  MAX_CHART_POINTS: 50,
  CHART_KLINES_LIMIT: 50,
  KLINE_INTERVAL: '1m',
  
  // UI Settings
  FLASH_DURATION: 800,
};

/**
 * CSS Class Names
 * Maintains consistency across the application
 */
export const CSS_CLASSES = {
  ROW_PREFIX: 'row-',
  PRICE_PREFIX: 'price-',
  SELECTED_BG: 'bg-[#2b3139]',
  FLASH_GREEN: 'flash-green',
  FLASH_RED: 'flash-red',
  TEXT_GREEN: 'text-green',
  TEXT_RED: 'text-red',
};

/**
 * DOM Element Selectors
 * Factory functions for safe DOM access
 * Prevents null reference errors throughout the app
 */
export const DOM_ELEMENTS = {
  marketList: () => document.getElementById('market-list'),
  activeSymbol: () => document.getElementById('active-symbol'),
  activePrice: () => document.getElementById('current-price'),
  activeChange: () => document.getElementById('price-change-24h'),
  chartContainer: () => document.getElementById('priceChart'),
};
