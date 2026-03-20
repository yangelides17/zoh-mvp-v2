/**
 * ArticleEmbed Component
 *
 * Renders interactive HTML fragments inside a Shadow DOM container.
 * Parallel to VideoEmbed.jsx but for article/text content archetypes.
 * Uses Shadow DOM for complete CSS isolation from the feed's dark theme.
 *
 * Features:
 * - Lazy loading via IntersectionObserver
 * - DOMPurify sanitization (defense-in-depth)
 * - Shadow DOM style isolation
 * - Link interception (opens in new tab)
 * - Scrollable content for long articles
 * - Graceful fallback to screenshot on error
 */

import React, { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { fetchFragmentHtml } from '../../services/api';
import FragmentImage from './FragmentImage';
import './ArticleEmbed.css';

// Archetypes that render via shadow DOM + cleaned HTML
const HTML_EMBED_ARCHETYPES = new Set([
  'article', 'article_media', 'page_content', 'page_media',
  'code_block', 'comment', 'feed_item', 'product_card'
]);

/**
 * Check if an archetype should render via shadow DOM + cleaned HTML
 */
export const isHtmlEmbedArchetype = (archetype) => HTML_EMBED_ARCHETYPES.has(archetype);

const ArticleEmbed = ({ fragmentId, archetype, domain, url, hasHtml, bbox }) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [htmlData, setHtmlData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef(null);
  const shadowHostRef = useRef(null);
  const shadowRootRef = useRef(null);

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

  // Fetch HTML when shouldLoad becomes true
  useEffect(() => {
    if (!shouldLoad || !hasHtml) return;

    let cancelled = false;

    const loadHtml = async () => {
      try {
        const data = await fetchFragmentHtml(fragmentId);
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
  }, [shouldLoad, fragmentId, hasHtml]);

  // Inject HTML into Shadow DOM when data arrives
  useEffect(() => {
    if (!htmlData || !shadowHostRef.current) return;

    // Create shadow root (only once)
    if (!shadowRootRef.current) {
      try {
        shadowRootRef.current = shadowHostRef.current.attachShadow({ mode: 'open' });
      } catch (e) {
        // Shadow root already attached (React strict mode double-render)
        shadowRootRef.current = shadowHostRef.current.shadowRoot;
      }
    }

    const shadow = shadowRootRef.current;
    if (!shadow) return;

    // Minimal reset — let page CSS handle layout, only set safety constraints.
    const resetCSS = `
      :host {
        display: block;
      }
      *, *::before, *::after { box-sizing: border-box; }

      .article-embed-content {
        overflow-x: hidden;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }

      img { max-width: 100%; height: auto; }
      svg:not([width]) { max-height: 1em; width: auto; }
      pre, code { overflow-x: auto; max-width: 100%; }
      table { max-width: 100%; overflow-x: auto; }

      nav, .ad, .advertisement, .sidebar, .related-articles,
      [role="navigation"], [role="banner"], [aria-hidden="true"] {
        display: none !important;
      }
    `;

    // Fallback styles — only used when page has no captured CSS.
    // When page CSS exists, fallback values (light-theme colors, font stacks)
    // would fight with the page's theme via CSS inheritance.
    const hasPageCSS = (htmlData.styles || []).length > 0 || (htmlData.stylesheet_urls || []).length > 0;
    const fallbackCSS = hasPageCSS ? '' : `
      :where(.article-embed-content) {
        background: #fff;
        color: #333;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        font-size: 16px;
      }
      :where(a) { color: #0066cc; text-decoration: none; }
      :where(a:hover) { text-decoration: underline; }
      :where(pre) { padding: 12px 16px; background: #f5f5f5; border-radius: 6px; line-height: 1.4; }
      :where(code) { padding: 2px 4px; background: #f0f0f0; border-radius: 3px; font-size: 0.9em; }
      :where(pre code) { padding: 0; background: none; }
      :where(th, td) { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }
      :where(th) { background: #f5f5f5; font-weight: 600; }
      :where(h1, h2, h3, h4, h5, h6) { margin-top: 1.2em; margin-bottom: 0.5em; line-height: 1.3; }
      :where(p) { margin: 0.8em 0; }
      :where(blockquote) { margin: 1em 0; padding: 0.5em 1em; border-left: 4px solid #ddd; color: #666; }
    `;

    // Original page styles — rewrite CSS selectors for Shadow DOM compatibility:
    // :root → :host: CSS custom properties defined on :root must target :host.
    // html → :host: Rules targeting <html> (backgrounds, fonts, variables) must target :host.
    // body → zoh-body: Server emits <zoh-body> instead of <body> (DOMPurify strips <body>).
    // URL rewriting (fonts, images) is done server-side in fragment_html_service.
    const pageCSS = (htmlData.styles || [])
      .join('\n')
      .replace(/:root/g, ':host')
      .replace(/(?<![.\w\-"'/])html(?=[\s,{.#:\[>+~])/g, ':host')
      .replace(/(?<![.\w\-"'/])body(?=[\s,{.#:\[>+~])/g, 'zoh-body');

    // Sanitize HTML with DOMPurify (defense-in-depth)
    const cleanHtml = DOMPurify.sanitize(htmlData.html, {
      ADD_TAGS: ['style', 'zoh-body'],
      ADD_ATTR: ['target', 'rel'],
      ALLOW_DATA_ATTR: true,
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    });

    // Build external stylesheet links
    const stylesheetLinks = (htmlData.stylesheet_urls || [])
      .map(url => `<link rel="stylesheet" href="${DOMPurify.sanitize(url)}" crossorigin="anonymous">`)
      .join('\n');

    // Assemble and inject into Shadow DOM.
    // Order: reset (safety) → fallback (zero-specificity defaults) → page CSS (original styles win).
    // Wrap in <body> so CSS selectors targeting `body`, `body p`, etc. still match.
    shadow.innerHTML = `
      <style>${resetCSS}</style>
      <style>${fallbackCSS}</style>
      <style>${pageCSS}</style>
      ${stylesheetLinks}
      <div class="article-embed-content">
        ${cleanHtml}
      </div>
    `;

    // Intercept link clicks: open in new tab, prevent card navigation
    shadow.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      // Skip anchor-only links
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

  // If no HTML available or error, fall back to screenshot
  if (!hasHtml || hasError) {
    return (
      <div className="fragment-image-wrapper">
        <FragmentImage
          fragmentId={fragmentId}
          archetype={archetype}
          domain={domain}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="article-embed-container" style={bbox?.width ? { maxWidth: `${bbox.width}px` } : undefined}>
      {isLoading ? (
        <div className="article-embed-placeholder">
          <div className="article-loading-skeleton">
            <div className="article-icon">A</div>
            <div className="article-badge">{archetype?.replace(/_/g, ' ')}</div>
          </div>
        </div>
      ) : (
        <>
          <div className="article-embed-wrapper">
            <div ref={shadowHostRef} className="article-shadow-host" />
          </div>
          <div className="feed-scroll-zone feed-scroll-zone-top" />
          <div className="feed-scroll-zone feed-scroll-zone-bottom" />
        </>
      )}
    </div>
  );
};

export default ArticleEmbed;
