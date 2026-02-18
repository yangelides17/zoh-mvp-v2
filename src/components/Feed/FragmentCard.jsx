/**
 * FragmentCard Component
 *
 * Individual fragment card in the feed
 * Displays fragment as video embed, interactive HTML article, or screenshot
 */

import React from 'react';
import FragmentImage from './FragmentImage';
import VideoEmbed from './VideoEmbed';
import VideoCardEmbed from './VideoCardEmbed';
import ArticleEmbed, { isArticleArchetype } from './ArticleEmbed';
import { parseVideoUrl } from '../../utils/videoParser';

const FragmentCard = ({ fragment, index }) => {
  const handleClick = (e) => {
    // Prevent opening source URL if user clicked on video iframe
    if (e.target.tagName === 'IFRAME' || e.target.closest('.video-embed-container')) {
      return;
    }

    // Prevent opening source URL if user is interacting with article content
    if (e.target.closest('.article-embed-container')) {
      return;
    }

    // Prevent opening source URL if user clicked on video card embed
    if (e.target.closest('.video-card-embed-container')) {
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
  const videoData = fragment.archetype === 'video_player'
    ? parseVideoUrl(fragment.url)
    : null;

  // Check if this is a video_card with HTML or cached destination URL
  const isVideoCard = fragment.archetype === 'video_card'
    && (fragment.has_html || fragment.destination_url);

  // Check if this is an article-type archetype with HTML available
  const isArticle = isArticleArchetype(fragment.archetype) && fragment.has_html;

  return (
    <div
      className={`fragment-card ${fragment.archetype}`}
      data-index={index}
      data-fragment-id={fragment.fragment_id}
    >
      <div className="fragment-card-content" onClick={handleClick}>
        {/* Four-way routing: VideoEmbed → VideoCardEmbed → ArticleEmbed → FragmentImage */}
        {videoData ? (
          <VideoEmbed
            embedUrl={videoData.embedUrl}
            platform={videoData.platform}
            domain={fragment.domain}
            archetype={fragment.archetype}
          />
        ) : isVideoCard ? (
          <VideoCardEmbed
            fragmentId={fragment.fragment_id}
            archetype={fragment.archetype}
            domain={fragment.domain}
            destinationUrl={fragment.destination_url}
          />
        ) : isArticle ? (
          <ArticleEmbed
            fragmentId={fragment.fragment_id}
            archetype={fragment.archetype}
            domain={fragment.domain}
            url={fragment.url}
            hasHtml={fragment.has_html}
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
