/**
 * FragmentCard Component
 *
 * Individual fragment card in the feed
 * Displays fragment as video embed, interactive HTML article, or screenshot
 */

import React, { useRef, useEffect } from 'react';
import FragmentImage from './FragmentImage';
import MediaEmbed from './MediaEmbed';
import MediaCardEmbed from './MediaCardEmbed';
import ArticleEmbed, { isHtmlEmbedArchetype } from './ArticleEmbed';
import { parseMediaUrl } from '../../utils/mediaParser';
import { useEngagement } from '../../hooks/useEngagement';

const FragmentCard = ({ fragment, index }) => {
  const cardRef = useRef(null);
  const engagement = useEngagement();

  // Visibility / dwell tracking
  useEffect(() => {
    if (!engagement || !cardRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          engagement.onVisible(fragment.fragment_id, entry.intersectionRatio);
        } else {
          engagement.onHidden(fragment.fragment_id);
        }
      },
      { threshold: [0, 0.5, 1.0] }
    );

    observer.observe(cardRef.current);

    return () => {
      observer.disconnect();
      engagement.onHidden(fragment.fragment_id);
    };
  }, [fragment.fragment_id, engagement]);

  const handleClick = (e) => {
    // Track click engagement
    if (engagement) {
      engagement.onClick(fragment.fragment_id);
    }

    // Prevent opening source URL if user clicked on media iframe
    if (e.target.tagName === 'IFRAME' || e.target.closest('.media-embed-container')) {
      return;
    }

    // Prevent opening source URL if user is interacting with article content
    if (e.target.closest('.article-embed-container')) {
      return;
    }

    // Prevent opening source URL if user clicked on media card embed
    if (e.target.closest('.media-card-embed-container')) {
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

  // Parse media URL for video_player/audio_player archetypes
  const isMediaPlayer = ['video_player', 'audio_player'].includes(fragment.archetype);
  const mediaData = isMediaPlayer ? parseMediaUrl(fragment.url) : null;

  // Check if this is a video_card/audio_card with HTML or cached destination URL
  const isMediaCard = ['video_card', 'audio_card'].includes(fragment.archetype)
    && (fragment.has_html || fragment.destination_url);

  // Check if this archetype should render via shadow DOM + cleaned HTML
  const isHtmlEmbed = isHtmlEmbedArchetype(fragment.archetype) && fragment.has_html;

  return (
    <div
      ref={cardRef}
      className={`fragment-card ${fragment.archetype}`}
      data-index={index}
      data-fragment-id={fragment.fragment_id}
    >
      <div className="fragment-card-content" onClick={handleClick}>
        {/* Four-way routing: MediaEmbed → MediaCardEmbed → ArticleEmbed → FragmentImage */}
        {mediaData ? (
          <MediaEmbed
            embedUrl={mediaData.embedUrl}
            platform={mediaData.platform}
            domain={fragment.domain}
            archetype={fragment.archetype}
          />
        ) : isMediaCard ? (
          <MediaCardEmbed
            fragmentId={fragment.fragment_id}
            archetype={fragment.archetype}
            domain={fragment.domain}
            destinationUrl={fragment.destination_url}
          />
        ) : isHtmlEmbed ? (
          <ArticleEmbed
            fragmentId={fragment.fragment_id}
            archetype={fragment.archetype}
            domain={fragment.domain}
            url={fragment.url}
            hasHtml={fragment.has_html}
            bbox={fragment.bbox}
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
