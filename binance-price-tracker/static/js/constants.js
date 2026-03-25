/**
 * Application Constants
 * Single source of truth for magic strings, configuration, and DOM selectors.
 */

export const INTERVALS = {
  ONE_MINUTE: '1m',
  FIVE_MINUTES: '5m',
  FIFTEEN_MINUTES: '15m',
  ONE_HOUR: '1h',
  FOUR_HOURS: '4h',
  ONE_DAY: '1d',
  ONE_WEEK: '1w',
};

export const TIME_RANGES = {
  ONE_DAY: '24h',
  ONE_WEEK: '1w',
  ONE_MONTH: '1m',
  THREE_MONTHS: '3m',
  ONE_YEAR: '1y',
  ALL: 'all',
};

export const WS_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
  DISCONNECTED: 'disconnected',
};

export const CSS_CLASSES = {
  ROW_PREFIX: 'row-',
  PRICE_PREFIX: 'price-',
  ACTIVE: 'active',
  DISABLED_BTN: 'disabled-btn',
  FLASH_GREEN: 'flash-green',
  FLASH_RED: 'flash-red',
  PRICE_UP: 'price-up',
  PRICE_DOWN: 'price-down',
  TEXT_GREEN: 'text-green',
  TEXT_RED: 'text-red',
  STATUS_DOT: 'status-dot',
  STATUS_LIVE: 'live',
  ERROR_MSG: 'error-message',
};

export const EVENT_TYPES = {
  CLICK: 'click',
  INPUT: 'input',
  RESIZE: 'resize',
  MOUSEDOWN: 'mousedown',
  MOUSEMOVE: 'mousemove',
  MOUSEUP: 'mouseup',
  DBLCLICK: 'dblclick',
};

export const API_ENDPOINTS = {
  SYMBOLS: '/api/symbols',
  KLINES: '/api/klines',
};

export const DOM_ELEMENTS = {
  marketList: () => document.getElementById('market-list'),
  activeSymbol: () => document.getElementById('active-symbol'),
  activePrice: () => document.getElementById('current-price'),
  activeChange: () => document.getElementById('price-change-24h'),
  chartContainer: () => document.getElementById('chart'),
  searchInput: () => document.getElementById('symbol-search'),
  clearSearchBtn: () => document.getElementById('clear-search'),
  volumeToggleBtn: () => document.getElementById('volume-toggle-btn'),
  intervalBtns: () => document.querySelectorAll('.interval-btn'),
  rangeBtns: () => document.querySelectorAll('.range-btn'),
  statusDot: () => document.querySelector('.status-dot'),
  statusText: () => document.querySelector('.status-text'),
};
