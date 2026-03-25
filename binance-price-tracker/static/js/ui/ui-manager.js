/**
 * UI Manager
 * Handles all user interface updates and interactions
 * Implements Single Responsibility - only UI manipulation
 * Decoupled from business logic via static methods
 */

import { CSS_CLASSES, DOM_ELEMENTS } from '../constants.js';
import { formatPrice, formatChange, getColorClass } from '../utils/formatters.js';

export class UIManager {
  /**
   * Create a market row element
   * @param {string} symbol - Trading pair symbol
   * @param {Function} onSelect - Callback when row is clicked
   * @returns {HTMLElement} Market row DOM element
   */
  static createMarketRow(symbol, onSelect) {
    const row = document.createElement('div');
    row.className = 'market-row';
    
    // SECURITY: Validate symbol string format
    const safeSymbol = symbol.replace(/[^a-zA-Z0-9]/g, '');
    row.id = `${CSS_CLASSES.ROW_PREFIX}${safeSymbol}`;
    row.onclick = () => onSelect(safeSymbol);
    
    // SECURITY: Use DOMPurify to sanitize HTML content if needed, 
    // or use textContent to avoid XSS entirely. Since we know structure, we build safely.
    const symbolDiv = document.createElement('div');
    symbolDiv.className = 'symbol-name';
    // Format "BTCUSDT" -> "BTC/USDT"
    const displaySymbol = safeSymbol.replace(/(USDT|BUSD|USDC)$/i, '/$1');
    symbolDiv.textContent = displaySymbol; // textContent prevents injection
    
    const priceDiv = document.createElement('div');
    priceDiv.className = 'price-display';
    priceDiv.id = `${CSS_CLASSES.PRICE_PREFIX}${safeSymbol}`;
    priceDiv.textContent = '0.00';
    
    row.appendChild(symbolDiv);
    row.appendChild(priceDiv);
    
    return row;
  }

  /**
   * Update market price display with optional flash animation
   * @param {string} symbol - Trading pair symbol
   * @param {number} price - New price
   * @param {boolean} priceChanged - Whether to show flash animation
   */
  static updateMarketPrice(symbol, price, priceChanged) {
    const safeSymbol = symbol.replace(/[^a-zA-Z0-9]/g, '');
    const priceEl = document.getElementById(`${CSS_CLASSES.PRICE_PREFIX}${safeSymbol}`);
    if (!priceEl) return;

    // Remove commas from formatPrice to safely parse float
    const oldPrice = parseFloat(priceEl.innerText.replace(/,/g, '')) || 0;
    
    // Performance: Avoid updating DOM if price string hasn't changed
    const newPriceStr = formatPrice(price);
    if (priceEl.innerText === newPriceStr) return;
    
    priceEl.innerText = newPriceStr;

    if (priceChanged && price !== oldPrice && oldPrice !== 0) {
      const rowEl = document.getElementById(`${CSS_CLASSES.ROW_PREFIX}${safeSymbol}`);
      const isPositive = price > oldPrice;
      const flashClass = isPositive ? CSS_CLASSES.FLASH_GREEN : CSS_CLASSES.FLASH_RED;
      const textFlashClass = isPositive ? 'price-up' : 'price-down';
      
      // Use requestAnimationFrame for smoother performance instead of synchronous layout reading
      requestAnimationFrame(() => {
        if (rowEl) rowEl.classList.remove(CSS_CLASSES.FLASH_GREEN, CSS_CLASSES.FLASH_RED);
        priceEl.classList.remove('price-up', 'price-down');
        
        requestAnimationFrame(() => {
          if (rowEl) rowEl.classList.add(flashClass);
          priceEl.classList.add(textFlashClass);
          
          setTimeout(() => {
            if (rowEl) rowEl.classList.remove(flashClass);
            priceEl.classList.remove(textFlashClass);
          }, 500); // 500ms flash
        });
      });
    }
  }

