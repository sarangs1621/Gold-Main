/**
 * Safely formats a number with a specified number of decimal places
 * Returns '0.000' (or appropriate format) if the value is null, undefined, or NaN
 * 
 * @param {number|null|undefined} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number string
 */
export function safeToFixed(value, decimals = 2) {
  // Check if value is null, undefined, or NaN
  if (value === null || value === undefined || isNaN(value)) {
    return '0.' + '0'.repeat(decimals);
  }
  
  // Convert to number if it's a string
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Check again after conversion
  if (isNaN(numValue)) {
    return '0.' + '0'.repeat(decimals);
  }
  
  return numValue.toFixed(decimals);
}

/**
 * Safely formats a number as currency with 2 decimal places
 * 
 * @param {number|null|undefined} value - The number to format
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value) {
  return safeToFixed(value, 2);
}

/**
 * Safely formats a weight value with 3 decimal places
 * 
 * @param {number|null|undefined} value - The weight to format
 * @returns {string} Formatted weight string
 */
export function formatWeight(value) {
  return safeToFixed(value, 3);
}

/**
 * Safely parses a value to a number, returning 0 if invalid
 * 
 * @param {any} value - The value to parse
 * @param {number} defaultValue - Default value if parsing fails (default: 0)
 * @returns {number} Parsed number or default value
 */
export function safeParseFloat(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}
