/**
 * Feed Component
 *
 * Main TikTok-style vertical scroll feed for fragments
 */

import React, { useEffect, useCallback, useRef } from 'react';
import useFeedData from '../../hooks/useFeedData';
import FragmentCard from './FragmentCard';
import '../../styles/Feed.css';

const Feed = () => {
  const { fragments, loading, error, hasMore, loadMore, refresh } = useFeedData();
  const feedRef = useRef(null);
  const loadMoreThrottleRef = useRef(false);

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (!feedRef.current || loadMoreThrottleRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Load more when scrolled 80% down
    if (scrollPercentage > 0.8 && hasMore && !loading) {
      loadMoreThrottleRef.current = true;
      loadMore();

      // Throttle for 1 second
      setTimeout(() => {
        loadMoreThrottleRef.current = false;
      }, 1000);
    }
  }, [hasMore, loading, loadMore]);

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
      if (!feedRef.current) return;

      const cards = feedRef.current.querySelectorAll('.fragment-card');
      if (cards.length === 0) return;

      // Get card height for scrolling
      const cardHeight = feedRef.current.clientHeight;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        // Scroll to next card
        e.preventDefault();
        feedRef.current.scrollBy({ top: cardHeight, behavior: 'smooth' });
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        // Scroll to previous card
        e.preventDefault();
        feedRef.current.scrollBy({ top: -cardHeight, behavior: 'smooth' });
      } else if (e.key === 'r') {
        // Refresh feed
        e.preventDefault();
        refresh();
        feedRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refresh]);

  // Error state
  if (error && fragments.length === 0) {
    return (
      <div className="feed-error">
        <div className="error-content">
          <div className="error-icon">⚠️</div>
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
  if (loading && fragments.length === 0) {
    return (
      <div className="feed-loading">
        <div className="loading-spinner"></div>
        <p>Loading fragments...</p>
      </div>
    );
  }

  // Empty state
  if (!loading && fragments.length === 0) {
    return (
      <div className="feed-empty">
        <div className="empty-content">
          <div className="empty-icon">📦</div>
          <h2>No Fragments Found</h2>
          <p>No labeled fragments available in the database yet.</p>
          <button onClick={refresh} className="retry-button">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="feed-container" ref={feedRef}>
      {/* Header */}
      <div className="feed-header">
        <h1 className="feed-title">Fragment Feed</h1>
        <div className="feed-controls">
          <button onClick={refresh} className="refresh-button" title="Refresh feed (R)">
            ↻
          </button>
          <div className="fragment-count">
            {fragments.length} fragment{fragments.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Fragment Cards */}
      <div className="feed-content">
        {fragments.map((fragment, index) => (
          <FragmentCard
            key={fragment.fragment_id}
            fragment={fragment}
            index={index}
          />
        ))}
      </div>

      {/* Loading More Indicator */}
      {loading && fragments.length > 0 && (
        <div className="feed-loading-more">
          <div className="loading-spinner-small"></div>
          <span>Loading more...</span>
        </div>
      )}

      {/* End of Feed */}
      {!hasMore && fragments.length > 0 && (
        <div className="feed-end">
          <p>You've reached the end!</p>
          <button onClick={refresh} className="retry-button">
            Back to Top
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="keyboard-hints">
        <span className="hint-item">↑/↓ or J/K: Navigate</span>
        <span className="hint-item">R: Refresh</span>
      </div>
    </div>
  );
};

export default Feed;
