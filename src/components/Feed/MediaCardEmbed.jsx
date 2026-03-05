/**
 * MediaCardEmbed Component
 *
 * Orchestrates video_card/audio_card fragment rendering:
 * 1. If destination_url is cached → parse and render MediaEmbed immediately
 * 2. Otherwise, lazy-fetch HTML → extract URL → render MediaEmbed + cache
 * 3. Falls back to FragmentImage (screenshot) on any failure
 *
 * Follows the same cancelled-flag async pattern as ArticleEmbed.
 */

import React, { useState, useEffect, useRef } from 'react';
import MediaEmbed from './MediaEmbed';
import FragmentImage from './FragmentImage';
import { fetchFragmentHtml, cacheDestinationUrl } from '../../services/api';
import { parseMediaUrl } from '../../utils/mediaParser';
import { extractMediaUrl } from '../../utils/extractMediaUrl';
import './MediaCardEmbed.css';

const MediaCardEmbed = ({ fragmentId, archetype, domain, destinationUrl }) => {
  const [mediaData, setMediaData] = useState(null);
  const [fallback, setFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);

  // Fast path: cached destination_url — parse immediately, no fetch needed
  useEffect(() => {
    if (!destinationUrl) return;

    const parsed = parseMediaUrl(destinationUrl);
    if (parsed) {
      setMediaData(parsed);
      setIsLoading(false);
    } else {
      setFallback(true);
      setIsLoading(false);
    }
  }, [destinationUrl]);

  // Slow path: lazy-load HTML, extract URL, cache result
  useEffect(() => {
    // Skip if we already have a cached URL (fast path handled above)
    if (destinationUrl) return;

    let cancelled = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const loadAndExtract = async () => {
          try {
            const data = await fetchFragmentHtml(fragmentId);
            if (cancelled) return;

            const result = extractMediaUrl(data.html);
            if (cancelled) return;

            if (result) {
              setMediaData(result.mediaData);
              setIsLoading(false);

              // Cache for next time (fire-and-forget)
              cacheDestinationUrl(fragmentId, result.url).catch(() => {
                // Caching failure is non-critical
              });
            } else {
              setFallback(true);
              setIsLoading(false);
            }
          } catch {
            if (!cancelled) {
              setFallback(true);
              setIsLoading(false);
            }
          }
        };

        loadAndExtract();
      },
      { rootMargin: '1000px', threshold: 0.01 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [fragmentId, destinationUrl]);

  // Fallback: show screenshot
  if (fallback) {
    return (
      <div className="fragment-image-wrapper">
        <FragmentImage
          fragmentId={fragmentId}
          archetype={archetype}
          domain={domain}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="media-card-embed-container">
      {isLoading ? (
        <div className="media-card-placeholder">
          <div className="media-loading-skeleton">
            <div className="play-icon">&#9654;</div>
            <div className="platform-badge">media</div>
          </div>
        </div>
      ) : mediaData ? (
        <MediaEmbed
          embedUrl={mediaData.embedUrl}
          platform={mediaData.platform}
          domain={domain}
          archetype={archetype}
        />
      ) : null}
    </div>
  );
};

export default MediaCardEmbed;
