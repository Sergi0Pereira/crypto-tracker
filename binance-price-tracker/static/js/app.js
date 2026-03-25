/**
 * Crypto Tracker Application
 * Main orchestrator that coordinates all components
 * Implements Dependency Inversion - depends on abstractions, not concrete implementations
 */

import { APIManager } from './managers/api-manager.js';
import { ChartManager } from './managers/chart-manager.js';
import { WebSocketManager } from './managers/websocket-manager.js';
import { MarketDataManager } from './managers/market-data-manager.js';
import { UIManager } from './ui/ui-manager.js';
import { DOM_ELEMENTS, EVENT_TYPES, INTERVALS, TIME_RANGES } from './constants.js';

export class CryptoTrackerApp {
  /**
   * Initialize application with all managers
   */
  constructor() {
    this.chartManager = null;
    this.marketDataManager = new MarketDataManager();
    this.wsManager = null;
    this.activeSymbol = null;
    this.currentFetchId = 0; // Prevents race conditions when switching symbols quickly
  }

  /**
   * Start the application
   * Orchestrates initialization flow:
   * 1. Load ApexCharts library
   * 2. Fetch available symbols
   * 3. Setup UI with symbols and initialize chart
   * 4. Load historical data for first symbol
   * 5. Connect WebSocket for real-time updates
   */
  async initialize() {
    // SECURITY: Disable console.log in production build
    if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
       console.log = function() {};
       console.info = function() {};
       // We keep console.error and console.warn for critical issues
    }

