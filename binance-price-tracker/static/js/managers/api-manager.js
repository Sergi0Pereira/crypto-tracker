/**
 * API Manager
 * Handles HTTP requests to the backend proxy
 * Single Responsibility: Data Fetching and Network Operations
 */

import { API_ENDPOINTS, TIME_RANGES } from '../constants.js';

export class APIManager {
  static async fetchSymbols() {
    try {
      const response = await fetch(API_ENDPOINTS.SYMBOLS);
      if (!response.ok) {
        throw new Error(`Failed to fetch symbols: HTTP ${response.status}`);
      }
      const data = await response.json();
      return data.symbols || [];
    } catch (error) {
      console.error('API Error (Symbols):', error);
      throw error;
    }
  }

  static async fetchPaginatedHistoricalData(symbol, interval, limit, timeRange, shouldAbort = () => false) {
    let allKlines = [];
    const maxKlinesLimit = 50000;
    const chunkSize = 1000;
    
    try {
      if (timeRange === TIME_RANGES.ALL || limit > chunkSize) {
        let endTime = Date.now();
        let hasMore = true;
        
        while (hasMore) {
          if (shouldAbort()) return null;

          const url = `${API_ENDPOINTS.KLINES}?symbol=${symbol}&interval=${interval}&limit=${chunkSize}&endTime=${endTime}`;
          const response = await fetch(url);
          
          if (!response.ok) throw new Error(`Failed to fetch klines: HTTP ${response.status}`);
          
          const klines = await response.json();
          if (!klines || klines.length === 0) {
            hasMore = false;
          } else {
            allKlines = klines.concat(allKlines);
            endTime = klines[0][0] - 1;
            
            if (timeRange !== TIME_RANGES.ALL && allKlines.length >= limit) {
              hasMore = false;
              allKlines = allKlines.slice(-limit);
            }
            
            if (allKlines.length > maxKlinesLimit) {
              hasMore = false;
            }
          }
        }
      } else {
        const url = `${API_ENDPOINTS.KLINES}?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error(`Failed to fetch klines: HTTP ${response.status}`);
        allKlines = await response.json();
      }

      if (shouldAbort()) return null;
      return allKlines;
      
    } catch (error) {
      console.error(`API Error (Historical Data - ${symbol}):`, error);
      throw error;
    }
  }
}
