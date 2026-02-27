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
import { sendEngagementEvents } from '../services/api';

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

export function EngagementProvider({ children, feedRef }) {
  const userId = useRef(getOrCreateAnonId());
  const eventQueue = useRef([]);
  const activeDwells = useRef(new Map()); // fragmentId -> { startTime, lastViewportPct }
  const scrollSpeedRef = useRef('reading');
  const lastScrollTop = useRef(0);
  const lastScrollTime = useRef(Date.now());
  const flushTimerRef = useRef(null);

  // Flush queued events to backend
  const flush = useCallback(() => {
    if (eventQueue.current.length === 0) return;
    const batch = eventQueue.current.splice(0);
    sendEngagementEvents(userId.current, batch);
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
