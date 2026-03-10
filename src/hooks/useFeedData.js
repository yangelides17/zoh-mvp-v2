/**
 * useFeedData Hook
 *
 * Manages feed data fetching with embedding-based recommendations.
 * Uses exclusion-based pagination: tracks shown item IDs and sends them
 * to the backend so each loadMore returns fresh, scored content.
 *
 * Also fetches agent cards and fragment annotations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchArticles, fetchAgentCards, fetchAnnotations, getAnonymousId } from '../services/api';

/**
 * Collect all unique item IDs from a list of feed items.
 * Articles use page_id, standalone fragments use fragment_id.
 */
const collectItemIds = (items) => {
  const ids = new Set();
  for (const item of items) {
    if (item.type === 'article' && item.page_id) {
      ids.add(item.page_id);
      // Also track individual fragment IDs within articles
      for (const frag of (item.fragments || [])) {
        if (frag.fragment_id) ids.add(frag.fragment_id);
      }
    } else if (item.fragment_id) {
      ids.add(item.fragment_id);
    }
  }
  return ids;
};

export const useFeedData = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [profileWarmth, setProfileWarmth] = useState(0);

  // Track all shown item IDs for exclusion-based pagination
  const shownIdsRef = useRef(new Set());

  // Agent-generated feed cards
  const [agentPushCards, setAgentPushCards] = useState([]);

  // Fragment annotations (map: fragment_id -> annotation[])
  const [annotations, setAnnotations] = useState({});

  // Active filters
  const [filters, setFilters] = useState({
    domains: [],
    archetypes: [],
    pages: [],
    source: 'all',
    search: ''
  });

  // Trigger for reloading (incremented on refresh/filter change)
  const [loadTrigger, setLoadTrigger] = useState(0);

  /**
   * Load initial feed items (recommendation mode with anonymous_id)
   */
  const loadInitialItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Clear shown IDs for fresh load
    shownIdsRef.current = new Set();

    const anonymousId = getAnonymousId();

    try {
      const [data, cardsData] = await Promise.all([
        fetchArticles(
          20, null,
          filters.domains, filters.archetypes, null,
          false, filters.source, filters.pages, filters.search,
          anonymousId, ''
        ),
        fetchAgentCards(10),
      ]);

      const newItems = data.items || [];
      setItems(newItems);
      setHasMore(data.has_more);
      setProfileWarmth(data.profile_warmth || 0);

      // Track shown IDs
      const newIds = collectItemIds(newItems);
      newIds.forEach(id => shownIdsRef.current.add(id));

      // Log debug info in development
      if (process.env.NODE_ENV === 'development' && data._debug_summary) {
        console.log('[RECO] Feed loaded:', {
          warmth: data.profile_warmth,
          items: newItems.length,
          debug: data._debug_summary,
        });
      }

      // Map agent cards to feed-compatible shape
      const mappedCards = (cardsData.cards || []).map(c => {
        const base = {
          type: 'agent-push',
          id: `agent-push-${c.id}`,
          cardId: c.id,
          card_type: c.card_type,
          title: c.title,
          response: c.body,
          priority: c.priority,
          source_fragment_ids: c.source_fragment_ids,
          source_domains: c.source_domains,
          created_at: c.created_at,
        };

        // Prompt card fields
        if (c.card_type === 'prompt') {
          base.type = 'prompt';
          base.actions = c.actions || [];
          base.allows_input = c.allows_input || false;
          base.input_placeholder = c.input_placeholder || '';
          base.body = c.body;
        }

        return base;
      });
      setAgentPushCards(mappedCards);

      // Fetch annotations for visible fragment IDs
      const fragmentIds = newItems
        .filter(item => item.fragment_id)
        .map(item => item.fragment_id);
      if (fragmentIds.length > 0) {
        const annData = await fetchAnnotations(fragmentIds);
        setAnnotations(annData.annotations || {});
      }
    } catch (err) {
      setError(err.message || 'Failed to load feed');
      console.error('Error loading initial feed items:', err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.domains, filters.archetypes, filters.pages, filters.source, filters.search, loadTrigger]);

  /**
   * Load more feed items (for infinite scroll)
   * Sends exclude_ids so backend returns fresh, scored content
   */
  const loadMoreItems = useCallback(async () => {
    if (!hasMore || loading) return;

    setLoading(true);
    setError(null);

    const anonymousId = getAnonymousId();
    const excludeIds = Array.from(shownIdsRef.current).join(',');

    try {
      const data = await fetchArticles(
        20, null,
        filters.domains, filters.archetypes, null,
        false, filters.source, filters.pages, filters.search,
        anonymousId, excludeIds
      );

      const newItems = data.items || [];
      setItems(prev => [...prev, ...newItems]);
      setHasMore(data.has_more);
      setProfileWarmth(data.profile_warmth || 0);

      // Track new shown IDs
      const newIds = collectItemIds(newItems);
      newIds.forEach(id => shownIdsRef.current.add(id));

      // Log debug info in development
      if (process.env.NODE_ENV === 'development' && data._debug_summary) {
        console.log('[RECO] Load more:', {
          warmth: data.profile_warmth,
          newItems: newItems.length,
          totalShown: shownIdsRef.current.size,
          debug: data._debug_summary,
        });
      }

      // Fetch annotations for new fragment IDs
      const fragmentIds = newItems
        .filter(item => item.fragment_id)
        .map(item => item.fragment_id);
      if (fragmentIds.length > 0) {
        const annData = await fetchAnnotations(fragmentIds);
        if (annData.annotations) {
          setAnnotations(prev => ({ ...prev, ...annData.annotations }));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load more items');
      console.error('Error loading more feed items:', err);
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, filters.domains, filters.archetypes, filters.pages, filters.source, filters.search]);

  /**
   * Apply new filters and reload feed
   */
  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setHasMore(true);
    setLoadTrigger(prev => prev + 1);
  }, []);

  /**
   * Refresh feed (reload from beginning with fresh scoring)
   */
  const refresh = useCallback(() => {
    setHasMore(true);
    setLoadTrigger(prev => prev + 1);
  }, []);

  // Load initial items on mount and when filters/trigger change
  useEffect(() => {
    loadInitialItems();
  }, [loadInitialItems]);

  // Backward-compatible: expose items as both `items` and `fragments`
  return {
    items,
    fragments: items,
    agentPushCards,
    annotations,
    loading,
    error,
    hasMore,
    loadMore: loadMoreItems,
    refresh,
    filters,
    applyFilters,
    profileWarmth,
  };
};

export default useFeedData;
