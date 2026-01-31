import DOMPurify from 'dompurify';

/**
 * Input Sanitization Utilities for Frontend
 * 
 * These utilities provide client-side XSS protection by:
 * 1. Sanitizing HTML/script tags from user inputs
 * 2. Validating data types and formats
 * 3. Escaping special characters
 * 
 * Usage:
 * - Call sanitizeInput() on all user inputs before sending to API
 * - Call sanitizeHTML() on any HTML content before rendering
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes all script tags and dangerous HTML elements
 * 
 * @param {string} html - HTML content to sanitize
 * @returns {string} - Sanitized HTML safe for rendering
 */
export const sanitizeHTML = (html) => {
  if (!html || typeof html !== 'string') return '';
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'p', 'br'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
};

/**
 * Sanitize plain text input by removing HTML tags
 * Use this for text inputs, textareas, etc.
 * 
 * @param {string} text - Text to sanitize
 * @returns {string} - Sanitized text with HTML removed
 */
export const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  // Remove all HTML tags
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  }).trim();
};

/**
 * Sanitize email address
 * Validates email format and removes dangerous characters
 * 
 * @param {string} email - Email to sanitize
 * @returns {string} - Sanitized email
 */
export const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  
  // Remove HTML tags and trim
  const cleaned = sanitizeText(email).toLowerCase().trim();
  
  // Basic email validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(cleaned)) {
    throw new Error('Invalid email format');
  }
  
  return cleaned;
};

/**
 * Sanitize phone number
 * Allows only digits, spaces, +, -, (, )
 * 
 * @param {string} phone - Phone number to sanitize
 * @returns {string} - Sanitized phone number
 */
export const sanitizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  
  // Remove HTML tags first
  const cleaned = sanitizeText(phone);
  
  // Allow only valid phone characters
  return cleaned.replace(/[^\d\s\-\+\(\)]/g, '').trim();
};

/**
 * Sanitize numeric input
 * Removes non-numeric characters except decimal point
 * 
 * @param {string|number} value - Numeric value to sanitize
 * @returns {string} - Sanitized numeric string
 */
export const sanitizeNumeric = (value) => {
  if (value === null || value === undefined) return '';
  
  const str = String(value);
  const cleaned = sanitizeText(str);
  
  // Keep only numbers, decimal point, and minus sign
  return cleaned.replace(/[^\d\.\-]/g, '');
};

/**
 * Sanitize object - recursively sanitizes all string values
 * Use this before sending form data to API
 * 
 * @param {Object} obj - Object to sanitize
 * @returns {Object} - Sanitized object
 */
export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = {};
  
  for (const key in obj) {
    const value = obj[key];
    
    if (typeof value === 'string') {
      // Skip IDs, dates, and other technical fields
      if (
        key.endsWith('_id') ||
        key.endsWith('Id') ||
        key === 'id' ||
        key.includes('date') ||
        key.includes('Date')
      ) {
        sanitized[key] = value;
      } else {
        // Sanitize regular text fields
        sanitized[key] = sanitizeText(value);
      }
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'object' ? sanitizeObject(item) : sanitizeText(String(item))
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Validate amount/price
 * Ensures value is a valid positive number
 * 
 * @param {number|string} amount - Amount to validate
 * @param {number} min - Minimum allowed value (default: 0)
 * @param {number} max - Maximum allowed value (default: 1000000)
 * @returns {number} - Validated amount
 */
export const validateAmount = (amount, min = 0, max = 1000000) => {
  const num = parseFloat(sanitizeNumeric(amount));
  
  if (isNaN(num)) {
    throw new Error('Invalid amount: must be a number');
  }
  
  if (num < min || num > max) {
    throw new Error(`Amount must be between ${min} and ${max}`);
  }
  
  return num;
};

/**
 * Validate weight (with decimal precision)
 * 
 * @param {number|string} weight - Weight to validate
 * @returns {number} - Validated weight with 3 decimal precision
 */
export const validateWeight = (weight) => {
  const num = validateAmount(weight, 0, 100000);
  return parseFloat(num.toFixed(3));
};

/**
 * Validate purity (gold purity 1-999)
 * 
 * @param {number|string} purity - Purity to validate
 * @returns {number} - Validated purity
 */
export const validatePurity = (purity) => {
  const num = parseInt(sanitizeNumeric(purity));
  
  if (isNaN(num) || num < 1 || num > 999) {
    throw new Error('Purity must be between 1 and 999');
  }
  
  return num;
};

/**
 * XSS Protection wrapper for form submission
 * Sanitizes all data before sending to API
 * 
 * Usage:
 * const cleanData = withXSSProtection(formData);
 * await api.post('/endpoint', cleanData);
 * 
 * @param {Object} data - Form data to sanitize
 * @returns {Object} - Sanitized data safe for API submission
 */
export const withXSSProtection = (data) => {
  if (!data) return data;
  
  if (Array.isArray(data)) {
    return data.map(item => withXSSProtection(item));
  }
  
  if (typeof data === 'object') {
    return sanitizeObject(data);
  }
  
  if (typeof data === 'string') {
    return sanitizeText(data);
  }
  
  return data;
};
