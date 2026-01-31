import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Reusable Pagination Component
 * 
 * @param {Object} props
 * @param {Object} props.pagination - Pagination metadata from API response
 * @param {number} props.pagination.page - Current page number
 * @param {number} props.pagination.page_size - Items per page
 * @param {number} props.pagination.total_count - Total number of items
 * @param {number} props.pagination.total_pages - Total number of pages
 * @param {boolean} props.pagination.has_next - Whether there's a next page
 * @param {boolean} props.pagination.has_prev - Whether there's a previous page
 * @param {Function} props.onPageChange - Callback when page changes
 */
const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.total_count === 0) {
    return null;
  }

  const { page, page_size, total_count, total_pages, has_next, has_prev } = pagination;

  // Calculate display range
  const startItem = (page - 1) * page_size + 1;
  const endItem = Math.min(page * page_size, total_count);

  // Generate page numbers to display (max 7 buttons)
  const getPageNumbers = () => {
    const pages = [];
    const maxButtons = 7;
    
    if (total_pages <= maxButtons) {
      // Show all pages
      for (let i = 1; i <= total_pages; i++) {
        pages.push(i);
      }
    } else {
      // Show subset with ellipsis
      if (page <= 4) {
        // Near start: 1 2 3 4 5 ... 10
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total_pages);
      } else if (page >= total_pages - 3) {
        // Near end: 1 ... 6 7 8 9 10
        pages.push(1);
        pages.push('...');
        for (let i = total_pages - 4; i <= total_pages; i++) {
          pages.push(i);
        }
      } else {
        // Middle: 1 ... 4 5 6 ... 10
        pages.push(1);
        pages.push('...');
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(total_pages);
      }
    }
    
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-white border-t border-gray-200">
      {/* Left side: Items info */}
      <div className="text-sm text-gray-700">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{total_count}</span> entries
      </div>

      {/* Right side: Page navigation */}
      <div className="flex items-center gap-2">
        {/* First page button */}
        <button
          onClick={() => onPageChange(1)}
          disabled={!has_prev}
          className={`p-2 rounded-md ${
            has_prev
              ? 'text-gray-700 hover:bg-gray-100'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous page button */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!has_prev}
          className={`p-2 rounded-md ${
            has_prev
              ? 'text-gray-700 hover:bg-gray-100'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((pageNum, index) => {
            if (pageNum === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-3 py-1 text-gray-500">
                  ...
                </span>
              );
            }

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  pageNum === page
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next page button */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!has_next}
          className={`p-2 rounded-md ${
            has_next
              ? 'text-gray-700 hover:bg-gray-100'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last page button */}
        <button
          onClick={() => onPageChange(total_pages)}
          disabled={!has_next}
          className={`p-2 rounded-md ${
            has_next
              ? 'text-gray-700 hover:bg-gray-100'
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