    try {
      console.log('Starting Crypto Tracker Application');
      
      // Step 1: Ensure LightweightCharts is loaded
      if (typeof LightweightCharts === 'undefined') {
        throw new Error('LightweightCharts library not loaded. Did you run npm install?');
      }
      
      // Step 2: Fetch symbols
      const symbols = await APIManager.fetchSymbols();
      if (!symbols || symbols.length === 0) {
        throw new Error('No trading symbols available');
      }
      console.log(`Fetched ${symbols.length} symbols:`, symbols);
      
      // Step 3: Setup UI and initialize chart
      await this.setupUI(symbols);
      
      // Step 4: Select and load first symbol
      this.selectMarket(symbols[0]);
      
      // Step 5: Connect WebSocket for real-time updates
      this.connectWebSocket(symbols);
      
      console.log('Application initialized successfully');
    } catch (error) {
      console.error(' Application initialization failed:', error);
      UIManager.showError(error.message);
    }
  }
  /**
   * Setup UI with market list
   * @param {string[]} symbols - Array of symbols
   */
  async setupUI(symbols) {
    console.log('Setting up UI');
    
    // Initialize chart manager with chart container
    const chartContainer = document.getElementById('chart');
    if (!chartContainer) {
      throw new Error('Chart container element not found in DOM');
    }
    
    this.chartManager = new ChartManager(chartContainer, (interval, timeRange) => {
      // When time range or interval changes, reload data
      this.loadHistoricalData(this.activeSymbol, interval, timeRange);
    });
    
    // Initialize the chart
    await this.chartManager.initialize();
    console.log('Chart initialized');
    
    // Initialize market data store
    this.marketDataManager.initialize(symbols);
    
    // Save symbols and render market list with click handlers
    this.symbols = symbols;
    UIManager.renderMarketList(symbols, (symbol) => this.selectMarket(symbol));
    
    // Setup search functionality
    const searchInput = document.getElementById('symbol-search');
    const clearSearchBtn = document.getElementById('clear-search');
    
    if (searchInput && clearSearchBtn) {
      searchInput.addEventListener('input', (e) => {
        // Anti-XSS: strictly sanitize the search term to allow only alphanumeric characters
        const rawTerm = e.target.value;
        const searchTerm = rawTerm.replace(/[^a-zA-Z0-9]/g, '').trim().toLowerCase();
        
        // Update input field visually if invalid characters were typed
        if (rawTerm !== e.target.value.replace(/[^a-zA-Z0-9]/g, '')) {
            e.target.value = rawTerm.replace(/[^a-zA-Z0-9]/g, '');
        }
        
        // Show/hide clear button
        clearSearchBtn.style.display = searchTerm.length > 0 ? 'block' : 'none';
        
        // Filter symbols
        const filteredSymbols = this.symbols.filter(s => 
          s.toLowerCase().includes(searchTerm)
        );
        
        // Re-render the list
        UIManager.renderMarketList(filteredSymbols, (symbol) => this.selectMarket(symbol));
        
        // Restore prices
        filteredSymbols.forEach(sym => {
          const data = this.marketDataManager.get(sym);
          if (data && data.price > 0) {
            UIManager.updateMarketPrice(sym, data.price, false);
          }
        });
        
        // Restore active selection if the active symbol is in the filtered list
        if (this.activeSymbol && filteredSymbols.includes(this.activeSymbol)) {
          UIManager.selectMarket(this.activeSymbol);
        }
      });
      
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        
        // Re-render the list
        UIManager.renderMarketList(this.symbols, (symbol) => this.selectMarket(symbol));
        
        // Restore prices
        this.symbols.forEach(sym => {
          const data = this.marketDataManager.get(sym);
          if (data && data.price > 0) {
            UIManager.updateMarketPrice(sym, data.price, false);
          }
        });
        
        if (this.activeSymbol) UIManager.selectMarket(this.activeSymbol);
        searchInput.focus();
      });
    }
  }

  /**
   * Select a market and load its data
   * @param {string} symbol - Symbol to select
   */
  selectMarket(symbol) {
    this.activeSymbol = symbol;
    UIManager.selectMarket(symbol);
    
    const displaySymbol = symbol.replace(/(USDT|BUSD|USDC)$/i, '/$1');
    DOM_ELEMENTS.activeSymbol().innerText = displaySymbol;
    
    // Clear the header to avoid showing the stale price from the previous coin
    const currentData = this.marketDataManager.get(symbol);
    if (currentData && currentData.price !== 0) {
      UIManager.updateHeader(symbol, currentData.price, currentData.change);
    } else {
      DOM_ELEMENTS.activePrice().innerText = "Loading...";
      DOM_ELEMENTS.activeChange().innerText = "—";
    }

    // Reset chart and load new data
    this.chartManager.reset();
    this.loadHistoricalData(symbol, this.chartManager.currentInterval, this.chartManager.currentRange);
  }

  /**
   * Load historical kline data for a symbol with specified time range
   * @param {string} symbol - Symbol to load data for
   * @param {string} interval - Kline interval ('1m', '1h', etc)
   * @param {string} timeRange - Time range ('24h', '1w', '1m', etc)
   */
  async loadHistoricalData(symbol, requestedInterval = '1h', timeRange = '24h') {
    const fetchId = ++this.currentFetchId;
    
    try {
      let interval = requestedInterval;
      
      // Dynamic fallback to prevent API limit abuse and browser freezing
      if (timeRange === 'all') {
        // ALWAYS use 1d or 1w for ALL so it loads gracefully
        if (['1m', '5m', '15m', '1h', '4h'].includes(interval)) interval = '1d';
      } else if (timeRange === '1y') {
        if (['1m', '5m', '15m', '1h'].includes(interval)) interval = '1d';
      } else if (timeRange === '3m') {
        if (['1m', '5m', '15m'].includes(interval)) interval = '4h';
      } else if (timeRange === '1m') {
        if (['1m', '5m'].includes(interval)) interval = '1h';
      }
      
      // Force update UI interval if changed
      if (interval !== requestedInterval && this.chartManager.currentInterval !== interval) {
        this.chartManager.currentInterval = interval;
        // Update UI buttons visually
        document.querySelectorAll('.interval-btn').forEach(b => {
          if (b.dataset.interval === interval) b.classList.add('active');
          else b.classList.remove('active');
        });
      }

      console.log(`Loading historical data for ${symbol} (${interval} over ${timeRange})`);
      
      const limit = ChartManager.getLimitForRange(timeRange, interval);
      
      let allKlines = [];
      
      // If the limit exceeds the Binance max of 1000 or if it's "all", 
      // we need to paginate our requests.
      if (timeRange === 'all' || limit > 1000) {
        // Fetch going backward from the present
        let endTime = Date.now();
        let hasMore = true;
        
        // Show loading state here if needed
        while (hasMore) {
          // If a new fetch was initiated (e.g. user clicked another coin quickly), abort this one
          if (this.currentFetchId !== fetchId) return;

          const url = `/api/klines?symbol=${symbol}&interval=${interval}&limit=1000&endTime=${endTime}`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch klines: HTTP ${res.status}`);
          
          const klines = await res.json();
          if (klines.length === 0) {
            hasMore = false;
          } else {
            // Prepend the older candles
            allKlines = klines.concat(allKlines);
            // The earliest candle's open time - 1ms is the next end time
            endTime = klines[0][0] - 1;
            
            // Stop if we hit our internal target limit (for non-ALL queries)
            if (timeRange !== 'all' && allKlines.length >= limit) {
              hasMore = false;
              // Keep only the newest `limit` candles
              allKlines = allKlines.slice(-limit);
            }
            
            // Safety cap to avoid infinite loops and freezing the browser
            if (allKlines.length > 50000) {
              hasMore = false;
            }
          }
        }
      } else {
        // Standard single request for small limits
        const url = `/api/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch klines: HTTP ${res.status}`);
        allKlines = await res.json();
      }
      
      // Abort if another fetch started
      if (this.currentFetchId !== fetchId) return;

      if (!allKlines || allKlines.length === 0) {
        throw new Error(`No historical data found for ${symbol}`);
      }
      
      this.chartManager.setHistoricalData(symbol, allKlines);
      console.log(`Loaded ${allKlines.length} ${interval} candles for ${symbol}`);
      
      // Update header immediately from the last REST candle if WS hasn't provided data yet
      const currentData = this.marketDataManager.get(symbol);
      if (!currentData || currentData.price === 0) {
        const lastCandle = allKlines[allKlines.length - 1];
        const lastPrice = parseFloat(lastCandle[4]);
        UIManager.updateHeader(symbol, lastPrice, currentData ? currentData.change : 0);
      }
    } catch (error) {
      if (this.currentFetchId === fetchId) {
        console.error(` Failed to load historical data for ${symbol}:`, error);
      }
    }
  }

  /**
   * Connect to WebSocket for real-time price updates
   * @param {string[]} symbols - Symbols to subscribe to
   */
  connectWebSocket(symbols) {
    console.log('Connecting to Binance WebSocket');
    
    this.wsManager = new WebSocketManager(
      symbols, 
      (tickData) => {
        this.handleTickData(tickData);
      },
      (status) => {
        UIManager.updateConnectionStatus(status);
      }
    );
    this.wsManager.connect();
  }

  /**
   * Handle incoming tick data from WebSocket
   * Updates both market list and chart
   * @param {Object} tickData - Tick data from Binance
   */
  handleTickData(tickData) {
    try {
      const symbol = tickData.s;
      const price = parseFloat(tickData.c);
      const change = parseFloat(tickData.P);

      if (!symbol || isNaN(price) || isNaN(change)) {
        return; // Invalid tick data
      }

      // Get previous data to detect if price changed BEFORE updating the store
      const prevData = this.marketDataManager.get(symbol);
      const priceChanged = prevData && prevData.price !== price && prevData.price !== 0;

      // Update market data store
      const updated = this.marketDataManager.update(symbol, price, change);
      if (!updated) return;

      // Update market list UI
      UIManager.updateMarketPrice(symbol, price, priceChanged);

      // Update chart and header only if this is the active symbol
      if (symbol === this.activeSymbol) {
        UIManager.updateHeader(symbol, price, change);
        if (this.chartManager && typeof this.chartManager.updateCurrentPrice === 'function') {
          // Pass tickData.E (Event time in milliseconds) to ensure correct time bucketing
          this.chartManager.updateCurrentPrice(symbol, price, tickData.E);
        }
      }
    } catch (error) {
      console.error('Error processing tick data:', error);
    }
  }
}
