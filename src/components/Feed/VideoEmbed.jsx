/**
 * VideoEmbed Component
 *
 * Renders video iframes with lazy loading and autoplay for YouTube and Vimeo embeds.
 * Uses IntersectionObserver to load videos when near viewport and autoplay when centered.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './VideoEmbed.css';

const VideoEmbed = ({ embedUrl, platform, domain, archetype }) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef(null);
  const iframeRef = useRef(null);

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

  // Memoized play/pause/unmute functions to avoid infinite loops in useEffect
  const playVideo = useCallback(() => {
    if (!iframeRef.current) return;

    // Spotify: no autoplay control — their API requires an SDK and auto-playing audio is unwanted
    if (platform === 'spotify') return;

    if (platform === 'youtube') {
      // YouTube iframe API: unmute, seek to beginning, then play
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'unMute', args: '' }),
        '*'
      );
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [0, true] }),
        '*'
      );
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'playVideo', args: '' }),
        '*'
      );
    } else if (platform === 'vimeo') {
      // Vimeo Player API: set volume to 1 (unmuted), seek to 0, then play
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ method: 'setVolume', value: 1 }),
        '*'
      );
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ method: 'setCurrentTime', value: 0 }),
        '*'
      );
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ method: 'play' }),
        '*'
      );
    }
    setIsPlaying(true);
  }, [platform]);

  const pauseVideo = useCallback(() => {
    if (!iframeRef.current) return;

    if (platform === 'youtube') {
      // YouTube iframe API: pause and mute
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
        '*'
      );
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'mute', args: '' }),
        '*'
      );
    } else if (platform === 'vimeo') {
      // Vimeo Player API: pause and mute
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ method: 'pause' }),
        '*'
      );
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ method: 'setVolume', value: 0 }),
        '*'
      );
    }
    setIsPlaying(false);
  }, [platform]);

  // Autoplay/pause based on visibility (TikTok-style)
  // Play when >50% visible, pause when less visible
  useEffect(() => {
    if (!shouldLoad || !iframeRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const shouldPlay = entry.isIntersecting && entry.intersectionRatio > 0.5;

        if (shouldPlay && !isPlaying) {
          playVideo();
        } else if (!shouldPlay && isPlaying) {
          pauseVideo();
        }
      },
      {
        threshold: [0, 0.5, 1] // Trigger at 0%, 50%, and 100% visibility
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
  }, [shouldLoad, isPlaying, playVideo, pauseVideo]);

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
    <div ref={containerRef} className={`video-embed-container ${platform}`}>
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
          ref={iframeRef}
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
