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
 * Fetch specific fragments by their IDs
 * @param {Array<string>} fragmentIds - Array of fragment UUIDs
 * @returns {Promise<Array>} Array of fragment objects
 */
export const fetchFragmentsByIds = async (fragmentIds) => {
  if (!fragmentIds || fragmentIds.length === 0) return [];
  try {
    const response = await api.get('/api/feed/fragments', {
      params: { fragment_ids: fragmentIds.join(',') }
    });
    return response.data.fragments || [];
  } catch (error) {
    console.error('Error fetching fragments by IDs:', error);
    return [];
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
 * Fetch grouped feed items (articles + standalone fragments)
 * @param {number} limit - Number of feed items to fetch
 * @param {string|null} cursor - Cursor for pagination
 * @param {Array<string>} domains - Filter by domains
 * @param {Array<string>} archetypes - Filter by archetypes
 * @param {string|null} randomSeed - Random seed for deterministic ordering
 * @param {boolean} curated - Only curated content
 * @param {string} source - Filter by source (all/manual/model_prediction)
 * @param {Array<string>} pageIds - Filter by page IDs
 * @returns {Promise<{items: Array, next_cursor: string|null, has_more: boolean}>}
 */
export const fetchArticles = async (limit = 20, cursor = null, domains = [], archetypes = [], randomSeed = null, curated = false, source = 'all', pageIds = [], search = '', anonymousId = null, excludeIds = '') => {
  try {
    const params = { limit };

    if (anonymousId) {
      // Recommendation mode — exclusion-based pagination
      params.anonymous_id = anonymousId;
      if (excludeIds) params.exclude_ids = excludeIds;
      // Include debug in development
      if (process.env.NODE_ENV === 'development') {
        params.debug = 'true';
      }
    } else {
      // Legacy cursor-based mode
      if (cursor) params.cursor = cursor;
      if (randomSeed) params.random_seed = randomSeed;
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
    if (curated) {
      params.curated = 'true';
    }
    if (source && source !== 'all') {
      params.source = source;
    }
    if (search && search.trim()) {
      params.search = search.trim();
    }

    const response = await api.get('/api/feed/articles', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching articles:', error);
    throw error;
  }
};

/**
 * Fetch combined HTML for an assembled article (all article fragments from a page)
 * @param {string} pageId - Page UUID
 * @param {string[]|null} fragmentIds - Optional fragment UUIDs to limit extraction
 * @returns {Promise<{html: string, styles: string[], stylesheet_urls: string[], base_url: string, fragment_ids: string[]}>}
 */
export const fetchArticleHtml = async (pageId, fragmentIds = null) => {
  try {
    const params = {};
    if (fragmentIds && fragmentIds.length > 0) {
      params.fragment_ids = fragmentIds.join(',');
    }
    const response = await api.get(`/api/feed/article/${pageId}/html`, { params });
    return response.data;
  } catch (error) {
    if (error.response?.status !== 404) {
      console.error('Error fetching article HTML:', error);
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
 * Send engagement events to the backend
 * @param {string} userId - Anonymous user ID
 * @param {Array} events - Array of engagement event objects
 * @returns {Promise<{success: boolean, processed: number}>}
 */
export const sendEngagementEvents = async (userId, events) => {
  try {
    const response = await api.post('/api/feed/engage', {
      user_id: userId,
      events,
    });
    return response.data;
  } catch (error) {
    console.warn('Engagement tracking failed:', error.message);
    return { success: false, processed: 0 };
  }
};

/**
 * Fetch chat configuration from the backend.
 * Returns the chat mode: 'openclaw' (routed through agent) or 'direct' (user API key).
 * Cached after first call since mode doesn't change at runtime.
 * @returns {Promise<{mode: 'openclaw'|'direct'}>}
 */
let _chatConfigCache = null;
export const fetchChatConfig = async () => {
  if (_chatConfigCache) return _chatConfigCache;
  try {
    const response = await api.get('/api/chat/config');
    _chatConfigCache = response.data;
    return _chatConfigCache;
  } catch (error) {
    // Default to direct mode if config endpoint unavailable
    return { mode: 'direct' };
  }
};

/**
 * Send a chat message to the Zoh agent with optional fragment context
 * @param {Array<{role: string, content: string}>} messages - Conversation history
 * @param {string|null} fragmentId - Active fragment ID for context
 * @param {string|null} pageId - Active page ID for assembled article context
 * @returns {Promise<{response: string, fragment_context: object|null}>}
 */
export const sendChatMessage = async (messages, fragmentId = null, pageId = null) => {
  const config = await fetchChatConfig();

  const body = {
    messages,
    fragment_id: fragmentId,
    page_id: pageId,
    anonymous_id: getAnonymousId(),
  };

  // Only include API credentials in direct mode
  if (config.mode !== 'openclaw') {
    const provider = localStorage.getItem('zoh_llm_provider') || 'anthropic';
    const apiKey = localStorage.getItem('zoh_llm_api_key') || '';
    const model = localStorage.getItem('zoh_llm_model') || '';
    body.provider = provider;
    body.api_key = apiKey;
    if (model) body.model = model;
  }

  const response = await api.post('/api/chat/message', body);
  return response.data;
};

/**
 * Fetch agent-generated feed cards
 * @param {number} limit - Max cards to fetch (default 10)
 * @returns {Promise<{cards: Array, total: number}>}
 */
export const fetchAgentCards = async (limit = 10) => {
  try {
    const response = await api.get('/api/feed/agent-cards', { params: { limit } });
    return response.data;
  } catch (error) {
    console.warn('Failed to fetch agent cards:', error.message);
    return { cards: [], total: 0 };
  }
};

/**
 * Trigger the agent to generate proactive feed cards
 * @param {number} maxCards - Max cards to generate (default 3)
 * @returns {Promise<{cards_generated: Array, total: number, response: string}>}
 */
export const generateFeedCards = async (maxCards = 3) => {
  const config = await fetchChatConfig();
  const body = { max_cards: maxCards };

  if (config.mode !== 'openclaw') {
    const provider = localStorage.getItem('zoh_llm_provider') || 'anthropic';
    const apiKey = localStorage.getItem('zoh_llm_api_key') || '';
    const model = localStorage.getItem('zoh_llm_model') || '';
    body.provider = provider;
    body.api_key = apiKey;
    if (model) body.model = model;
  }

  const response = await api.post('/api/chat/generate-feed-cards', body);
  return response.data;
};

/**
 * Dismiss an agent card so it no longer appears
 * @param {string} cardId - UUID of the card to dismiss
 * @returns {Promise<{success: boolean}>}
 */
export const dismissAgentCard = async (cardId) => {
  const response = await api.post(`/api/feed/agent-cards/${cardId}/dismiss`);
  return response.data;
};

/**
 * Send a message in ambient mode — agent responds through the feed.
 * @param {Array<{role: string, content: string}>} messages
 * @param {string|null} fragmentId
 * @param {string|null} pageId
 * @returns {Promise<{response: string, fragment_context: object|null, feed_actions: Array}>}
 */
export const sendAmbientMessage = async (messages, fragmentId = null, pageId = null) => {
  const config = await fetchChatConfig();

  const body = {
    messages,
    fragment_id: fragmentId,
    page_id: pageId,
    anonymous_id: getAnonymousId(),
  };

  if (config.mode !== 'openclaw') {
    const provider = localStorage.getItem('zoh_llm_provider') || 'anthropic';
    const apiKey = localStorage.getItem('zoh_llm_api_key') || '';
    const model = localStorage.getItem('zoh_llm_model') || '';
    body.provider = provider;
    body.api_key = apiKey;
    if (model) body.model = model;
  }

  const response = await api.post('/api/chat/ambient-message', body);
  return response.data;
};

/**
 * Handle a prompt card button click or text input.
 * @param {string} cardId
 * @param {string} action
 * @param {string|null} payload
 * @param {string|null} userInput
 * @returns {Promise<{response: string, feed_actions: Array}>}
 */
export const sendPromptAction = async (cardId, action, payload = null, userInput = null) => {
  const config = await fetchChatConfig();

  const body = {
    card_id: cardId,
    action,
    payload,
    user_input: userInput,
  };

  if (config.mode !== 'openclaw') {
    const provider = localStorage.getItem('zoh_llm_provider') || 'anthropic';
    const apiKey = localStorage.getItem('zoh_llm_api_key') || '';
    const model = localStorage.getItem('zoh_llm_model') || '';
    body.provider = provider;
    body.api_key = apiKey;
    if (model) body.model = model;
  }

  const response = await api.post('/api/chat/prompt-action', body);
  return response.data;
};

/**
 * Fetch active annotations for a set of fragment IDs.
 * @param {Array<string>} fragmentIds
 * @returns {Promise<{annotations: Object<string, Array>}>}
 */
export const fetchAnnotations = async (fragmentIds) => {
  if (!fragmentIds || fragmentIds.length === 0) {
    return { annotations: {} };
  }
  try {
    const response = await api.get('/api/feed/annotations', {
      params: { fragment_ids: fragmentIds.join(',') },
    });
    return response.data;
  } catch (error) {
    console.warn('Failed to fetch annotations:', error.message);
    return { annotations: {} };
  }
};

/**
 * Trigger auto-generation of feed cards (throttled, skips if recent).
 * Fire-and-forget on feed load.
 * @returns {Promise<{success: boolean}|{skipped: boolean}>}
 */
export const autoGenerateCards = async () => {
  const config = await fetchChatConfig();
  const body = {};

  if (config.mode !== 'openclaw') {
    const provider = localStorage.getItem('zoh_llm_provider') || 'anthropic';
    const apiKey = localStorage.getItem('zoh_llm_api_key') || '';
    const model = localStorage.getItem('zoh_llm_model') || '';
    if (!apiKey) return { skipped: true, reason: 'No API key' };
    body.provider = provider;
    body.api_key = apiKey;
    if (model) body.model = model;
  }

  try {
    const response = await api.post('/api/chat/auto-generate', body);
    return response.data;
  } catch (error) {
    console.warn('Auto-generate failed:', error.message);
    return { skipped: true, reason: 'Error' };
  }
};

// ---------------------------------------------------------------------------
// Feed Curation — agent as the feed algorithm
// ---------------------------------------------------------------------------

/**
 * Get the anonymous user ID from localStorage (shared with engagement)
 * @returns {string}
 */
export const getAnonymousId = () => {
  let id = localStorage.getItem('zoh_anon_id');
  if (!id) {
    id = `anon_${crypto.randomUUID()}`;
    localStorage.setItem('zoh_anon_id', id);
  }
  return id;
};

/**
 * Trigger agent curation — agent decides what to show next in the feed.
 * @param {Array<string>} viewedIds - Fragment IDs already shown
 * @returns {Promise<{curated_ids: string[], reasoning: string}>}
 */
export const requestCuration = async (viewedIds = []) => {
  const config = await fetchChatConfig();
  const body = {
    anonymous_id: getAnonymousId(),
    viewed_ids: viewedIds,
  };

  if (config.mode !== 'openclaw') {
    const provider = localStorage.getItem('zoh_llm_provider') || 'anthropic';
    const apiKey = localStorage.getItem('zoh_llm_api_key') || '';
    const model = localStorage.getItem('zoh_llm_model') || '';
    if (!apiKey) return { curated_ids: [], reasoning: 'No API key' };
    body.provider = provider;
    body.api_key = apiKey;
    if (model) body.model = model;
  }

  const response = await api.post('/api/chat/curate-session', body);
  return response.data;
};

/**
 * Get next batch of curated fragment IDs from the session queue.
 * @param {number} count - Items to fetch (default 10)
 * @returns {Promise<{curated_ids: string[], remaining: number}>}
 */
export const fetchCuratedNext = async (count = 10) => {
  try {
    const response = await api.get('/api/chat/curated-next', {
      params: { anonymous_id: getAnonymousId(), count },
    });
    return response.data;
  } catch (error) {
    console.warn('Failed to fetch curated next:', error.message);
    return { curated_ids: [], remaining: 0 };
  }
};

/**
 * Send deep dive conversation summary when panel closes.
 * @param {string} fragmentId
 * @param {string} summary - Conversation summary
 * @param {string[]} topics - Key topics discussed
 * @param {number} messagesCount
 * @returns {Promise<{success: boolean}>}
 */
export const sendDeepDiveSignal = async (fragmentId, summary, topics = [], messagesCount = 0) => {
  try {
    const response = await api.post('/api/feed/deep-dive-signal', {
      anonymous_id: getAnonymousId(),
      fragment_id: fragmentId,
      summary,
      topics,
      messages_count: messagesCount,
    });
    return response.data;
  } catch (error) {
    console.warn('Deep dive signal failed:', error.message);
    return { success: false };
  }
};

/**
 * Send a 'more like this' reaction (double-tap).
 * @param {string} fragmentId
 * @param {string} archetype
 * @param {string} domain
 * @returns {Promise<{success: boolean}>}
 */
export const sendReaction = async (fragmentId, archetype = null, domain = null) => {
  try {
    const response = await api.post('/api/feed/react', {
      anonymous_id: getAnonymousId(),
      fragment_id: fragmentId,
      archetype,
      domain,
    });
    return response.data;
  } catch (error) {
    console.warn('Reaction failed:', error.message);
    return { success: false };
  }
};

/**
 * Sync engagement events to the session context store.
 * Called after each engagement batch flush.
 * @param {Array} events - Engagement events with archetype/domain data
 * @returns {Promise<{success: boolean, synced: number}>}
 */
export const syncEngagementToSession = async (events) => {
  try {
    const response = await api.post('/api/feed/sync-engagement', {
      anonymous_id: getAnonymousId(),
      events,
    });
    return response.data;
  } catch (error) {
    // Silent fail — session sync is best-effort
    return { success: false, synced: 0 };
  }
};

/**
 * Get session context for debugging
 * @returns {Promise<Object>}
 */
export const fetchSessionContext = async () => {
  try {
    const response = await api.get('/api/chat/session-context', {
      params: { anonymous_id: getAnonymousId() },
    });
    return response.data;
  } catch (error) {
    console.warn('Session context fetch failed:', error.message);
    return {};
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
