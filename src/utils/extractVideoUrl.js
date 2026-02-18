/**
 * Extract Video URL from Fragment HTML
 *
 * Parses HTML content from video_card fragments to find embeddable
 * destination URLs (YouTube, Spotify, Vimeo). Uses browser-native
 * DOMParser — no external dependencies.
 *
 * Search order:
 * 1. <iframe src> — embedded players
 * 2. <a href> — link destinations (most common for YouTube/Spotify)
 * 3. <source src> — HTML5 video/audio
 * 4. data-href, data-url, data-src attributes
 * 5. Regex sweep for bare URLs (safety net)
 */

import { parseVideoUrl } from './videoParser';

// Spotify content types ordered by embeddability
// Tracks and episodes are the playable content we want
const SPOTIFY_TYPE_PRIORITY = {
  track: 0,
  episode: 1,
  playlist: 2,
  album: 3,
  show: 4,
  artist: 5,
};

/**
 * Get Spotify content type priority (lower = better).
 * Returns Infinity for non-Spotify or unknown types.
 */
function getSpotifyPriority(url) {
  const match = url.match(
    /open\.spotify\.com\/(track|episode|playlist|album|show|artist)\//
  );
  if (!match) return Infinity;
  return SPOTIFY_TYPE_PRIORITY[match[1]] ?? Infinity;
}

/**
 * Extract the best embeddable video/audio URL from HTML content.
 *
 * @param {string} html - Raw HTML string from fragment
 * @returns {{ url: string, videoData: object } | null}
 *   videoData is the result of parseVideoUrl() — contains platform, videoId, embedUrl, thumbnailUrl
 */
export const extractVideoUrl = (html) => {
  if (!html || typeof html !== 'string') return null;

  const candidates = [];
  const seen = new Set();

  const addCandidate = (url) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    const videoData = parseVideoUrl(url);
    if (videoData) {
      candidates.push({ url, videoData });
    }
  };

  // --- DOM-based extraction ---
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // 1. <iframe src>
    doc.querySelectorAll('iframe[src]').forEach((el) => {
      addCandidate(el.getAttribute('src'));
    });

    // 2. <a href>
    doc.querySelectorAll('a[href]').forEach((el) => {
      addCandidate(el.getAttribute('href'));
    });

    // 3. <source src>
    doc.querySelectorAll('source[src]').forEach((el) => {
      addCandidate(el.getAttribute('src'));
    });

    // 4. data-href, data-url, data-src on any element
    doc.querySelectorAll('[data-href], [data-url], [data-src]').forEach((el) => {
      addCandidate(el.getAttribute('data-href'));
      addCandidate(el.getAttribute('data-url'));
      addCandidate(el.getAttribute('data-src'));
    });
  } catch {
    // DOMParser failed — fall through to regex
  }

  // 5. Regex sweep for bare URLs (safety net)
  const urlPatterns = [
    /https?:\/\/(?:www\.)?youtube\.com\/watch\?[^\s"'<>]+/g,
    /https?:\/\/youtu\.be\/[a-zA-Z0-9_-]{11}[^\s"'<>]*/g,
    /https?:\/\/(?:www\.)?youtube\.com\/embed\/[a-zA-Z0-9_-]{11}[^\s"'<>]*/g,
    /https?:\/\/(?:player\.)?vimeo\.com\/(?:video\/)?\d+[^\s"'<>]*/g,
    /https?:\/\/open\.spotify\.com\/(?:track|episode|playlist|album|show|artist)\/[a-zA-Z0-9]+[^\s"'<>]*/g,
  ];

  for (const pattern of urlPatterns) {
    for (const match of html.matchAll(pattern)) {
      addCandidate(match[0]);
    }
  }

  if (candidates.length === 0) return null;

  // Sort by Spotify type priority (tracks/episodes first).
  // For non-Spotify URLs, priority is Infinity so DOM order is preserved via stable sort.
  candidates.sort((a, b) => getSpotifyPriority(a.url) - getSpotifyPriority(b.url));

  return candidates[0];
};
