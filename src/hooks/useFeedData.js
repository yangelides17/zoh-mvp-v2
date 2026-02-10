/**
 * useFeedData Hook
 *
 * Manages fragment feed data fetching and infinite scroll pagination
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchFragments } from '../services/api';

export const useFeedData = () => {
  const [fragments, setFragments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);

  /**
   * Load initial fragments
   */
  const loadInitialFragments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchFragments(20, null);
      setFragments(data.fragments || []);
      setCursor(data.next_cursor);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err.message || 'Failed to load fragments');
      console.error('Error loading initial fragments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load more fragments (for infinite scroll)
   */
  const loadMoreFragments = useCallback(async () => {
    if (!hasMore || loading) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchFragments(20, cursor);
      setFragments(prev => [...prev, ...(data.fragments || [])]);
      setCursor(data.next_cursor);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err.message || 'Failed to load more fragments');
      console.error('Error loading more fragments:', err);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading]);

  /**
   * Refresh feed (reload from beginning)
   */
  const refresh = useCallback(() => {
    setCursor(null);
    setHasMore(true);
    loadInitialFragments();
  }, [loadInitialFragments]);

  // Load initial fragments on mount
  useEffect(() => {
    loadInitialFragments();
  }, [loadInitialFragments]);

  return {
    fragments,
    loading,
    error,
    hasMore,
    loadMore: loadMoreFragments,
    refresh
  };
};

export default useFeedData;
