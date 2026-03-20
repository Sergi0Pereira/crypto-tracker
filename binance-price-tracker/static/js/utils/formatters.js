/**
 * Formatting Utilities
 * Pure functions for data formatting
 * No side effects, no dependencies on external state
 */

/**
 * Format price to 4 decimal places
 * @param {number} price - The price value
 * @returns {string} Formatted price
 */
export function formatPrice(price) {
  return parseFloat(price).toFixed(4);
}

/**
 * Format percentage change with +/- sign
 * @param {number} change - The change percentage
 * @returns {string} Formatted change (e.g., "+5.25%" or "-3.10%")
 */
export function formatChange(change) {
  return (change > 0 ? '+' : '') + parseFloat(change).toFixed(2) + '%';
}

/**
 * Get color class based on value comparison
 * @param {number} value - Current value
 * @param {number} prevValue - Previous value for comparison
 * @returns {string} CSS class name ('text-green' or 'text-red')
 */
export function getColorClass(value, prevValue) {
  return value >= prevValue ? 'text-green' : 'text-red';
}

/**
 * Format timestamp to locale time string
 * @param {number} timestamp - Unix timestamp in milliseconds
 * @returns {string} Formatted time (e.g., "14:30:45")
 */
export function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}
