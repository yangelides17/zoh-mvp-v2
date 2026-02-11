/**
 * Video URL Parser Utility
 *
 * Parses video URLs from supported platforms (YouTube, Vimeo) and generates
 * embed URLs for iframe rendering in the feed.
 */

/**
 * Parse video URLs and generate embed URLs for supported platforms
 * @param {string} url - The source page URL (e.g., YouTube watch URL)
 * @returns {object|null} Video data object or null if not a supported platform
 *
 * @example
 * parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
 * // Returns:
 * // {
 * //   platform: 'youtube',
 * //   videoId: 'dQw4w9WgXcQ',
 * //   embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?...',
 * //   thumbnailUrl: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg'
 * // }
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
      // Parameters: rel=0 (no related videos), modestbranding=1 (minimal branding), enablejsapi=1 (JS API)
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`,
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
      // Parameters: title=0, byline=0, portrait=0 (minimal UI)
      embedUrl: `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`,
      thumbnailUrl: null // Vimeo requires API for thumbnails
    };
  }

  return null;
};

/**
 * Check if a URL is from a supported video platform
 * @param {string} url - The URL to check
 * @returns {boolean} True if URL is from YouTube or Vimeo
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
