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

  // Active filters
  const [filters, setFilters] = useState({
    domains: [],
    archetypes: []
  });

  /**
   * Load initial fragments
   */
  const loadInitialFragments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchFragments(20, null, filters.domains, filters.archetypes);
      setFragments(data.fragments || []);
      setCursor(data.next_cursor);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err.message || 'Failed to load fragments');
      console.error('Error loading initial fragments:', err);
    } finally {
      setLoading(false);
    }
  }, [filters.domains, filters.archetypes]);

  /**
   * Load more fragments (for infinite scroll)
   */
  const loadMoreFragments = useCallback(async () => {
    if (!hasMore || loading) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchFragments(20, cursor, filters.domains, filters.archetypes);
      setFragments(prev => [...prev, ...(data.fragments || [])]);
      setCursor(data.next_cursor);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err.message || 'Failed to load more fragments');
      console.error('Error loading more fragments:', err);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading, filters.domains, filters.archetypes]);

  /**
   * Apply new filters and reload feed
   */
  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setCursor(null);
    setHasMore(true);
    // Load initial fragments will be called via useEffect
  }, []);

  /**
   * Refresh feed (reload from beginning)
   */
  const refresh = useCallback(() => {
    setCursor(null);
    setHasMore(true);
    loadInitialFragments();
  }, [loadInitialFragments]);

  // Load initial fragments on mount and when filters change
  useEffect(() => {
    loadInitialFragments();
  }, [loadInitialFragments]);

  return {
    fragments,
    loading,
    error,
    hasMore,
    loadMore: loadMoreFragments,
    refresh,
    filters,
    applyFilters
  };
};

export default useFeedData;
