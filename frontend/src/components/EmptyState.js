import React from 'react';
import { PackageX, FileText, Users, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';

/**
 * Generic empty state component with icon, message, and optional action
 */
export const EmptyState = ({ 
  icon: Icon = PackageX, 
  title = 'No data found', 
  message = 'There are no items to display.', 
  actionLabel = null,
  onAction = null 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-gray-100 p-6 mb-4">
        <Icon className="w-12 h-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-center max-w-md mb-6">{message}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

/**
 * Table-specific empty state
 */
export const TableEmptyState = ({ 
  message = 'No records found', 
  actionLabel = null,
  onAction = null 
}) => {
  return (
    <div className="text-center py-12">
      <PackageX className="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <p className="text-gray-500 mb-4">{message}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

/**
 * Empty state for reports
 */
export const ReportEmptyState = ({ 
  title = 'No Report Data',
  message = 'No data available for the selected period. Try adjusting your filters or date range.',
  actionLabel = 'Adjust Filters',
  onAction = null
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="rounded-full bg-blue-50 p-6 mb-4">
        <FileText className="w-12 h-12 text-blue-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-center max-w-lg mb-6">{message}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

/**
 * Empty state for daily closing
 */
export const DailyClosingEmptyState = ({ onCreateNew }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="rounded-full bg-green-50 p-6 mb-4">
        <Calendar className="w-12 h-12 text-green-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Daily Closing Records</h3>
      <p className="text-gray-600 text-center max-w-lg mb-6">
        Start by creating your first daily closing record to track cash flow and reconcile accounts.
      </p>
      {onCreateNew && (
        <Button onClick={onCreateNew} className="mt-2">
          Create First Closing
        </Button>
      )}
    </div>
  );
};

/**
 * Empty state for audit logs
 */
export const AuditLogEmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="rounded-full bg-purple-50 p-6 mb-4">
        <FileText className="w-12 h-12 text-purple-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">No Audit Logs</h3>
      <p className="text-gray-600 text-center max-w-lg">
        Audit logs will appear here as actions are performed in the system. All user activities are automatically tracked.
      </p>
    </div>
  );
};

/**
 * Empty state with filter suggestion
 */
export const FilteredEmptyState = ({ onClearFilters }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-amber-50 p-6 mb-4">
        <AlertCircle className="w-12 h-12 text-amber-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
      <p className="text-gray-600 text-center max-w-md mb-6">
        No records match your current filters. Try adjusting or clearing your filters.
      </p>
      {onClearFilters && (
        <Button onClick={onClearFilters} variant="outline">
          Clear All Filters
        </Button>
      )}
    </div>
  );
};
