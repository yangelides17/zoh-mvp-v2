/**
 * VideoEmbed Component
 *
 * Renders media embeds with lazy loading and autoplay for YouTube, Vimeo, and Spotify.
 * Uses IntersectionObserver to load media when near viewport and autoplay when centered.
 *
 * Spotify uses the iFrame API SDK via a shared controller pool. The controller moves
 * between embeds as the user scrolls — only the fully-visible embed shows the widget.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  claimController,
  releaseController,
  updateRole,
  playController,
  pauseController,
} from '../../utils/spotifyControllerPool';
import './VideoEmbed.css';

/**
 * Extract spotify URI from embed URL.
 * embedUrl: https://open.spotify.com/embed/{type}/{id}?utm_source=generator
 * returns:  spotify:{type}:{id}
 */
function getSpotifyUri(embedUrl) {
  const match = embedUrl?.match(
    /embed\/(episode|track|playlist|album|show|artist)\/([a-zA-Z0-9]+)/
  );
  return match ? `spotify:${match[1]}:${match[2]}` : null;
}

const VideoEmbed = ({ embedUrl, platform, domain, archetype }) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasController, setHasController] = useState(false);
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const spotifyContainerRef = useRef(null);
  const poolEntryRef = useRef(null);
  const isPlayerReadyRef = useRef(false);
  const isVisibleRef = useRef(false);
  const isPlayingRef = useRef(false);
  const readyTimerRef = useRef(null);

  // Lazy load: render content when within 1000px of viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
        }
      },
      {
        rootMargin: '1000px',
        threshold: 0.01
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Spotify: pre-load zone — claim controller when entering zone, release when leaving
  useEffect(() => {
    if (platform !== 'spotify' || !shouldLoad) return;

    const spotifyUri = getSpotifyUri(embedUrl);
    if (!spotifyUri) return;

    let cancelled = false;
    let claimPending = false;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const inZone = entry.isIntersecting;

        if (inZone && !poolEntryRef.current && !claimPending) {
          claimPending = true;
          const container = spotifyContainerRef.current;
          if (!container) { claimPending = false; return; }

          claimController(container, spotifyUri, 'preload').then((poolEntry) => {
            claimPending = false;
            if (cancelled || !poolEntry) return;
            poolEntryRef.current = poolEntry;
            setHasController(true);
            // If already fully visible when claim resolves, play immediately
            // (the visibility observer won't fire again since the element is already in view)
            if (isVisibleRef.current && !isPlayingRef.current) {
              updateRole(poolEntry, 'visible');
              playController(poolEntry);
            }
          });
        } else if (!inZone && poolEntryRef.current) {
          releaseController(poolEntryRef.current);
          poolEntryRef.current = null;
          isPlayingRef.current = false;
          setIsPlaying(false);
          setHasController(false);
        }
      },
      { rootMargin: '200%', threshold: 0.01 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      cancelled = true;
      observer.disconnect();
      if (poolEntryRef.current) {
        releaseController(poolEntryRef.current);
        poolEntryRef.current = null;
        isPlayingRef.current = false;
        setIsPlaying(false);
        setHasController(false);
      }
    };
  }, [platform, shouldLoad, embedUrl]);

  // Spotify: visibility — play from beginning when fully visible, pause when not
  useEffect(() => {
    if (platform !== 'spotify' || !shouldLoad) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isFullyVisible = entry.isIntersecting && entry.intersectionRatio >= 0.99;

        if (isFullyVisible && poolEntryRef.current) {
          updateRole(poolEntryRef.current, 'visible');
          isVisibleRef.current = true;
          if (!isPlayingRef.current) {
            playController(poolEntryRef.current);
          }
        } else if (!isFullyVisible && poolEntryRef.current) {
          if (poolEntryRef.current.role === 'visible') {
            updateRole(poolEntryRef.current, 'recent');
          }
          isVisibleRef.current = false;
          if (isPlayingRef.current) {
            pauseController(poolEntryRef.current);
            isPlayingRef.current = false;
            setIsPlaying(false);
          }
        }
      },
      { threshold: [0, 0.99] }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [platform, shouldLoad]);

  // Spotify: sync component state with pool entry via callback
  useEffect(() => {
    if (platform !== 'spotify') return;
    const entry = poolEntryRef.current;
    if (!entry) return;

    entry.onPlaybackChange = (playing) => {
      isPlayingRef.current = playing;
      setIsPlaying(playing);
    };
    return () => { if (entry) entry.onPlaybackChange = null; };
  }, [platform, hasController]);

  // YouTube/Vimeo: play (Spotify handled separately)
  const playVideo = useCallback(() => {
    if (!iframeRef.current) return;
    if (platform === 'spotify') return;

    if (platform === 'youtube') {
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
    isPlayingRef.current = true;
  }, [platform]);

  // YouTube/Vimeo: pause (Spotify handled separately)
  const pauseVideo = useCallback(() => {
    if (!iframeRef.current) return;

    if (platform === 'youtube') {
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
        '*'
      );
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ event: 'command', func: 'mute', args: '' }),
        '*'
      );
    } else if (platform === 'vimeo') {
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
    isPlayingRef.current = false;
  }, [platform]);

  // Helper: attempt autoplay only when both visible AND player ready
  const tryAutoplay = useCallback(() => {
    if (isVisibleRef.current && isPlayerReadyRef.current && !isPlayingRef.current) {
      playVideo();
    }
  }, [playVideo]);

  // Listen for player ready messages from YouTube/Vimeo iframes
  useEffect(() => {
    if (!shouldLoad || platform === 'spotify') return;

    const handleMessage = (event) => {
      if (event.source !== iframeRef.current?.contentWindow) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;

        const isYouTubeReady = platform === 'youtube' && data?.event === 'initialDelivery';
        const isVimeoReady = platform === 'vimeo' && data?.event === 'ready';

        if (isYouTubeReady || isVimeoReady) {
          isPlayerReadyRef.current = true;
          if (readyTimerRef.current) {
            clearTimeout(readyTimerRef.current);
            readyTimerRef.current = null;
          }
          tryAutoplay();
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [shouldLoad, platform, tryAutoplay]);

  // Fallback: if postMessage ready event doesn't fire, use iframe onLoad + timer
  const handleIframeLoad = useCallback(() => {
    if (isPlayerReadyRef.current) return;
    readyTimerRef.current = setTimeout(() => {
      if (!isPlayerReadyRef.current) {
        isPlayerReadyRef.current = true;
        tryAutoplay();
      }
    }, 500);
  }, [tryAutoplay]);

  // Reset readiness when embedUrl changes
  useEffect(() => {
    isPlayerReadyRef.current = false;
    if (readyTimerRef.current) {
      clearTimeout(readyTimerRef.current);
      readyTimerRef.current = null;
    }
  }, [embedUrl]);

  // Cleanup ready timer on unmount
  useEffect(() => {
    return () => {
      if (readyTimerRef.current) {
        clearTimeout(readyTimerRef.current);
      }
    };
  }, []);

  // YouTube/Vimeo: autoplay/pause based on visibility
  useEffect(() => {
    if (!shouldLoad) return;
    if (platform === 'spotify') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const shouldPlay = entry.isIntersecting && entry.intersectionRatio > 0.5;
        isVisibleRef.current = shouldPlay;

        if (shouldPlay && !isPlayingRef.current) {
          if (isPlayerReadyRef.current) {
            playVideo();
          }
          // If not ready yet, tryAutoplay() will fire when readiness arrives
        } else if (!shouldPlay && isPlayingRef.current) {
          pauseVideo();
        }
      },
      {
        threshold: [0, 0.5, 1]
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [shouldLoad, playVideo, pauseVideo, platform]);

  const handleError = () => {
    setHasError(true);
  };

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
        <div className="video-placeholder">
          <div className="video-loading-skeleton">
            <div className="play-icon">▶</div>
            <div className="platform-badge">{platform}</div>
          </div>
        </div>
      ) : hasError ? (
        <div className="video-error">
          <p>Unable to load {platform === 'spotify' ? 'audio' : 'video'}</p>
          <p className="video-platform-info">
            {platform} from {domain}
          </p>
        </div>
      ) : platform === 'spotify' ? (
        // Spotify: SDK controller iframe gets reparented into this div when claimed
        <div ref={spotifyContainerRef} className="video-embed-iframe">
          {!hasController && (
            <div className="spotify-placeholder">
              <div className="platform-badge">spotify</div>
            </div>
          )}
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="video-embed-iframe"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          frameBorder="0"
          title={`${platform} video from ${domain} - ${archetype}`}
          onLoad={handleIframeLoad}
          onError={handleError}
        />
      )}
    </div>
  );
};

export default VideoEmbed;
