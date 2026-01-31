/**
 * Date and Time Utilities for Gold Shop ERP
 * 
 * CRITICAL REQUIREMENTS:
 * 1. Backend stores all timestamps in UTC (ISO 8601 format)
 * 2. Frontend displays all timestamps in Asia/Muscat timezone
 * 3. Consistent format: DD-MMM-YYYY, hh:mm A (e.g., 25-Jan-2026, 03:15 PM)
 * 4. Date-only fields (like delivery_date) use YYYY-MM-DD format
 * 5. Never show raw ISO strings to users
 */

import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// Constants
const DISPLAY_TIMEZONE = 'Asia/Muscat';
const DATETIME_FORMAT = 'dd-MMM-yyyy, hh:mm a'; // 25-Jan-2026, 03:15 PM
const DATE_FORMAT = 'dd-MMM-yyyy'; // 25-Jan-2026
const DATE_ONLY_FORMAT = 'yyyy-MM-dd'; // 2026-01-25 (for date pickers)
const TIME_FORMAT = 'hh:mm a'; // 03:15 PM

/**
 * Format UTC timestamp to local display format
 * @param {string|Date} utcTimestamp - UTC timestamp (ISO 8601 string or Date object)
 * @param {boolean} includeTime - Whether to include time in output
 * @returns {string} Formatted date/time in Asia/Muscat timezone
 * 
 * Examples:
 * - formatDateTime("2026-01-25T15:45:30Z") => "25-Jan-2026, 03:45 PM"
 * - formatDateTime("2026-01-25T15:45:30Z", false) => "25-Jan-2026"
 */
export const formatDateTime = (utcTimestamp, includeTime = true) => {
  if (!utcTimestamp) return '';
  
  try {
    // Parse ISO string or use Date object
    const date = typeof utcTimestamp === 'string' ? parseISO(utcTimestamp) : utcTimestamp;
    
    // Convert to Asia/Muscat timezone
    const zonedDate = toZonedTime(date, DISPLAY_TIMEZONE);
    
    // Format according to requirement
    const formatString = includeTime ? DATETIME_FORMAT : DATE_FORMAT;
    return format(zonedDate, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format UTC timestamp to date only (no time)
 * @param {string|Date} utcTimestamp - UTC timestamp
 * @returns {string} Formatted date: "25-Jan-2026"
 */
export const formatDate = (utcTimestamp) => {
  return formatDateTime(utcTimestamp, false);
};

/**
 * Format UTC timestamp to time only
 * @param {string|Date} utcTimestamp - UTC timestamp
 * @returns {string} Formatted time: "03:15 PM"
 */
export const formatTime = (utcTimestamp) => {
  if (!utcTimestamp) return '';
  
  try {
    const date = typeof utcTimestamp === 'string' ? parseISO(utcTimestamp) : utcTimestamp;
    const zonedDate = toZonedTime(date, DISPLAY_TIMEZONE);
    return format(zonedDate, TIME_FORMAT);
  } catch (error) {
    console.error('Error formatting time:', error);
    return '';
  }
};

/**
 * Format date-only field for date pickers (YYYY-MM-DD)
 * Used for fields like delivery_date that store date without time
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Same format for input fields
 */
export const formatDateOnly = (dateString) => {
  if (!dateString) return '';
  return dateString; // Already in correct format for date pickers
};

/**
 * Parse date-only input from date picker to YYYY-MM-DD
 * @param {string} dateString - Date from date picker
 * @returns {string} Date in YYYY-MM-DD format
 */
export const parseDateOnly = (dateString) => {
  if (!dateString) return null;
  return dateString; // Date pickers return YYYY-MM-DD format
};

/**
 * Display date-only field in readable format
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Formatted as "25-Jan-2026"
 */
export const displayDateOnly = (dateString) => {
  if (!dateString) return '';
  
  try {
    // Parse YYYY-MM-DD format
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day);
    return format(date, DATE_FORMAT);
  } catch (error) {
    console.error('Error displaying date-only:', error);
    return dateString;
  }
};

/**
 * Check if a timestamp exists and is valid
 * @param {string|Date|null} timestamp
 * @returns {boolean}
 */
export const hasTimestamp = (timestamp) => {
  return timestamp != null && timestamp !== '';
};

/**
 * Format timestamp for display in tables/lists
 * Shows both date and time
 * @param {string|Date} utcTimestamp
 * @returns {string} "25-Jan-2026, 03:15 PM"
 */
export const formatTableDateTime = (utcTimestamp) => {
  return formatDateTime(utcTimestamp, true);
};

/**
 * Format timestamp for display in detail views
 * More verbose format with full context
 * @param {string|Date} utcTimestamp
 * @returns {string} "25-Jan-2026, 03:15 PM"
 */
export const formatDetailDateTime = (utcTimestamp) => {
  return formatDateTime(utcTimestamp, true);
};

/**
 * Get current timestamp in UTC (for sending to backend)
 * Backend handles timestamp generation, but this is for client-side validation
 * @returns {string} ISO 8601 UTC timestamp
 */
export const getCurrentUTCTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Validate that completed_at exists when status is completed
 * @param {string} status - Job card status
 * @param {string|null} completedAt - completed_at timestamp
 * @returns {boolean}
 */
export const validateCompletedTimestamp = (status, completedAt) => {
  if (status === 'completed' || status === 'delivered') {
    return hasTimestamp(completedAt);
  }
  return true; // Valid for other statuses
};

/**
 * Validate that delivered_at exists when status is delivered
 * @param {string} status - Job card status
 * @param {string|null} deliveredAt - delivered_at timestamp
 * @returns {boolean}
 */
export const validateDeliveredTimestamp = (status, deliveredAt) => {
  if (status === 'delivered') {
    return hasTimestamp(deliveredAt);
  }
  return true; // Valid for other statuses
};

/**
 * Validate that finalized_at exists when invoice is finalized
 * @param {string} status - Invoice status
 * @param {string|null} finalizedAt - finalized_at timestamp
 * @returns {boolean}
 */
export const validateFinalizedTimestamp = (status, finalizedAt) => {
  if (status === 'finalized') {
    return hasTimestamp(finalizedAt);
  }
  return true; // Valid for draft status
};

/**
 * Validate that paid_at exists when invoice is fully paid
 * @param {string} paymentStatus - Invoice payment status
 * @param {string|null} paidAt - paid_at timestamp
 * @returns {boolean}
 */
export const validatePaidTimestamp = (paymentStatus, paidAt) => {
  if (paymentStatus === 'paid') {
    return hasTimestamp(paidAt);
  }
  return true; // Valid for unpaid/partial status
};

export default {
  formatDateTime,
  formatDate,
  formatTime,
  formatDateOnly,
  parseDateOnly,
  displayDateOnly,
  hasTimestamp,
  formatTableDateTime,
  formatDetailDateTime,
  getCurrentUTCTimestamp,
  validateCompletedTimestamp,
  validateDeliveredTimestamp,
  validateFinalizedTimestamp,
  validatePaidTimestamp,
};
