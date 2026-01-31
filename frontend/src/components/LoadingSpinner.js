import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Page-level loading spinner for initial page loads
 */
export const PageLoadingSpinner = ({ text = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      <p className="text-gray-600 text-lg">{text}</p>
    </div>
  );
};

/**
 * Table loading spinner for table data loads
 */
export const TableLoadingSpinner = ({ text = 'Loading data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-3">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      <p className="text-gray-500 text-sm">{text}</p>
    </div>
  );
};

/**
 * Button loading spinner for inline button states
 */
export const ButtonLoadingSpinner = ({ text = 'Processing...' }) => {
  return (
    <span className="flex items-center space-x-2">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>{text}</span>
    </span>
  );
};

/**
 * Small inline loading spinner
 */
export const InlineLoadingSpinner = ({ size = 16 }) => {
  return <Loader2 className={`w-${size / 4} h-${size / 4} animate-spin text-gray-600`} />;
};

/**
 * Card loading skeleton for cards
 */
export const CardLoadingSkeleton = () => {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
      </div>
    </div>
  );
};
