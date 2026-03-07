/**
 * useFeedLens Hook
 *
 * Manages "lens" state — temporary feed overlay from a user query.
 * When active, the feed shows agent commentary and surfaced fragments at the top.
 * Fetches full fragment data for surfaced IDs so they render in the feed.
 */

import { useState, useCallback, useRef } from 'react';
import { sendAmbientMessage, fetchFragmentsByIds } from '../services/api';

export const useFeedLens = () => {
  const [lens, setLens] = useState(null);
  // null | { query, response, feedActions, surfacedFragments, loading, error }

  const abortRef = useRef(null);

  const activateLens = useCallback(async (query, fragmentId = null, pageId = null) => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.cancelled = true;
    }

    const token = { cancelled: false };
    abortRef.current = token;

    setLens({
      query,
      response: null,
      feedActions: [],
      surfacedFragments: [],
      loading: true,
      error: null,
    });

    try {
      const result = await sendAmbientMessage(
        [{ role: 'user', content: query }],
        fragmentId,
        pageId,
      );

      if (token.cancelled) return;

      if (result.error) {
        setLens(prev => prev ? {
          ...prev,
          loading: false,
          error: result.error,
        } : null);
        return;
      }

      const feedActions = result.feed_actions || [];

      // Extract surfaced fragment IDs from feed actions
      const surfacedIds = [];
      for (const action of feedActions) {
        if (action.type === 'surface' && action.fragment_ids) {
          surfacedIds.push(...action.fragment_ids);
        }
      }

      // Fetch full fragment data for surfaced IDs
      let surfacedFragments = [];
      if (surfacedIds.length > 0) {
        surfacedFragments = await fetchFragmentsByIds(surfacedIds);
      }

      if (token.cancelled) return;

      setLens(prev => prev ? {
        ...prev,
        loading: false,
        response: result.response,
        feedActions,
        surfacedFragments,
      } : null);
    } catch (err) {
      if (token.cancelled) return;
      setLens(prev => prev ? {
        ...prev,
        loading: false,
        error: err.response?.data?.error || err.message || 'Something went wrong',
      } : null);
    }
  }, []);

  const clearLens = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.cancelled = true;
    }
    setLens(null);
  }, []);

  return {
    lens,
    activateLens,
    clearLens,
    isLensActive: lens !== null,
  };
};

export default useFeedLens;
