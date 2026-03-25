/**
 * Formatting Utilities
 * Pure functions for data formatting
 */

import { CSS_CLASSES, INTERVALS } from '../constants.js';

export function formatPrice(price) {
  const num = parseFloat(price);
  if (num < 1.0) {
    return num.toFixed(8);
  }
  return num.toFixed(4);
}

export function formatChange(change) {
  return (change > 0 ? '+' : '') + parseFloat(change).toFixed(2) + '%';
}

export function getColorClass(value, prevValue = 0) {
  return value >= prevValue ? CSS_CLASSES.TEXT_GREEN : CSS_CLASSES.TEXT_RED;
}

export function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}

export function getBucketedTime(timestampMs, interval) {
  const date = new Date(timestampMs);
  
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const h = date.getUTCHours();
  const min = date.getUTCMinutes();

  let bucketDate;

  switch (interval.toLowerCase()) {
    case INTERVALS.ONE_MINUTE:
      bucketDate = new Date(Date.UTC(y, m, d, h, min));
      break;
    case INTERVALS.FIVE_MINUTES:
      bucketDate = new Date(Date.UTC(y, m, d, h, Math.floor(min / 5) * 5));
      break;
    case INTERVALS.FIFTEEN_MINUTES:
      bucketDate = new Date(Date.UTC(y, m, d, h, Math.floor(min / 15) * 15));
      break;
    case INTERVALS.ONE_HOUR:
      bucketDate = new Date(Date.UTC(y, m, d, h, 0));
      break;
    case INTERVALS.FOUR_HOURS:
      bucketDate = new Date(Date.UTC(y, m, d, Math.floor(h / 4) * 4, 0));
      break;
    case INTERVALS.ONE_DAY:
      bucketDate = new Date(Date.UTC(y, m, d, 0, 0));
      break;
    case INTERVALS.ONE_WEEK:
      const day = date.getUTCDay();
      const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
      bucketDate = new Date(Date.UTC(y, m, diff, 0, 0));
      break;
    default:
      bucketDate = new Date(Date.UTC(y, m, d, h, min));
  }

  return Math.floor(bucketDate.getTime() / 1000);
}
