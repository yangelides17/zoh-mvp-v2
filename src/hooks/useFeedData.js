/**
 * useFeedData Hook
 *
 * Manages fragment feed data fetching and infinite scroll pagination
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchFragments } from '../services/api';

/**
 * Generate a random seed for feed ordering
 * Uses timestamp + random number for uniqueness across sessions
 */
const generateRandomSeed = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

export const useFeedData = () => {
  const [fragments, setFragments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [randomSeed, setRandomSeed] = useState(() => generateRandomSeed());

  // Active filters
  const [filters, setFilters] = useState({
    domains: [],
    archetypes: [],
    curated: false
  });

  /**
   * Load initial fragments
   */
  const loadInitialFragments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchFragments(20, null, filters.domains, filters.archetypes, randomSeed, filters.curated);
      setFragments(data.fragments || []);
      setCursor(data.next_cursor);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err.message || 'Failed to load fragments');
      console.error('Error loading initial fragments:', err);
    } finally {
      setLoading(false);
    }
  }, [filters.domains, filters.archetypes, filters.curated, randomSeed]);

  /**
   * Load more fragments (for infinite scroll)
   * Uses same randomSeed to maintain deterministic ordering
   */
  const loadMoreFragments = useCallback(async () => {
    if (!hasMore || loading) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchFragments(20, cursor, filters.domains, filters.archetypes, randomSeed, filters.curated);
      setFragments(prev => [...prev, ...(data.fragments || [])]);
      setCursor(data.next_cursor);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err.message || 'Failed to load more fragments');
      console.error('Error loading more fragments:', err);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading, filters.domains, filters.archetypes, filters.curated, randomSeed]);

  /**
   * Apply new filters and reload feed
   * Generates new random seed to re-randomize the feed
   */
  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setCursor(null);
    setHasMore(true);
    setRandomSeed(generateRandomSeed()); // Re-randomize on filter change
    // Load initial fragments will be called via useEffect
  }, []);

  /**
   * Refresh feed (reload from beginning)
   * Generates new random seed to re-randomize the feed
   */
  const refresh = useCallback(() => {
    setCursor(null);
    setHasMore(true);
    setRandomSeed(generateRandomSeed()); // Re-randomize on refresh
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
