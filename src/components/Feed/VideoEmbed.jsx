/**
 * VideoEmbed Component
 *
 * Renders video iframes with lazy loading for YouTube and Vimeo embeds.
 * Uses IntersectionObserver to only load videos when they come into viewport,
 * optimizing performance for feeds with many videos.
 */

import React, { useState, useEffect, useRef } from 'react';
import './VideoEmbed.css';

const VideoEmbed = ({ embedUrl, platform, domain, archetype }) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef(null);

  // Lazy load iframe using IntersectionObserver
  // Only loads when video container is within 500px of viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
        }
      },
      {
        rootMargin: '500px', // Load when within 500px of viewport
        threshold: 0.01 // Trigger as soon as 1% is visible
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, []);

  const handleError = () => {
    setHasError(true);
  };

  // Error state: invalid embed URL
  if (!embedUrl) {
    return (
      <div className="video-error">
        <p>Video embed URL not available</p>
        <p className="video-platform-info">From {domain}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="video-embed-container">
      {!shouldLoad ? (
        // Placeholder shown before video loads
        <div className="video-placeholder">
          <div className="video-loading-skeleton">
            <div className="play-icon">▶</div>
            <div className="platform-badge">{platform}</div>
          </div>
        </div>
      ) : hasError ? (
        // Error state: video failed to load
        <div className="video-error">
          <p>Unable to load video</p>
          <p className="video-platform-info">
            {platform} video from {domain}
          </p>
        </div>
      ) : (
        // Actual video iframe
        <iframe
          src={embedUrl}
          className="video-embed-iframe"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          frameBorder="0"
          title={`${platform} video from ${domain} - ${archetype}`}
          onError={handleError}
        />
      )}
    </div>
  );
};

export default VideoEmbed;
