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

    // Base reset styles for readability inside Shadow DOM
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

      .article-embed-content {
        padding: 20px 24px;
        max-width: 100%;
        overflow: hidden;
        background: #fff;
        word-wrap: break-word;
        overflow-wrap: break-word;
      }

      /* Ensure images are responsive and centered */
      img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
      }

      /* Readable link styles */
      a {
        color: #0066cc;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }

      /* Code blocks */
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
      code {
        padding: 2px 4px;
        background: #f0f0f0;
        border-radius: 3px;
      }
      pre code {
        padding: 0;
        background: none;
      }

      /* Table styling */
      table {
        border-collapse: collapse;
        max-width: 100%;
        overflow-x: auto;
        display: block;
      }
      th, td {
        padding: 8px 12px;
        border: 1px solid #ddd;
        text-align: left;
      }
      th {
        background: #f5f5f5;
        font-weight: 600;
      }

      /* Lists */
      ul, ol {
        padding-left: 24px;
      }
      li {
        margin-bottom: 4px;
      }

      /* Headings */
      h1, h2, h3, h4, h5, h6 {
        margin-top: 1.2em;
        margin-bottom: 0.5em;
        line-height: 1.3;
        color: #111;
      }
      h1 { font-size: 1.8em; }
      h2 { font-size: 1.5em; }
      h3 { font-size: 1.25em; }

      /* Paragraphs */
      p {
        margin: 0.8em 0;
      }

      /* Blockquotes */
      blockquote {
        margin: 1em 0;
        padding: 0.5em 1em;
        border-left: 4px solid #ddd;
        color: #666;
        background: #fafafa;
      }

      /* Figures and captions */
      figure {
        margin: 1em auto;
        max-width: 100%;
      }
      figcaption {
        font-size: 0.85em;
        color: #666;
        margin-top: 0.5em;
      }

      /* Hide common non-content elements */
      nav, .ad, .advertisement, .sidebar, .related-articles,
      [role="navigation"], [role="banner"], [aria-hidden="true"] {
        display: none !important;
      }
    `;

    // Original page styles (from <style> blocks)
    const pageCSS = (htmlData.styles || []).join('\n');

    // Sanitize HTML with DOMPurify (defense-in-depth)
    const cleanHtml = DOMPurify.sanitize(htmlData.html, {
      ADD_TAGS: ['style'],
      ADD_ATTR: ['target', 'rel'],
      ALLOW_DATA_ATTR: true,
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
    });

    // Build external stylesheet links
    const stylesheetLinks = (htmlData.stylesheet_urls || [])
      .map(url => `<link rel="stylesheet" href="${DOMPurify.sanitize(url)}" crossorigin="anonymous">`)
      .join('\n');

    // Assemble and inject into Shadow DOM
    shadow.innerHTML = `
      <style>${resetCSS}</style>
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
        <div className="article-embed-wrapper">
          <div ref={shadowHostRef} className="article-shadow-host" />
        </div>
      )}
    </div>
  );
};

export default ArticleEmbed;
