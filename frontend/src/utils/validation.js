/**
 * Comprehensive validation utility functions for forms
 * Used across the application for consistent validation
 */

// Validate weight field (must be positive number)
export const validateWeight = (value) => {
  if (!value || value === '') {
    return { isValid: false, error: 'Weight is required' };
  }
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Weight must be a valid number' };
  }
  
  if (numValue <= 0) {
    return { isValid: false, error: 'Weight must be greater than 0' };
  }
  
  if (numValue > 100000) {
    return { isValid: false, error: 'Weight seems too large. Please check.' };
  }
  
  return { isValid: true, error: '' };
};

// Validate rate field (must be positive number)
export const validateRate = (value) => {
  if (!value || value === '') {
    return { isValid: false, error: 'Rate is required' };
  }
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Rate must be a valid number' };
  }
  
  if (numValue <= 0) {
    return { isValid: false, error: 'Rate must be greater than 0' };
  }
  
  if (numValue > 1000000) {
    return { isValid: false, error: 'Rate seems too large. Please check.' };
  }
  
  return { isValid: true, error: '' };
};

// Validate amount field (must be positive number)
export const validateAmount = (value) => {
  if (!value || value === '') {
    return { isValid: false, error: 'Amount is required' };
  }
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Amount must be a valid number' };
  }
  
  if (numValue <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }
  
  return { isValid: true, error: '' };
};

// Validate paid amount (must be non-negative and not exceed total)
export const validatePaidAmount = (value, totalAmount) => {
  if (!value && value !== 0 && value !== '0') {
    return { isValid: true, error: '' }; // Optional field
  }
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Paid amount must be a valid number' };
  }
  
  if (numValue < 0) {
    return { isValid: false, error: 'Paid amount cannot be negative' };
  }
  
  if (totalAmount) {
    const total = parseFloat(totalAmount);
    if (!isNaN(total) && numValue > total) {
      return { isValid: false, error: 'Paid amount cannot exceed total amount' };
    }
  }
  
  return { isValid: true, error: '' };
};

// Validate purity (must be between 1 and 999)
export const validatePurity = (value) => {
  if (!value || value === '') {
    return { isValid: false, error: 'Purity is required' };
  }
  
  const numValue = parseInt(value);
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Purity must be a valid number' };
  }
  
  if (numValue <= 0) {
    return { isValid: false, error: 'Purity must be greater than 0' };
  }
  
  if (numValue > 999) {
    return { isValid: false, error: 'Purity cannot exceed 999' };
  }
  
  return { isValid: true, error: '' };
};

// Validate quantity (must be positive integer)
export const validateQuantity = (value) => {
  if (!value || value === '') {
    return { isValid: false, error: 'Quantity is required' };
  }
  
  const numValue = parseInt(value);
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Quantity must be a valid number' };
  }
  
  if (numValue <= 0) {
    return { isValid: false, error: 'Quantity must be greater than 0' };
  }
  
  if (numValue > 10000) {
    return { isValid: false, error: 'Quantity seems too large. Please check.' };
  }
  
  return { isValid: true, error: '' };
};

// Validate selection field (must not be empty)
export const validateSelection = (value, fieldName = 'field') => {
  if (!value || value === '' || value === 'select') {
    return { isValid: false, error: `Please select a ${fieldName}` };
  }
  
  return { isValid: true, error: '' };
};

// Validate text field (must not be empty)
export const validateRequired = (value, fieldName = 'field') => {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  return { isValid: true, error: '' };
};

// Validate email format
export const validateEmail = (value) => {
  if (!value || value.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true, error: '' };
};

// Validate phone number (basic validation)
export const validatePhone = (value) => {
  if (!value || value.trim() === '') {
    return { isValid: true, error: '' }; // Optional field
  }
  
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  if (!phoneRegex.test(value)) {
    return { isValid: false, error: 'Please enter a valid phone number' };
  }
  
  return { isValid: true, error: '' };
};

// Validate date (must not be in the future for most cases)
export const validateDate = (value, allowFuture = false) => {
  if (!value || value === '') {
    return { isValid: false, error: 'Date is required' };
  }
  
  const selectedDate = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (isNaN(selectedDate.getTime())) {
    return { isValid: false, error: 'Please enter a valid date' };
  }
  
  if (!allowFuture && selectedDate > today) {
    return { isValid: false, error: 'Date cannot be in the future' };
  }
  
  return { isValid: true, error: '' };
};

// Validate percentage (0-100)
export const validatePercentage = (value) => {
  if (!value && value !== 0 && value !== '0') {
    return { isValid: true, error: '' }; // Optional field
  }
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Percentage must be a valid number' };
  }
  
  if (numValue < 0) {
    return { isValid: false, error: 'Percentage cannot be negative' };
  }
  
  if (numValue > 100) {
    return { isValid: false, error: 'Percentage cannot exceed 100' };
  }
  
  return { isValid: true, error: '' };
};
