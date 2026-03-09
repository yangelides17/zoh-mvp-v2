/**
 * Feed Component
 *
 * TikTok-style vertical scroll feed with ambient agent integration.
 * SpotlightBar for user queries, LensOverlay for agent responses.
 * Long-press a fragment for tile-based deep-dive chat.
 */

import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import useFeedData from '../../hooks/useFeedData';
import useFeedLens from '../../hooks/useFeedLens';
import { EngagementProvider } from '../../hooks/useEngagement';
import { fetchChatConfig, generateFeedCards, dismissAgentCard } from '../../services/api';
import FragmentCard from './FragmentCard';
import AssembledArticle from './AssembledArticle';
import AgentCard from './AgentCard';
import PromptCard from './PromptCard';
import SpotlightBar from './SpotlightBar';
import LensOverlay from './LensOverlay';
import FilterBar from './FilterBar';
import { FEATURES } from '../../utils/features';
import '../../styles/Feed.css';

const Feed = () => {
  const { items, agentPushCards, annotations, loading, error, hasMore, loadMore, refresh, filters, applyFilters } = useFeedData();
  const { lens, activateLens, clearLens, isLensActive } = useFeedLens();
  const feedRef = useRef(null);
  const loadMoreThrottleRef = useRef(false);

  // Active fragment tracking
  const [activeFragment, setActiveFragment] = useState(null);
  const activeFragmentRef = useRef(null);

  // Chat mode: 'openclaw' or 'direct'
  const [chatMode, setChatMode] = useState('direct');

  // Card generation state
  const [generatingCards, setGeneratingCards] = useState(false);

  // Desktop detection (for passing to cards)
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 769px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Fetch chat mode on mount
  useEffect(() => {
    fetchChatConfig().then(config => setChatMode(config.mode || 'direct'));
  }, []);

  // Surfaced fragments fetched by useFeedLens (full fragment data)
  const surfacedFragments = useMemo(() => lens?.surfacedFragments || [], [lens?.surfacedFragments]);
  const surfacedIds = useMemo(() => {
    return new Set(surfacedFragments.map(f => f.fragment_id));
  }, [surfacedFragments]);

  // Build merged items: surfaced fragments at top (if lens), then push cards, then web content
  const mergedItems = useMemo(() => {
    const result = [];

    // Surfaced fragments at top (fetched directly by useFeedLens)
    surfacedFragments.forEach(frag => {
      result.push({ ...frag, _lensSurfaced: true });
    });

    // Sort push cards by priority descending
    const pushCards = [...(agentPushCards || [])].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    let pushIndex = 0;

    // Insert high-priority push cards at top
    while (pushIndex < pushCards.length && (pushCards[pushIndex].priority || 0) >= 0.8) {
      result.push(pushCards[pushIndex++]);
    }

    // Interleave web content with remaining push cards (skip duplicates already surfaced)
    items.forEach((item, i) => {
      if (item.fragment_id && surfacedIds.has(item.fragment_id)) return;

      result.push(item);

      if (pushIndex < pushCards.length && (i + 1) % 3 === 0) {
        result.push(pushCards[pushIndex++]);
      }
    });

    while (pushIndex < pushCards.length) {
      result.push(pushCards[pushIndex++]);
    }

    return result;
  }, [items, agentPushCards, surfacedFragments, surfacedIds]);

  // Get fragment info from an item for tracking
  const getFragmentInfo = useCallback((item) => {
    if (!item || item.type === 'agent' || item.type === 'agent-push') return null;
    if (item.type === 'article') {
      return {
        fragment_id: null,
        page_id: item.page_id,
        archetype: 'article',
        domain: item.domain,
        url: item.url,
      };
    }
    return {
      fragment_id: item.fragment_id,
      page_id: null,
      archetype: item.archetype,
      domain: item.domain,
      url: item.url,
    };
  }, []);

  // Handle scroll for infinite loading + active fragment tracking
  const handleScroll = useCallback(() => {
    if (!feedRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;

    if (mergedItems.length > 0) {
      const activeIndex = Math.round(scrollTop / clientHeight);
      const activeItem = mergedItems[activeIndex];

      if (activeItem && activeItem.type !== 'agent' && activeItem.type !== 'agent-push') {
        const info = getFragmentInfo(activeItem);
        if (info) {
          activeFragmentRef.current = info;
          setActiveFragment(info);
        }
      }
    }

    if (loadMoreThrottleRef.current) return;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    if (scrollPercentage > 0.8 && hasMore && !loading) {
      loadMoreThrottleRef.current = true;
      loadMore();
      setTimeout(() => { loadMoreThrottleRef.current = false; }, 1000);
    }
  }, [hasMore, loading, loadMore, mergedItems, getFragmentInfo]);

  // Attach scroll listener
  useEffect(() => {
    const feedElement = feedRef.current;
    if (feedElement) {
      feedElement.addEventListener('scroll', handleScroll);
      return () => feedElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      if (!feedRef.current) return;

      const cardHeight = feedRef.current.clientHeight;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        feedRef.current.scrollBy({ top: cardHeight, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        feedRef.current.scrollBy({ top: -cardHeight, behavior: 'smooth' });
      } else if (e.key === 'r') {
        e.preventDefault();
        refresh();
        feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (e.key === 'Escape') {
        if (isLensActive) {
          clearLens();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refresh, isLensActive, clearLens]);

  // Scroll to top when filters change
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTo({ top: 0 });
    }
  }, [filters]);

  // Handle spotlight query submit
  const handleSpotlightSubmit = useCallback((query) => {
    const currentFragment = activeFragmentRef.current;
    activateLens(
      query,
      currentFragment?.fragment_id || null,
      currentFragment?.page_id || null,
    );
    if (feedRef.current) {
      feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activateLens]);

  // Generate agent insights
  const handleGenerateInsights = useCallback(async () => {
    setGeneratingCards(true);
    try {
      await generateFeedCards(3);
      refresh();
    } catch (err) {
      console.error('Failed to generate insights:', err);
    } finally {
      setGeneratingCards(false);
    }
  }, [refresh]);

  // Dismiss an agent push card
  const handleDismissCard = useCallback(async (cardId) => {
    try {
      await dismissAgentCard(cardId);
      refresh();
    } catch (err) {
      console.error('Failed to dismiss card:', err);
    }
  }, [refresh]);

  // Handle prompt card action completion
  const handlePromptActionComplete = useCallback((result) => {
    if (result?.feed_actions?.some(a => a.type === 'surface')) {
      refresh();
    } else {
      refresh();
    }
  }, [refresh]);

  // Error state
  if (error && items.length === 0) {
    return (
      <div className="feed-error">
        <div className="error-content">
          <div className="error-icon">!</div>
          <h2>Error Loading Feed</h2>
          <p>{error}</p>
          <button onClick={refresh} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading initial state
  if (loading && items.length === 0) {
    return (
      <div className="feed-loading">
        <div className="loading-spinner"></div>
        <p>Loading fragments...</p>
      </div>
    );
  }

  // Check if any filters are active
  const hasActiveFilters = filters.domains.length > 0 || filters.archetypes.length > 0 ||
    filters.pages.length > 0 || filters.curated || filters.source !== 'all' ||
    (filters.search && filters.search.trim() !== '');

  const clearAllFilters = () => {
    applyFilters({ domains: [], archetypes: [], pages: [], curated: false, source: 'all', search: '' });
  };

  // Empty state
  if (!loading && items.length === 0) {
    return (
      <div className="feed-empty">
        <div className="empty-content">
          <div className="empty-icon">...</div>
          <h2>No Fragments Found</h2>
          <p>{hasActiveFilters ? 'No fragments match your current filters.' : 'No labeled fragments available in the database yet.'}</p>
          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="retry-button">
              Clear Filters
            </button>
          )}
          <button onClick={refresh} className="retry-button">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <EngagementProvider feedRef={feedRef}>
      <div className="feed-container" ref={feedRef}>
        {/* Header */}
        <div className="feed-header">
          <div className="feed-branding">
            <h1 className="feed-title">ZOH Feed</h1>
            <div className="live-indicator">
              <div className="live-dot"></div>
              <span className="live-text">LIVE</span>
            </div>
          </div>

          {/* Filter Bar + Generate */}
          <div className="feed-header-controls">
            {FEATURES.FILTER_BAR && (
              <FilterBar
                onApplyFilters={applyFilters}
                currentFilters={filters}
              />
            )}
            {FEATURES.GENERATE_INSIGHTS && (
              <button
                className="generate-insights-btn"
                onClick={handleGenerateInsights}
                disabled={generatingCards}
              >
                {generatingCards ? 'Generating...' : 'Generate Insights'}
              </button>
            )}
          </div>
        </div>

        {/* Spotlight Bar */}
        {FEATURES.SPOTLIGHT && (
          <SpotlightBar
            onSubmit={handleSpotlightSubmit}
            isLoading={lens?.loading || false}
            activeFragment={activeFragment}
            chatMode={chatMode}
          />
        )}

        {/* Lens Overlay */}
        {FEATURES.SPOTLIGHT && (
          <LensOverlay
            lens={lens}
            onClear={clearLens}
          />
        )}

        {/* Feed Items */}
        <div className="feed-content">
          {mergedItems.map((item, index) => (
            item.type === 'prompt' ? (
              <PromptCard
                key={item.id}
                card={item}
                onDismiss={() => handleDismissCard(item.cardId)}
                onActionComplete={handlePromptActionComplete}
              />
            ) : item.type === 'agent-push' ? (
              <AgentCard
                key={item.id}
                response={item.response}
                cardType={item.card_type}
                title={item.title}
                sourceDomains={item.source_domains}
                onDismiss={() => handleDismissCard(item.cardId)}
              />
            ) : item.type === 'article' ? (
              <AssembledArticle
                key={`article-${item.article_id}`}
                article={item}
                isDesktop={isDesktop}
              />
            ) : (
              <FragmentCard
                key={item.fragment_id}
                fragment={item}
                index={index}
                lensSurfaced={item._lensSurfaced}
                annotations={[
                  ...(annotations[item.fragment_id] || []),
                  ...(item._lensAnnotation ? [{ text: item._lensAnnotation, type: 'note' }] : []),
                ]}
                isDesktop={isDesktop}
              />
            )
          ))}
        </div>

        {/* Loading More Indicator */}
        {loading && items.length > 0 && (
          <div className="feed-loading-more">
            <div className="loading-spinner-small"></div>
            <span>Loading more...</span>
          </div>
        )}

        {/* End of Feed */}
        {!hasMore && items.length > 0 && (
          <div className="feed-end">
            <p>You've reached the end!</p>
            <button onClick={refresh} className="retry-button">
              Back to Top
            </button>
          </div>
        )}
      </div>
    </EngagementProvider>
  );
};

export default Feed;
