/**
 * useEngagement Hook
 *
 * Provides engagement tracking for feed items (fragments and assembled articles).
 * Tracks visibility dwell time, viewport percentage, scroll speed, and clicks.
 * Batches events and flushes to backend every 10 seconds.
 *
 * Usage:
 *   <EngagementProvider feedRef={feedRef}>
 *     <FragmentCard /> // calls useEngagement() internally
 *   </EngagementProvider>
 */

import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';
import { sendEngagementEvents, syncEngagementToSession } from '../services/api';

const EngagementContext = createContext(null);

const FLUSH_INTERVAL_MS = 10_000;
const MIN_DWELL_MS = 500;
const SCROLL_THROTTLE_MS = 50;

// Scroll speed thresholds (px/s)
const SPEED_READING = 100;
const SPEED_SCANNING = 500;

const STORAGE_KEY = 'zoh_anon_id';

function getOrCreateAnonId() {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = 'anon_' + crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function EngagementProvider({ children, feedRef, feedItems, onTriggerFired, onAgentTrigger }) {
  const userId = useRef(getOrCreateAnonId());
  const eventQueue = useRef([]);
  const activeDwells = useRef(new Map()); // fragmentId -> { startTime, lastViewportPct }
  const scrollSpeedRef = useRef('reading');
  const lastScrollTop = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const flushTimerRef = useRef(null);

  // Agent trigger state
  const feedItemsRef = useRef([]);
  const triggerCooldownRef = useRef(false);
  const affinityMedianRef = useRef(0.5);
  const onTriggerFiredRef = useRef(onTriggerFired);
  const devTriggerCountRef = useRef(0);

  const onAgentTriggerRef = useRef(onAgentTrigger);

  // Keep refs in sync with props
  useEffect(() => {
    feedItemsRef.current = feedItems || [];
    onTriggerFiredRef.current = onTriggerFired;
    onAgentTriggerRef.current = onAgentTrigger;

    // Compute affinity median from current feed items
    const scores = (feedItems || [])
      .map(item => item._affinity?.score)
      .filter(s => typeof s === 'number');
    if (scores.length > 0) {
      scores.sort((a, b) => a - b);
      const mid = Math.floor(scores.length / 2);
      affinityMedianRef.current = scores.length % 2 === 0
        ? (scores[mid - 1] + scores[mid]) / 2
        : scores[mid];
    }
  }, [feedItems, onTriggerFired, onAgentTrigger]);

  // Flush queued events to backend + sync to session context
  const flush = useCallback(() => {
    if (eventQueue.current.length === 0) return;
    const batch = eventQueue.current.splice(0);
    sendEngagementEvents(userId.current, batch);
    // Also sync to in-memory session context (best-effort, fire-and-forget)
    syncEngagementToSession(batch);
  }, []);

  // End a dwell and push visibility event if long enough
  const endDwell = useCallback((fragmentId) => {
    const dwell = activeDwells.current.get(fragmentId);
    if (!dwell) return;
    activeDwells.current.delete(fragmentId);

    const dwellMs = Date.now() - dwell.startTime;
    if (dwellMs < MIN_DWELL_MS) return;

    eventQueue.current.push({
      fragment_id: fragmentId,
      type: 'visibility',
      timestamp_ms: Date.now(),
      data: {
        dwell_ms: dwellMs,
        viewport_pct: dwell.lastViewportPct,
        scroll_speed: scrollSpeedRef.current,
      },
    });

    // --- Agent trigger detection ---
    // TEMPORARILY DISABLED — conserve API budget during feed debugging
    return;
    // eslint-disable-next-line no-unreachable
    if (triggerCooldownRef.current) return;

    // Find this item in the feed to get affinity scores.
    // Articles have fragment IDs nested inside item.fragments[], not at top level.
    const item = feedItemsRef.current.find(i =>
      i.fragment_id === fragmentId ||
      i.page_id === fragmentId ||
      i.article_id === fragmentId ||
      (i.fragments || []).some(f => f.fragment_id === fragmentId)
    );
    const affinity = item?._affinity;
    if (!affinity || typeof affinity.score !== 'number') return;

    const median = affinityMedianRef.current;
    const highAffinity = affinity.score >= median;
    const highResponse = dwellMs >= 5000 && dwell.lastViewportPct >= 0.5;
    const lowResponse = dwellMs < 2000;

    let triggerType = null;

    // Dev mode: fire on every other dwell event (any dwell > 1s)
    if (process.env.NODE_ENV === 'development' && dwellMs >= 1000) {
      devTriggerCountRef.current += 1;
      if (devTriggerCountRef.current % 2 === 0) {
        triggerType = highAffinity ? 'high_high' : 'low_high';
      }
    } else {
      if (highAffinity && highResponse) triggerType = 'high_high';
      else if (highAffinity && lowResponse) triggerType = 'high_low';
      else if (!highAffinity && highResponse) triggerType = 'low_high';
    }

    if (triggerType) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[TRIGGER] ${triggerType} on ${fragmentId}`, {
          score: affinity.score,
          median,
          dwellMs,
          viewportPct: dwell.lastViewportPct,
          devCount: devTriggerCountRef.current,
        });
      }

      triggerCooldownRef.current = true;
      setTimeout(() => { triggerCooldownRef.current = false; }, 15000); // 15s cooldown in dev

      const engagementData = {
        dwellMs,
        viewportPct: dwell.lastViewportPct,
      };

      // Route through streaming callback if available, otherwise fall back to onTriggerFired
      if (onAgentTriggerRef.current) {
        onAgentTriggerRef.current(triggerType, fragmentId, affinity, engagementData);
      } else if (onTriggerFiredRef.current) {
        // Fallback: notify parent to refresh cards after delay
        setTimeout(() => onTriggerFiredRef.current(), 10000);
      }
    }
  }, []);

  // Start flush interval
  useEffect(() => {
    flushTimerRef.current = setInterval(flush, FLUSH_INTERVAL_MS);
    return () => {
      flush();
      clearInterval(flushTimerRef.current);
    };
  }, [flush]);

  // Scroll speed tracking on feed container
  useEffect(() => {
    const feedEl = feedRef?.current;
    if (!feedEl) return;

    const onScroll = () => {
      const now = Date.now();
      const dt = now - lastScrollTime.current;
      if (dt < SCROLL_THROTTLE_MS) return;

      const dy = Math.abs(feedEl.scrollTop - lastScrollTop.current);
      const speed = (dy / dt) * 1000; // px/s

      if (speed < SPEED_READING) {
        scrollSpeedRef.current = 'reading';
      } else if (speed < SPEED_SCANNING) {
        scrollSpeedRef.current = 'scanning';
      } else {
        scrollSpeedRef.current = 'skimming';
      }

      lastScrollTop.current = feedEl.scrollTop;
      lastScrollTime.current = now;
    };

    feedEl.addEventListener('scroll', onScroll, { passive: true });
    return () => feedEl.removeEventListener('scroll', onScroll);
  }, [feedRef]);

  // Flush on tab hide / close
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        for (const [fid] of activeDwells.current) {
          endDwell(fid);
        }
        flush();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [flush, endDwell]);

  // Start or update dwell tracking for a fragment
  const onVisible = useCallback((fragmentId, viewportPct = 1.0) => {
    if (activeDwells.current.has(fragmentId)) {
      const dwell = activeDwells.current.get(fragmentId);
      dwell.lastViewportPct = Math.max(dwell.lastViewportPct, viewportPct);
      return;
    }
    activeDwells.current.set(fragmentId, {
      startTime: Date.now(),
      lastViewportPct: viewportPct,
    });
  }, []);

  // End dwell tracking for a fragment
  const onHidden = useCallback((fragmentId) => {
    endDwell(fragmentId);
  }, [endDwell]);

  // Record a click event
  const onClick = useCallback((fragmentId) => {
    eventQueue.current.push({
      fragment_id: fragmentId,
      type: 'click',
      timestamp_ms: Date.now(),
      data: {},
    });
  }, []);

  const value = { onVisible, onHidden, onClick };

  return (
    <EngagementContext.Provider value={value}>
      {children}
    </EngagementContext.Provider>
  );
}

export function useEngagement() {
  return useContext(EngagementContext);
}

export default useEngagement;
