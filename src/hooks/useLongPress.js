import { useRef, useState, useCallback } from 'react';

/**
 * useLongPress — detect click-and-hold gestures.
 *
 * Returns pointer event handlers to spread onto an element,
 * a `pressing` boolean for visual feedback, and a `longPressFiredRef`
 * that the element's click handler should check to suppress navigation.
 */
const useLongPress = (callback, { delay = 500, moveThreshold = 10 } = {}) => {
  const timerRef = useRef(null);
  const startPos = useRef({ x: 0, y: 0 });
  const longPressFiredRef = useRef(false);
  const [pressing, setPressing] = useState(false);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPressing(false);
  }, []);

  const start = useCallback((e) => {
    // Only primary button
    if (e.button !== 0) return;

    // Skip form elements (iframes swallow pointer events naturally)
    if (
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.tagName === 'BUTTON'
    ) {
      return;
    }

    startPos.current = { x: e.clientX, y: e.clientY };
    longPressFiredRef.current = false;
    setPressing(true);

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      longPressFiredRef.current = true;
      setPressing(false);
      callback(e);
    }, delay);
  }, [callback, delay]);

  const move = useCallback((e) => {
    if (!timerRef.current) return;
    const dx = Math.abs(e.clientX - startPos.current.x);
    const dy = Math.abs(e.clientY - startPos.current.y);
    if (dx > moveThreshold || dy > moveThreshold) {
      cancel();
    }
  }, [cancel, moveThreshold]);

  const end = useCallback(() => {
    cancel();
  }, [cancel]);

  return {
    onPointerDown: start,
    onPointerMove: move,
    onPointerUp: end,
    onPointerCancel: end,
    pressing,
    longPressFiredRef,
  };
};

export default useLongPress;
