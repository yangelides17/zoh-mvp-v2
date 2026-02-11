/**
 * FragmentCard Component
 *
 * Individual fragment card in the feed
 * Displays fragment screenshot and metadata
 */

import React from 'react';
import FragmentImage from './FragmentImage';

const FragmentCard = ({ fragment, index }) => {
  const handleClick = () => {
    // Open source URL in new tab
    if (fragment.url) {
      window.open(fragment.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Format archetype for display (convert snake_case to Title Case)
  const formatArchetype = (archetype) => {
    if (!archetype) return 'Fragment';
    return archetype
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="fragment-card" data-index={index}>
      <div className="fragment-card-content" onClick={handleClick}>
        {/* Fragment Screenshot */}
        <div className="fragment-image-wrapper">
          <FragmentImage
            fragmentId={fragment.fragment_id}
            archetype={fragment.archetype}
            domain={fragment.domain}
          />
        </div>

        {/* Fragment Metadata */}
        <div className="fragment-metadata">
          {fragment.archetype && (
            <div className="fragment-archetype-badge">
              {formatArchetype(fragment.archetype)}
            </div>
          )}
          <div className="fragment-domain">
            {fragment.domain}
          </div>
        </div>

        {/* Click hint */}
        <div className="fragment-hint">
          <span className="hint-icon">↗</span>
          <span className="hint-text">Click to open source</span>
        </div>
      </div>
    </div>
  );
};

export default FragmentCard;
