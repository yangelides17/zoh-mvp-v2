/**
 * AssembledArticle Component
 *
 * Renders a complete article assembled from multiple article/article_media
 * fragments. Fetches combined HTML from the backend and renders in a single
 * Shadow DOM container, preserving original reading order.
 *
 * Based on ArticleEmbed.jsx but operates at the page/article level
 * rather than individual fragment level.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { fetchArticleHtml } from '../../services/api';
import FragmentImage from './FragmentImage';
import DeepDiveTiles from './DeepDiveTiles';
import { useEngagement } from '../../hooks/useEngagement';
import useLongPress from '../../hooks/useLongPress';
import './AssembledArticle.css';

const AssembledArticle = ({ article, isDesktop = false }) => {
  const { page_id, domain, url, has_html, fragments, fragment_count, total_fragment_count, truncated, page_number } = article;

  const [shouldLoad, setShouldLoad] = useState(false);
  const [htmlData, setHtmlData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef(null);
  const shadowHostRef = useRef(null);
  const shadowRootRef = useRef(null);
  const wrapperRef = useRef(null);
  const fragmentObserverRef = useRef(null);
  const engagement = useEngagement();
  const [deepDiveActive, setDeepDiveActive] = useState(false);

  // Long-press to trigger deep-dive
  const handleLongPress = useCallback(() => {
    if (!isDesktop) return;
    setDeepDiveActive(true);
  }, [isDesktop]);

  const {
    onPointerDown, onPointerMove, onPointerUp, onPointerCancel,
    pressing, longPressFiredRef,
  } = useLongPress(handleLongPress, { delay: 500 });

  // Dismiss deep-dive when card scrolls out of view
  useEffect(() => {
    if (!deepDiveActive || !containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) setDeepDiveActive(false);
      },
      { threshold: 0.3 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [deepDiveActive]);

  // Dismiss deep-dive on Escape
  useEffect(() => {
    if (!deepDiveActive) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setDeepDiveActive(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [deepDiveActive]);

  // Lazy load: only fetch HTML when near viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
        }
      },
      {
        rootMargin: '1500px',
        threshold: 0.01
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Fetch combined article HTML when shouldLoad becomes true
  useEffect(() => {
    if (!shouldLoad || !has_html) return;

    let cancelled = false;

    const loadHtml = async () => {
      try {
        const fragmentIds = fragments?.map(f => f.fragment_id).filter(Boolean) || null;
        const data = await fetchArticleHtml(page_id, fragmentIds);
        if (!cancelled) {
          setHtmlData(data);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };

    loadHtml();
    return () => { cancelled = true; };
  }, [shouldLoad, page_id, has_html]);

  // Inject HTML into Shadow DOM when data arrives
  useEffect(() => {
    if (!htmlData || !shadowHostRef.current) return;

    // Create shadow root (only once)
    if (!shadowRootRef.current) {
      try {
        shadowRootRef.current = shadowHostRef.current.attachShadow({ mode: 'open' });
      } catch (e) {
        shadowRootRef.current = shadowHostRef.current.shadowRoot;
      }
    }

    const shadow = shadowRootRef.current;
    if (!shadow) return;

    // Base reset styles (same as ArticleEmbed)
    const resetCSS = `
      :host {
        display: block;
        all: initial;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        color: #333;
        line-height: 1.6;
        font-size: 16px;
      }
      *, *::before, *::after { box-sizing: border-box; }

      .assembled-article-content {
        padding: 20px 24px;
        max-width: 100%;
        overflow: hidden;
        background: #fff;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }

      img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
      }

      a { color: #0066cc; text-decoration: none; }
      a:hover { text-decoration: underline; }

      pre, code {
        overflow-x: auto;
        max-width: 100%;
        font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace;
        font-size: 0.9em;
      }
      pre {
        padding: 12px 16px;
        background: #f5f5f5;
        border-radius: 6px;
        line-height: 1.4;
      }
      code { padding: 2px 4px; background: #f0f0f0; border-radius: 3px; }
      pre code { padding: 0; background: none; }

      table { border-collapse: collapse; max-width: 100%; overflow-x: auto; display: block; }
      th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }
      th { background: #f5f5f5; font-weight: 600; }

      ul, ol { padding-left: 24px; }
      li { margin-bottom: 4px; }

      h1, h2, h3, h4, h5, h6 {
        margin-top: 1.2em;
        margin-bottom: 0.5em;
        line-height: 1.3;
        color: #111;
      }
      h1 { font-size: 1.8em; }
      h2 { font-size: 1.5em; }
      h3 { font-size: 1.25em; }

      p { margin: 0.8em 0; }

      blockquote {
        margin: 1em 0;
        padding: 0.5em 1em;
        border-left: 4px solid #ddd;
        color: #666;
        background: #fafafa;
      }

      figure { margin: 1em auto; max-width: 100%; }
      figcaption { font-size: 0.85em; color: #666; margin-top: 0.5em; }

      nav, .ad, .advertisement, .sidebar, .related-articles,
      [role="navigation"], [role="banner"], [aria-hidden="true"] {
        display: none !important;
      }
    `;

    const pageCSS = (htmlData.styles || []).join('\n');

    const cleanHtml = DOMPurify.sanitize(htmlData.html, {
      ADD_TAGS: ['style'],
      ADD_ATTR: ['target', 'rel'],
      ALLOW_DATA_ATTR: true,
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    });

    const stylesheetLinks = (htmlData.stylesheet_urls || [])
      .map(url => `<link rel="stylesheet" href="${DOMPurify.sanitize(url)}" crossorigin="anonymous">`)
      .join('\n');

    shadow.innerHTML = `
      <style>${resetCSS}</style>
      <style>${pageCSS}</style>
      ${stylesheetLinks}
      <div class="assembled-article-content">
        ${cleanHtml}
      </div>
    `;

    // Intercept link clicks
    shadow.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      // eslint-disable-next-line no-script-url
      if (href && href !== '#' && !href.startsWith('javascript:')) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
      link.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });

  }, [htmlData]);

  // Card-level visibility tracking (is this article card active in the snap scroll?)
  useEffect(() => {
    if (!engagement || !containerRef.current) return;

    // Use first fragment ID as the card-level tracking target if no sentinels
    const fallbackId = fragments?.[0]?.fragment_id;
    if (!fallbackId) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          // Card is visible — sentinel observers handle per-fragment tracking.
          // If no sentinel observers set up yet, track at card level.
          if (!fragmentObserverRef.current) {
            engagement.onVisible(fallbackId, entry.intersectionRatio);
          }
        } else {
          // Card left viewport — end all fragment dwells
          if (!fragmentObserverRef.current && fallbackId) {
            engagement.onHidden(fallbackId);
          }
          if (htmlData?.fragment_ids) {
            for (const fid of htmlData.fragment_ids) {
              engagement.onHidden(fid);
            }
          }
        }
      },
      { threshold: [0, 0.5, 1.0] }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      // End all dwells on unmount
      if (!fragmentObserverRef.current && fallbackId) {
        engagement.onHidden(fallbackId);
      }
      if (htmlData?.fragment_ids) {
        for (const fid of htmlData.fragment_ids) {
          engagement.onHidden(fid);
        }
      }
    };
  }, [engagement, fragments, htmlData]);

  // Per-fragment sentinel observers inside Shadow DOM
  useEffect(() => {
    const shadow = shadowRootRef.current;
    if (!shadow || !engagement || !wrapperRef.current) return;

    const sentinels = shadow.querySelectorAll('[data-zoh-fid]');
    if (sentinels.length === 0) return;

    const fragmentObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const fid = entry.target.getAttribute('data-zoh-fid');
          if (!fid) continue;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            engagement.onVisible(fid, entry.intersectionRatio);
          } else {
            engagement.onHidden(fid);
          }
        }
      },
      {
        root: wrapperRef.current,
        threshold: [0, 0.3, 0.5, 0.8, 1.0],
      }
    );

    sentinels.forEach(sentinel => fragmentObserver.observe(sentinel));
    fragmentObserverRef.current = fragmentObserver;

    // Click delegation: find nearest sentinel and track click
    const handleShadowClick = (e) => {
      const sentinel = e.target.closest('[data-zoh-fid]');
      if (sentinel) {
        engagement.onClick(sentinel.getAttribute('data-zoh-fid'));
      } else if (htmlData?.fragment_ids?.[0]) {
        engagement.onClick(htmlData.fragment_ids[0]);
      }
    };

    shadow.addEventListener('click', handleShadowClick);

    return () => {
      fragmentObserver.disconnect();
      fragmentObserverRef.current = null;
      shadow.removeEventListener('click', handleShadowClick);
      if (htmlData?.fragment_ids) {
        for (const fid of htmlData.fragment_ids) {
          engagement.onHidden(fid);
        }
      }
    };
  }, [htmlData, engagement]);

  // Navigate to origin URL when metadata is clicked
  const handleMetadataClick = (e) => {
    e.stopPropagation();
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    if (deepDiveActive) return;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const cardClasses = [
    'fragment-card',
    'assembled-article-card',
    deepDiveActive && 'deep-dive-active',
    pressing && 'long-press-active',
  ].filter(Boolean).join(' ');

  const deepDiveFragment = {
    fragment_id: fragments?.[0]?.fragment_id || null,
    page_id: page_id,
    archetype: 'article',
    domain: domain,
    url: url,
  };

  // Fallback to screenshot of first fragment if no HTML
  if (!has_html || hasError) {
    const firstFragment = fragments?.[0];
    if (!firstFragment) return null;

    return (
      <div
        className={cardClasses}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div className="fragment-content-pane">
          <div className="fragment-card-content">
            <div className="fragment-image-wrapper">
              <FragmentImage
                fragmentId={firstFragment.fragment_id}
                archetype={firstFragment.archetype}
                domain={domain}
              />
            </div>
            <div className="fragment-metadata" onClick={handleMetadataClick}>
              <div className="fragment-archetype-badge">Article{page_number ? ` · Page ${page_number}` : ''}</div>
              <div className="fragment-domain">{domain}</div>
            </div>
            <div className="fragment-hint" onClick={handleMetadataClick}>
              <span className="hint-icon">↗</span>
              <span className="hint-text">{deepDiveActive ? '' : 'Hold to deep-dive'}</span>
            </div>
          </div>
        </div>
        {deepDiveActive && (
          <DeepDiveTiles fragment={deepDiveFragment} onClose={() => setDeepDiveActive(false)} />
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cardClasses}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="fragment-content-pane">
        <div className="fragment-card-content">
          {isLoading ? (
            <div className="assembled-article-placeholder">
              <div className="assembled-article-skeleton">
                <div className="assembled-article-icon">A</div>
                <div className="assembled-article-label">
                  {fragment_count} section{fragment_count !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          ) : (
            <div className="assembled-article-container">
              <div ref={wrapperRef} className="assembled-article-wrapper">
                <div ref={shadowHostRef} className="assembled-article-shadow-host" />
              </div>
              <div className="feed-scroll-zone feed-scroll-zone-top" />
              <div className="feed-scroll-zone feed-scroll-zone-bottom" />
            </div>
          )}
          {truncated && (
            <div className="article-truncation-hint" onClick={handleMetadataClick}>
              Showing {fragment_count} of {total_fragment_count} sections · View full article ↗
            </div>
          )}
          <div className="fragment-metadata" onClick={handleMetadataClick}>
            <div className="fragment-archetype-badge">Article{page_number ? ` · Page ${page_number}` : ''}</div>
            <div className="fragment-domain">{domain}</div>
          </div>
          <div className="fragment-hint" onClick={handleMetadataClick}>
            <span className="hint-icon">↗</span>
            <span className="hint-text">{deepDiveActive ? '' : 'Hold to deep-dive'}</span>
          </div>
        </div>
      </div>
      {deepDiveActive && (
        <DeepDiveTiles fragment={deepDiveFragment} onClose={() => setDeepDiveActive(false)} />
      )}
    </div>
  );
};

export default AssembledArticle;
