/**
 * useFeedData Hook
 *
 * Manages feed data fetching and infinite scroll pagination.
 * Uses the /articles endpoint which returns assembled articles
 * (grouped article/article_media fragments) and standalone fragments
 * as a unified feed.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchArticles } from '../services/api';

/**
 * Generate a random seed for feed ordering
 * Uses timestamp + random number for uniqueness across sessions
 */
const generateRandomSeed = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

export const useFeedData = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [randomSeed, setRandomSeed] = useState(() => generateRandomSeed());

  // Active filters
  const [filters, setFilters] = useState({
    domains: [],
    archetypes: [],
    pages: [],
    curated: false,
    source: 'all',
    search: ''
  });

  /**
   * Load initial feed items
   */
  const loadInitialItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchArticles(20, null, filters.domains, filters.archetypes, randomSeed, filters.curated, filters.source, filters.pages, filters.search);
      setItems(data.items || []);
      setCursor(data.next_cursor);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err.message || 'Failed to load feed');
      console.error('Error loading initial feed items:', err);
    } finally {
      setLoading(false);
    }
  }, [filters.domains, filters.archetypes, filters.pages, filters.curated, filters.source, filters.search, randomSeed]);

  /**
   * Load more feed items (for infinite scroll)
   * Uses same randomSeed to maintain deterministic ordering
   */
  const loadMoreItems = useCallback(async () => {
    if (!hasMore || loading) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchArticles(20, cursor, filters.domains, filters.archetypes, randomSeed, filters.curated, filters.source, filters.pages, filters.search);
      setItems(prev => [...prev, ...(data.items || [])]);
      setCursor(data.next_cursor);
      setHasMore(data.has_more);
    } catch (err) {
      setError(err.message || 'Failed to load more items');
      console.error('Error loading more feed items:', err);
    } finally {
      setLoading(false);
    }
  }, [cursor, hasMore, loading, filters.domains, filters.archetypes, filters.pages, filters.curated, filters.source, filters.search, randomSeed]);

  /**
   * Apply new filters and reload feed
   * Generates new random seed to re-randomize the feed
   */
  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setCursor(null);
    setHasMore(true);
    setRandomSeed(generateRandomSeed());
  }, []);

  /**
   * Refresh feed (reload from beginning)
   * Generates new random seed to re-randomize the feed
   */
  const refresh = useCallback(() => {
    setCursor(null);
    setHasMore(true);
    setRandomSeed(generateRandomSeed());
    loadInitialItems();
  }, [loadInitialItems]);

  // Load initial items on mount and when filters change
  useEffect(() => {
    loadInitialItems();
  }, [loadInitialItems]);

  // Backward-compatible: expose items as both `items` and `fragments`
  return {
    items,
    fragments: items,
    loading,
    error,
    hasMore,
    loadMore: loadMoreItems,
    refresh,
    filters,
    applyFilters
  };
};

export default useFeedData;