  /**
   * Highlight selected market row
   * @param {string} symbol - Symbol to select
   */
  static selectMarket(symbol) {
    // Deselect all
    document.querySelectorAll('[id^="row-"]').forEach(el => 
      el.classList.remove('active')
    );
    
    // Select new
    const safeSymbol = symbol.replace(/[^a-zA-Z0-9]/g, '');
    const selectedRow = document.getElementById(`${CSS_CLASSES.ROW_PREFIX}${safeSymbol}`);
    if (selectedRow) {
      selectedRow.classList.add('active');
    }
  }

  /**
   * Update header information (symbol, price, 24h change)
   * @param {string} symbol - Trading pair symbol
   * @param {number} price - Current price
   * @param {number} change - 24h change percentage
   */
  static updateHeader(symbol, price, change) {
    const safeSymbol = symbol.replace(/[^a-zA-Z0-9]/g, '');
    const displaySymbol = safeSymbol.replace(/(USDT|BUSD|USDC)$/i, '/$1');
    DOM_ELEMENTS.activeSymbol().textContent = displaySymbol;
    
    const priceEl = DOM_ELEMENTS.activePrice();
    const oldPrice = parseFloat(priceEl.innerText.replace(/,/g, '')) || 0;
    
    const newPriceStr = formatPrice(price);
    if (priceEl.innerText !== newPriceStr) {
      priceEl.innerText = newPriceStr;

      // Only apply color based on 24h change, but flash on tick
      if (price !== oldPrice && oldPrice !== 0) {
        const isPositive = price > oldPrice;
        const textFlashClass = isPositive ? 'price-up' : 'price-down';
        
        requestAnimationFrame(() => {
          priceEl.classList.remove('price-up', 'price-down');
          requestAnimationFrame(() => {
            priceEl.classList.add(textFlashClass);
            setTimeout(() => {
              priceEl.classList.remove(textFlashClass);
            }, 500);
          });
        });
      }
    }
    
    // Fallback static color for header price (usually neutral until flashed)
    // Removed getColorClass(price, 0) because price is always > 0, making it perpetually green.
    
    const changeEl = DOM_ELEMENTS.activeChange();
    changeEl.innerText = formatChange(change);
    changeEl.className = 'info-value ' + getColorClass(change, 0);
  }

  /**
   * Render market list from array of symbols
   * @param {string[]} symbols - Array of symbols
   * @param {Function} onSelectSymbol - Callback for symbol selection
   */
  static renderMarketList(symbols, onSelectSymbol) {
    const marketList = DOM_ELEMENTS.marketList();
    marketList.innerHTML = '';
    
    if (symbols.length === 0) {
      marketList.innerHTML = '<div class="no-results">No results found</div>';
      return;
    }

    symbols.forEach(sym => {
      const row = this.createMarketRow(sym, onSelectSymbol);
      marketList.appendChild(row);
    });
  }

  /**
   * Display error message in market list
   * @param {string} message - Error message
   */
  static showError(message) {
    const marketList = DOM_ELEMENTS.marketList();
    
    // SECURITY: Use DOMPurify if available, otherwise fallback to safe text rendering
    if (window.DOMPurify) {
      marketList.innerHTML = window.DOMPurify.sanitize(`<div class="error-message">Error: ${message}</div>`);
    } else {
      marketList.innerHTML = '<div class="error-message"></div>';
      marketList.querySelector('.error-message').textContent = `Error: ${message}`;
    }
  }

  /**
   * Update the connection status indicator
   * @param {string} status - 'connecting', 'connected', 'receiving', 'error', 'disconnected'
   */
  static updateConnectionStatus(status) {
    const dot = document.querySelector('.status-dot');
    const text = document.querySelector('.status-text');
    if (!dot || !text) return;

    switch (status) {
      case 'connecting':
        dot.className = 'status-dot';
        dot.style.backgroundColor = '';
        text.innerText = 'Connecting...';
        break;
      case 'connected':
        dot.className = 'status-dot live';
        dot.style.backgroundColor = '';
        text.innerText = 'Live';
        break;
      case 'error':
        dot.className = 'status-dot';
        dot.style.backgroundColor = 'var(--color-danger)';
        text.innerText = 'Error';
        break;
      case 'disconnected':
        dot.className = 'status-dot';
        dot.style.backgroundColor = 'var(--color-danger)';
        text.innerText = 'Disconnected';
        break;
    }
  }
}
