/**
 * FragmentCard Component
 *
 * Individual fragment card in the feed.
 * Displays fragment as video embed, interactive HTML article, or screenshot.
 * Long-press triggers a tile-based deep-dive chat (desktop only).
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import FragmentImage from './FragmentImage';
import MediaEmbed from './MediaEmbed';
import MediaCardEmbed from './MediaCardEmbed';
import ArticleEmbed, { isHtmlEmbedArchetype } from './ArticleEmbed';
import DeepDiveTiles from './DeepDiveTiles';

import { parseMediaUrl } from '../../utils/mediaParser';
import { useEngagement } from '../../hooks/useEngagement';
import useLongPress from '../../hooks/useLongPress';
import { sendReaction } from '../../services/api';
import { FEATURES } from '../../utils/features';

const ANNOTATION_COLORS = {
  note: '#5b9eff',
  trending: '#fbbf24',
  related: '#a78bfa',
  connection: '#34d399',
};

const FragmentCard = ({ fragment, index, lensSurfaced = false, annotations = [], isDesktop = false }) => {
  const cardRef = useRef(null);
  const engagement = useEngagement();
  const [deepDiveActive, setDeepDiveActive] = useState(false);
  const [reacted, setReacted] = useState(false);
  const lastTapRef = useRef(0);

  // Long-press to trigger deep-dive
  const handleLongPress = useCallback(() => {
    if (!FEATURES.DEEP_DIVE || !isDesktop) return;
    setDeepDiveActive(true);
  }, [isDesktop]);

  const {
    onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
    pressing, longPressFiredRef,
  } = useLongPress(handleLongPress, { delay: 500 });

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

  // Dismiss deep-dive when card scrolls out of view
  useEffect(() => {
    if (!deepDiveActive || !cardRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          setDeepDiveActive(false);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [deepDiveActive]);

  // Dismiss deep-dive on Escape
  useEffect(() => {
    if (!deepDiveActive) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setDeepDiveActive(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [deepDiveActive]);

  const handleClick = (e) => {
    // Suppress click after long-press
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }

    // Track click engagement
    if (engagement) {
      engagement.onClick(fragment.fragment_id);
    }

    // Double-tap detection — "more like this" reaction
    const now = Date.now();
    if (now - lastTapRef.current < 400) {
      // Double-tap detected
      if (!reacted) {
        setReacted(true);
        sendReaction(fragment.fragment_id, fragment.archetype, fragment.domain);
        // Brief visual feedback, then reset
        setTimeout(() => setReacted(false), 2000);
      }
      lastTapRef.current = 0;
      return; // Don't navigate on double-tap
    }
    lastTapRef.current = now;

    // Prevent opening source URL if user clicked on media iframe
    if (e.target.tagName === 'IFRAME' || e.target.closest('.media-embed-container')) {
      return;
    }
    if (e.target.closest('.article-embed-container')) return;
    if (e.target.closest('.media-card-embed-container')) return;

    // Don't navigate when deep-dive is active
    if (deepDiveActive) return;

    // Open source URL in new tab (delayed to distinguish from double-tap)
    setTimeout(() => {
      if (lastTapRef.current !== 0 && fragment.url) {
        window.open(fragment.url, '_blank', 'noopener,noreferrer');
      }
    }, 400);
  };

  // Format archetype for display
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

  const cardClasses = [
    'fragment-card',
    fragment.archetype,
    lensSurfaced && 'lens-surfaced',
    deepDiveActive && 'deep-dive-active',
    pressing && 'long-press-active',
    reacted && 'reaction-active',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={cardRef}
      className={cardClasses}
      data-index={index}
      data-fragment-id={fragment.fragment_id}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {/* Left: fragment content */}
      <div className="fragment-content-pane">
        <div className="fragment-card-content" onClick={handleClick}>
          {/* Lens surfaced badge */}
          {lensSurfaced && (
            <div className="lens-surfaced-badge">SURFACED</div>
          )}
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

          {/* Reaction feedback */}
          {reacted && (
            <div className="reaction-feedback">
              <span className="reaction-heart">More like this</span>
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
              {fragment.site_name || fragment.domain}
              {fragment.author && <span className="fragment-author"> · {fragment.author}</span>}
            </div>
            {fragment.content_summary && (
              <div className="fragment-summary">{fragment.content_summary}</div>
            )}
          </div>

          {/* Click hint */}
          <div className="fragment-hint">
            <span className="hint-icon">↗</span>
            <span className="hint-text">{deepDiveActive ? '' : FEATURES.DEEP_DIVE ? 'Hold to deep-dive' : 'Click to open source'}</span>
          </div>

          {/* Annotations overlay */}
          {annotations.length > 0 && (
            <div className="fragment-annotations">
              {annotations.map((ann, i) => (
                <div
                  key={i}
                  className={`fragment-annotation annotation-${ann.type || 'note'}`}
                >
                  <span
                    className="annotation-dot"
                    style={{ background: ANNOTATION_COLORS[ann.type] || ANNOTATION_COLORS.note }}
                  />
                  <span className="annotation-text">{ann.text}</span>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Right: tile-based chat (only when deep-dive active) */}
      {FEATURES.DEEP_DIVE && deepDiveActive && (
        <DeepDiveTiles
          fragment={{
            fragment_id: fragment.fragment_id,
            page_id: null,
            archetype: fragment.archetype,
            domain: fragment.domain,
            url: fragment.url,
          }}
          onClose={() => setDeepDiveActive(false)}
        />
      )}
    </div>
  );
};

export default FragmentCard;
