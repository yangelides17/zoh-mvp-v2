/**
 * Media URL Parser Utility
 *
 * Parses media URLs from supported platforms (YouTube, Vimeo, Spotify) and generates
 * embed URLs for iframe rendering in the feed.
 */

/**
 * Parse media URLs and generate embed URLs for supported platforms
 * @param {string} url - The source page URL (e.g., YouTube watch URL, Spotify episode URL)
 * @returns {object|null} Media data object or null if not a supported platform
 *
 * @example
 * parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
 * // Returns: { platform: 'youtube', videoId: '...', embedUrl: '...', thumbnailUrl: '...' }
 *
 * parseVideoUrl('https://open.spotify.com/episode/7makk4oTQel546B0PZlDM5')
 * // Returns: { platform: 'spotify', videoId: '...', embedUrl: '...', thumbnailUrl: null }
 */
export const parseVideoUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // YouTube patterns
  // Matches: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );

  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    return {
      platform: 'youtube',
      videoId: videoId,
      // Use youtube-nocookie.com for better privacy
      // Parameters: autoplay=0 (controlled via JS API), rel=0 (no related videos),
      // modestbranding=1 (minimal branding), enablejsapi=1 (JS API for play/pause/mute control)
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    };
  }

  // Vimeo patterns
  // Matches: vimeo.com/ID, player.vimeo.com/video/ID, vimeo.com/video/ID
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);

  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      platform: 'vimeo',
      videoId: videoId,
      // Parameters: autoplay=0 (controlled via JS API),
      // title=0, byline=0, portrait=0 (minimal UI), background=0 (not background mode)
      embedUrl: `https://player.vimeo.com/video/${videoId}?autoplay=0&title=0&byline=0&portrait=0&background=0`,
      thumbnailUrl: null // Vimeo requires API for thumbnails
    };
  }

  // Spotify patterns
  // Matches: open.spotify.com/episode/ID, open.spotify.com/track/ID,
  //          open.spotify.com/playlist/ID, open.spotify.com/album/ID, etc.
  const spotifyMatch = url.match(
    /open\.spotify\.com\/(episode|track|playlist|album|show|artist)\/([a-zA-Z0-9]+)/
  );

  if (spotifyMatch) {
    const contentType = spotifyMatch[1];
    const contentId = spotifyMatch[2];
    return {
      platform: 'spotify',
      videoId: contentId,
      embedUrl: `https://open.spotify.com/embed/${contentType}/${contentId}?utm_source=generator`,
      thumbnailUrl: null
    };
  }

  return null;
};

/**
 * Check if a URL is from a supported media platform
 * @param {string} url - The URL to check
 * @returns {boolean} True if URL is from YouTube, Vimeo, or Spotify
 *
 * @example
 * isSupportedVideoUrl('https://www.youtube.com/watch?v=abc123') // true
 * isSupportedVideoUrl('https://example.com') // false
 */
export const isSupportedVideoUrl = (url) => {
  return parseVideoUrl(url) !== null;
};

/**
 * Get platform name from URL
 * @param {string} url - The URL to check
 * @returns {string|null} Platform name ('youtube', 'vimeo') or null
 */
export const getPlatform = (url) => {
  const videoData = parseVideoUrl(url);
  return videoData ? videoData.platform : null;
};
