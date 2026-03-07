/**
 * LensOverlay Component
 *
 * Shows query results as a compact overlay above the feed when a lens is active.
 * Displays the query, loading state, agent commentary, and surfaced fragment count.
 */

import React from 'react';
import './LensOverlay.css';

const LensOverlay = ({ lens, onClear }) => {
  if (!lens) return null;

  const surfacedCount = lens.surfacedFragments?.length || 0;

  return (
    <div className="lens-overlay">
      <div className="lens-content">
        {/* Query header */}
        <div className="lens-header">
          <div className="lens-query-row">
            <svg className="lens-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <span className="lens-query-text">"{lens.query}"</span>
          </div>
          <button className="lens-close-btn" onClick={onClear} title="Clear (Esc)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Loading state */}
        {lens.loading && (
          <div className="lens-loading">
            <div className="lens-loading-dots">
              <span /><span /><span />
            </div>
            <span className="lens-loading-text">Zoh is searching...</span>
          </div>
        )}

        {/* Error state */}
        {lens.error && (
          <div className="lens-error">
            {lens.error}
          </div>
        )}

        {/* Response */}
        {lens.response && (
          <div className="lens-response">
            <div className="lens-badge">ZOH</div>
            <div className="lens-response-text">{lens.response}</div>
          </div>
        )}

        {/* Surfaced count */}
        {surfacedCount > 0 && (
          <div className="lens-surfaced-count">
            {surfacedCount} fragment{surfacedCount !== 1 ? 's' : ''} surfaced below
          </div>
        )}
      </div>
    </div>
  );
};

export default LensOverlay;
