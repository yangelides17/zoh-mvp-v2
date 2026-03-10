/**
 * Feature flags — toggle experimental features via environment variables.
 * Set REACT_APP_FEATURE_*=true in .env (dev) or deployment config (prod).
 */

export const FEATURES = {
  SPOTLIGHT: process.env.REACT_APP_FEATURE_SPOTLIGHT === 'true',
  DEEP_DIVE: process.env.REACT_APP_FEATURE_DEEP_DIVE === 'true',
  GENERATE_INSIGHTS: process.env.REACT_APP_FEATURE_GENERATE_INSIGHTS === 'true',
  FILTER_BAR: process.env.REACT_APP_FEATURE_FILTER_BAR === 'true',
  DEBUG_PAGE_NUMBERS: process.env.REACT_APP_FEATURE_DEBUG_PAGE_NUMBERS === 'true',
};
