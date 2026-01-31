/**
 * Utility function to extract error messages from API responses
 * Handles various error formats including Pydantic validation errors
 * 
 * @param {Error} error - The error object from axios/fetch
 * @param {string} defaultMessage - Default message if no specific error found
 * @returns {string} - Human-readable error message
 */
export const extractErrorMessage = (error, defaultMessage = 'An error occurred') => {
  if (!error.response?.data?.detail) {
    return defaultMessage;
  }

  const detail = error.response.data.detail;

  // Handle Pydantic validation errors (array format)
  if (Array.isArray(detail)) {
    return detail.map(err => {
      // Extract field name and message
      const field = err.loc ? err.loc[err.loc.length - 1] : '';
      const msg = err.msg || JSON.stringify(err);
      return field ? `${field}: ${msg}` : msg;
    }).join(', ');
  }

  // Handle string error messages
  if (typeof detail === 'string') {
    return detail;
  }

  // Handle object error messages
  if (typeof detail === 'object') {
    return JSON.stringify(detail);
  }

  return defaultMessage;
};
