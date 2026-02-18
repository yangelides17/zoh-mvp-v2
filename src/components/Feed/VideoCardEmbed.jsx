/**
 * VideoCardEmbed Component
 *
 * Orchestrates video_card fragment rendering:
 * 1. If destination_url is cached → parse and render VideoEmbed immediately
 * 2. Otherwise, lazy-fetch HTML → extract URL → render VideoEmbed + cache
 * 3. Falls back to FragmentImage (screenshot) on any failure
 *
 * Follows the same cancelled-flag async pattern as ArticleEmbed.
 */

import React, { useState, useEffect, useRef } from 'react';
import VideoEmbed from './VideoEmbed';
import FragmentImage from './FragmentImage';
import { fetchFragmentHtml, cacheDestinationUrl } from '../../services/api';
import { parseVideoUrl } from '../../utils/videoParser';
import { extractVideoUrl } from '../../utils/extractVideoUrl';
import './VideoCardEmbed.css';

const VideoCardEmbed = ({ fragmentId, archetype, domain, destinationUrl }) => {
  const [videoData, setVideoData] = useState(null);
  const [fallback, setFallback] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);

  // Fast path: cached destination_url — parse immediately, no fetch needed
  useEffect(() => {
    if (!destinationUrl) return;

    const parsed = parseVideoUrl(destinationUrl);
    if (parsed) {
      setVideoData(parsed);
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

            const result = extractVideoUrl(data.html);
            if (cancelled) return;

            if (result) {
              setVideoData(result.videoData);
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
      { rootMargin: '1500px', threshold: 0.01 }
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
    <div ref={containerRef} className="video-card-embed-container">
      {isLoading ? (
        <div className="video-card-placeholder">
          <div className="video-loading-skeleton">
            <div className="play-icon">&#9654;</div>
            <div className="platform-badge">video</div>
          </div>
        </div>
      ) : videoData ? (
        <VideoEmbed
          embedUrl={videoData.embedUrl}
          platform={videoData.platform}
          domain={domain}
          archetype={archetype}
        />
      ) : null}
    </div>
  );
};

export default VideoCardEmbed;
