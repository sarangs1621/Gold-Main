import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Inline form error message component
 * Displays validation errors below form fields
 */
export const FormErrorMessage = ({ error }) => {
  if (!error) return null;
  
  return (
    <div className="flex items-center space-x-1 mt-1 text-red-600 text-sm">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
};

/**
 * Form field wrapper with label and error display
 */
export const FormField = ({ 
  label, 
  error, 
  required = false, 
  children,
  className = '' 
}) => {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      <FormErrorMessage error={error} />
    </div>
  );
};
