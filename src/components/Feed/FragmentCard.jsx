/**
 * FragmentCard Component
 *
 * Individual fragment card in the feed
 * Displays fragment screenshot or video embed and metadata
 */

import React from 'react';
import FragmentImage from './FragmentImage';
import VideoEmbed from './VideoEmbed';
import { parseVideoUrl } from '../../utils/videoParser';

const FragmentCard = ({ fragment, index }) => {
  const handleClick = (e) => {
    // Prevent opening source URL if user clicked on video iframe
    // This allows video controls to work without navigating away
    if (e.target.tagName === 'IFRAME' || e.target.closest('.video-embed-container')) {
      return;
    }

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

  // Parse video URL for video_player archetype
  // Returns null if not a video or not a supported platform
  const videoData = fragment.archetype === 'video_player'
    ? parseVideoUrl(fragment.url)
    : null;

  return (
    <div
      className={`fragment-card ${fragment.archetype}`}
      data-index={index}
      data-fragment-id={fragment.fragment_id}
    >
      <div className="fragment-card-content" onClick={handleClick}>
        {/* Conditional rendering: VideoEmbed for videos, FragmentImage for others */}
        {videoData ? (
          <VideoEmbed
            embedUrl={videoData.embedUrl}
            platform={videoData.platform}
            domain={fragment.domain}
            archetype={fragment.archetype}
          />
        ) : (
          <div className="fragment-image-wrapper">
            <FragmentImage
              fragmentId={fragment.fragment_id}
              archetype={fragment.archetype}
              domain={fragment.domain}
            />
          </div>
        )}

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
