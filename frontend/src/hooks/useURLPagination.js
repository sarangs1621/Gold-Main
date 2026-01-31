import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Custom hook to manage pagination state with URL synchronization
 * 
 * @param {number} defaultPage - Default page number (default: 1)
 * @returns {Object} - { currentPage, setPage, pagination, setPagination }
 */
export function useURLPagination(defaultPage = 1) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pagination, setPagination] = useState(null);
  
  // Get current page from URL or use default
  const currentPage = parseInt(searchParams.get('page')) || defaultPage;
  
  // Function to update page in URL
  const setPage = useCallback((page) => {
    const newSearchParams = new URLSearchParams(searchParams);
    if (page === 1) {
      // Remove page param if it's page 1 (cleaner URLs)
      newSearchParams.delete('page');
    } else {
      newSearchParams.set('page', page.toString());
    }
    setSearchParams(newSearchParams);
  }, [searchParams, setSearchParams]);
  
  return {
    currentPage,
    setPage,
    pagination,
    setPagination
  };
}

export default useURLPagination;
