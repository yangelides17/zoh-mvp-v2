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
export const fetchFragments = async (limit = 20, cursor = null, domains = [], archetypes = [], randomSeed = null) => {
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
    if (randomSeed) {
      params.random_seed = randomSeed;
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
