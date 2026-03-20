/**
 * WebSocket Manager
 * Handles Binance WebSocket connection and message processing
 * Implements Single Responsibility - only WebSocket communication
 * Uses callback pattern for decoupling (dependency inversion)
 */

import { CONFIG } from '../config.js';

export class WebSocketManager {
  /**
   * Initialize WebSocket connection manager
   * @param {string[]} symbols - Symbols to subscribe to
   * @param {Function} messageHandler - Callback for tick data messages
   * @param {Function} statusHandler - Callback for connection status updates
   */
  constructor(symbols, messageHandler, statusHandler) {
    this.symbols = symbols;
    this.messageHandler = messageHandler;
    this.statusHandler = statusHandler;
    this.ws = null;
  }

  /**
   * Establish WebSocket connection to Binance
   * Subscribes to @ticker streams for all symbols
   */
  connect() {
    const streams = this.symbols.map(s => `${s.toLowerCase()}@ticker`).join('/');
    const url = `${CONFIG.BINANCE_WS}?streams=${streams}`;
    
    console.log('🔌 Connecting to WebSocket:', url);
    this.ws = new WebSocket(url);
    
    if (this.statusHandler) this.statusHandler('connecting');
    
    this.ws.onopen = () => this.handleOpen();
    this.ws.onerror = (error) => this.handleError(error);
    this.ws.onmessage = (event) => this.handleMessage(event);
    this.ws.onclose = () => {
      if (this.statusHandler) this.statusHandler('disconnected');
    };
  }

  /**
   * Handle successful connection
   */
  handleOpen() {
    console.log(' WebSocket connected');
    if (this.statusHandler) this.statusHandler('connected');
  }

  /**
   * Handle connection errors
   * @param {Event} error - Error event
   */
  handleError(error) {
    console.error(' WebSocket error:', error);
    if (this.statusHandler) this.statusHandler('error');
  }

  /**
   * Handle incoming WebSocket messages
   * Parses JSON and delegates to message handler
   * @param {MessageEvent} event - WebSocket message event
   */
  handleMessage(event) {
    try {
      const msg = JSON.parse(event.data);
      // Binance wraps data in 'data' property when using multiple streams
      const tickData = msg.data || msg;
      this.messageHandler(tickData);
    } catch (e) {
      console.error('Error processing WebSocket message:', e);
    }
  }

  /**
   * Close WebSocket connection
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      console.log('WebSocket disconnected');
    }
  }
}
