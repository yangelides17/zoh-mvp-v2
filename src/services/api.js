/**
 * API Service for Feed
 *
 * Handles all communication with the backend feed API
 */

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Fetch fragments for the feed
 * @param {number} limit - Number of fragments to fetch
 * @param {string|null} cursor - Cursor for pagination (fragment ID)
 * @param {Array<string>} domains - Filter by domains
 * @param {Array<string>} archetypes - Filter by archetypes
 * @param {string|null} randomSeed - Random seed for deterministic pseudo-random ordering
 * @returns {Promise<{fragments: Array, next_cursor: string|null, has_more: boolean}>}
 */
export const fetchFragments = async (limit = 20, cursor = null, domains = [], archetypes = [], randomSeed = null, curated = false, source = 'all', pageIds = [], search = '') => {
  try {
    const params = { limit };
    if (cursor) {
      params.cursor = cursor;
    }
    if (domains && domains.length > 0) {
      params.domains = domains.join(',');
    }
    if (archetypes && archetypes.length > 0) {
      params.archetypes = archetypes.join(',');
    }
    if (pageIds && pageIds.length > 0) {
      params.page_ids = pageIds.join(',');
    }
    if (randomSeed) {
      params.random_seed = randomSeed;
    }
    if (curated) {
      params.curated = 'true';
    }
    if (source && source !== 'all') {
      params.source = source;
    }
    if (search && search.trim()) {
      params.search = search.trim();
    }

    const response = await api.get('/api/feed/fragments', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching fragments:', error);
    throw error;
  }
};

/**
 * Get URL for fragment screenshot
 * @param {string} fragmentId - Fragment UUID
 * @returns {string} Screenshot URL
 */
export const getFragmentScreenshotUrl = (fragmentId) => {
  return `${API_BASE_URL}/api/feed/fragment/${fragmentId}/screenshot`;
};

/**
 * Fetch fragment HTML for interactive rendering
 * @param {string} fragmentId - Fragment UUID
 * @returns {Promise<{html: string, styles: string[], stylesheet_urls: string[], base_url: string}>}
 * @throws {Error} If HTML not available (404) or server error
 */
export const fetchFragmentHtml = async (fragmentId) => {
  try {
    const response = await api.get(`/api/feed/fragment/${fragmentId}/html`);
    return response.data;
  } catch (error) {
    // Don't log 404s as errors -- HTML not available is expected for many fragments
    if (error.response?.status !== 404) {
      console.error('Error fetching fragment HTML:', error);
    }
    throw error;
  }
};

/**
 * Fetch fragment metadata
 * @param {string} fragmentId - Fragment UUID
 * @returns {Promise<Object>} Fragment metadata
 */
export const fetchFragmentMetadata = async (fragmentId) => {
  try {
    const response = await api.get(`/api/feed/fragment/${fragmentId}/metadata`);
    return response.data;
  } catch (error) {
    console.error('Error fetching fragment metadata:', error);
    throw error;
  }
};

/**
 * Fetch available sites (domains) with counts
 * @returns {Promise<{sites: Array<{domain: string, count: number}>}>}
 */
export const fetchAvailableSites = async () => {
  try {
    const response = await api.get('/api/feed/available-sites');
    return response.data;
  } catch (error) {
    console.error('Error fetching available sites:', error);
    throw error;
  }
};

/**
 * Fetch available archetypes with counts
 * @returns {Promise<{archetypes: Array<{archetype: string, count: number}>}>}
 */
export const fetchAvailableArchetypes = async () => {
  try {
    const response = await api.get('/api/feed/available-archetypes');
    return response.data;
  } catch (error) {
    console.error('Error fetching available archetypes:', error);
    throw error;
  }
};

/**
 * Fetch available pages with counts and per-domain page numbering
 * @returns {Promise<{pages: Array<{page_id: string, url: string, domain: string, page_number: number, total_domain_pages: number, count: number}>}>}
 */
export const fetchAvailablePages = async () => {
  try {
    const response = await api.get('/api/feed/available-pages');
    return response.data;
  } catch (error) {
    console.error('Error fetching available pages:', error);
    throw error;
  }
};

/**
 * Cache extracted destination URL for a video_card fragment
 * @param {string} fragmentId - Fragment UUID
 * @param {string} destinationUrl - The extracted destination URL
 * @returns {Promise<void>}
 */
export const cacheDestinationUrl = async (fragmentId, destinationUrl) => {
  await api.put(`/api/feed/fragment/${fragmentId}/destination-url`, {
    destination_url: destinationUrl
  });
};

/**
 * Health check
 * @returns {Promise<{status: string, service: string}>}
 */
export const checkHealth = async () => {
  try {
    const response = await api.get('/api/feed/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};

export default api;
